// src/pipeline/fromAirtableToShoeInputs.ts
import { type ShoeInput, makeModelKey, refineModelName } from "../transform/fields";
import * as extractor from "../llm/extract";
import { parseHeights, parseWeight, parsePriceToUSD } from "./regexFallback";
import { brandModelFromTitle } from "../transform/brandModelFromTitle";
import { detectIrrelevant } from "../filters/relevance";
import { createHash } from "crypto";

// --- 1) извлекатель из ../llm/extract (поддержка разных имён экспорта)
function pickExtractFn(mod: Record<string, any>) {
  const names = ["extractFromArticle","extractFromContent","extractModels","extract","runExtraction","default"];
  for (const n of names) {
    const fn = (mod as any)[n];
    if (typeof fn === "function") return fn as (...args: any[]) => Promise<any>;
  }
  const keys = Object.keys(mod).join(", ");
  throw new Error(`LLM extractor not found in ../llm/extract. Available exports: [${keys}].`);
}
const runExtract = pickExtractFn(extractor);

// --- 2) быстрый словарь модель→бренд (минимум захардкоженных брендов)
const MODEL_TO_BRAND: Record<string, string> = {
  "ghost 17": "Brooks",
  "ghost 16": "Brooks",
  "caldera 8": "Brooks",
  "cloudmonster 2": "On",
  "cloudsurfer max": "On",
  "structure 26": "Nike",
  "eliot racer": "Tracksmith",
  "mafate 5": "Hoka",
  "gel-cumulus 27": "Asics",
  "endorphin speed 5": "Saucony",
  "fast-r nitro elite 3": "Puma",
  "kd900x ld+": "Kiprun",
  "x soar mont blanc carbon": "Salomon",
  "aero burst": "Asics",
};

// --- 3) утилиты
function getField(obj: any, candidates: string[]): any {
  const fields = (obj?.fields ?? obj) as Record<string, any>;
  if (!fields) return undefined;
  const keys = Object.keys(fields);
  for (const cand of candidates) {
    const hit = keys.find(k => k.trim().toLowerCase() === cand.trim().toLowerCase());
    if (hit) return (fields as any)[hit];
  }
  return undefined;
}
function toPositiveInt(x: any): number | null {
  const n = Number(String(x ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}
function parseDateOrNull(x: any): string | null {
  const s = String(x ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
async function callExtractor(content: string, meta: { date?: any; source_link?: any }) {
  try {
    return await runExtract({ content, date: meta.date ?? null, source_link: meta.source_link ?? null });
  } catch { /* fall back */ }
  return await runExtract(content);
}
function toModelArray(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.models)) return res.models;
  if (res?.model) return [res.model];
  return [];
}
function normStr(x: any) {
  const s = String(x ?? "").trim();
  return s || null;
}
function isValidUsdPrice(p: any): boolean {
  const n = Number(p);
  return Number.isFinite(n) && n >= 40 && n <= 500;
}

// Нормализация токенов для сравнения модели с заголовком
const alnumLower = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const modelTokens = (s: string) => alnumLower(s).split(" ").filter(t => t && !/^(the|and|with|for|pro|max|gtx|carbon|plate)$/.test(t));

// Enhanced Title-first detection logic
function isSingleModelTitle(title: string): boolean {
  const titleBM = brandModelFromTitle(title);
  // Высокая уверенность в title + явное упоминание модели
  return titleBM.confidence >= 0.85 && !!titleBM.brand && !!titleBM.model;
}

// Generate source_id with priority: article_id > normalized source_link > sha1(content)
function generateSourceId(args: {
  article_id?: number | null;
  source_link?: string | null;
  content?: string;
}): string {
  const { article_id, source_link, content } = args;

  if (article_id) {
    return `article_${article_id}`;
  }

  if (source_link) {
    // Normalize source_link by removing protocol, www, trailing slashes, query params
    const normalized = source_link
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .split('?')[0]
      .split('#')[0];
    return `link_${normalized}`;
  }

  if (content) {
    const hash = createHash('sha1').update(content.trim()).digest('hex');
    return `content_${hash}`;
  }

  throw new Error('Cannot generate source_id: no article_id, source_link, or content provided');
}

// Calculate field richness for comparison
function calculateRichness(obj: any): number {
  const fields = [
    'heel_height', 'forefoot_height', 'drop', 'weight', 'price',
    'primary_use', 'surface_type', 'cushioning_type', 'foot_width',
    'carbon_plate', 'waterproof', 'upper_breathability', 'additional_features'
  ];

  let count = 0;
  for (const field of fields) {
    const value = obj[field];
    if (value !== null && value !== undefined) {
      // Count explicit non-null values as more valuable
      if (typeof value === 'number' && !isNaN(value)) count += 2;
      else if (typeof value === 'boolean') count += 2;
      else if (typeof value === 'string' && value.trim()) count += 1;
    }
  }
  return count;
}

// Check if new model is richer than existing
function isRicherModel(newModel: Partial<ShoeInput>, existingModel: Partial<ShoeInput>): boolean {
  const newRichness = calculateRichness(newModel);
  const existingRichness = calculateRichness(existingModel);
  return newRichness > existingRichness;
}

// Check if content is about sneakers/running shoes
function isSneakerArticle(title: string, content: string): boolean {
  const combined = `${title} ${content}`.toLowerCase();

  // Must contain sneaker/shoe keywords
  const shoeKeywords = /\b(shoe|shoes|sneaker|sneakers|runner|runners|running\s+shoe|footwear|kicks)\b/;
  if (!shoeKeywords.test(combined)) return false;

  // Common sneaker contexts
  const sneakerContext = /\b(review|test|comparison|guide|best|top|rated|comfortable|cushioning|support|trail|road|marathon|jogging|training|athletic|sports?)\b/;
  if (!sneakerContext.test(combined)) return false;

  // Exclude obvious non-sneaker content
  const excludePattern = /\b(boot|boots|sandal|sandals|high\s+heel|dress\s+shoe|formal|oxford|loafer|pump|stiletto|cleat|cleats)\b/;
  if (excludePattern.test(combined)) return false;

  return true;
}

function inferBrandFromContentLoose(content: string): string | null {
  const map = new Map<string, number>();
  for (const m of content.matchAll(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/g)) {
    const w = m[1];
    if (/^(With|And|The|This|That|Review|RTR|First|Impressions)$/.test(w)) continue;
    map.set(w, (map.get(w) ?? 0) + 1);
  }
  let best: string | null = null;
  let max = 0;
  for (const [k, v] of map) if (v > max) { max = v; best = k; }
  return max > 1 ? best : null;
}

// «странная цена» из вида "180,$199."
function parseWeirdPrice(content: string): number | null {
  const m = content.match(/(\d{2,3})\s*,\s*\$(\d{2,3})/);
  if (m) {
    const val = Number(m[2]);
    if (isValidUsdPrice(val)) return val;
  }
  return null;
}

function scoreByTitle(brand: string | null, model: string | null, tBrand: string | null, tModel: string | null): number {
  let score = 0;
  if (brand && tBrand && alnumLower(brand) === alnumLower(tBrand)) score += 2;
  if (model && tModel) {
    const a = new Set(modelTokens(model));
    const b = new Set(modelTokens(tModel));
    let overlap = 0;
    for (const x of a) if (b.has(x)) overlap++;
    if (overlap >= 2) score += 2;
    else if (overlap === 1) score += 1;
  }
  return score;
}

// Enhanced deduplication with model_key + source_id
function deduplicateEnhanced(shoes: ShoeInput[]): ShoeInput[] {
  const dedupeMap = new Map<string, ShoeInput>();

  for (const shoe of shoes) {
    // Generate source_id for this shoe
    const source_id = generateSourceId({
      article_id: shoe.article_id,
      source_link: shoe.source_link,
      content: undefined // We don't have access to content here, but article_id/source_link should be sufficient
    });

    // Create composite key: model_key + source_id
    const compositeKey = `${shoe.model_key}::${source_id}`;
    const existing = dedupeMap.get(compositeKey);

    if (!existing) {
      // New entry - add it
      dedupeMap.set(compositeKey, shoe);
    } else {
      // Duplicate found - decide whether to update
      if (isRicherModel(shoe, existing)) {
        // New model is richer - replace
        dedupeMap.set(compositeKey, shoe);
      }
      // Otherwise keep existing (it's richer or same)
    }
  }

  return Array.from(dedupeMap.values());
}

// Функция для дедупликации записей внутри одной статьи (legacy - for backward compatibility)
function deduplicateWithinArticles(shoes: ShoeInput[]): ShoeInput[] {
  const articleGroups = new Map<number, ShoeInput[]>();

  // Группируем по article_id
  for (const shoe of shoes) {
    const articleId = shoe.article_id;
    if (!articleGroups.has(articleId)) {
      articleGroups.set(articleId, []);
    }
    articleGroups.get(articleId)!.push(shoe);
  }

  const result: ShoeInput[] = [];

  // Обрабатываем каждую статью отдельно
  for (const [articleId, articleShoes] of articleGroups) {
    const keyToShoe = new Map<string, ShoeInput>();

    for (const shoe of articleShoes) {
      const key = shoe.model_key;
      const existing = keyToShoe.get(key);

      if (!existing) {
        keyToShoe.set(key, shoe);
      } else {
        // Объединяем данные только внутри одной статьи
        const merged: ShoeInput = { ...existing };

        // Приоритет отдается непустым значениям
        if (!merged.heel_height && shoe.heel_height) merged.heel_height = shoe.heel_height;
        if (!merged.forefoot_height && shoe.forefoot_height) merged.forefoot_height = shoe.forefoot_height;
        if (!merged.drop && shoe.drop) merged.drop = shoe.drop;
        if (!merged.weight && shoe.weight) merged.weight = shoe.weight;
        if (!merged.price && shoe.price) merged.price = shoe.price;
        if (!merged.primary_use && shoe.primary_use) merged.primary_use = shoe.primary_use;
        if (!merged.surface_type && shoe.surface_type) merged.surface_type = shoe.surface_type;
        if (!merged.cushioning_type && shoe.cushioning_type) merged.cushioning_type = shoe.cushioning_type;
        if (!merged.foot_width && shoe.foot_width) merged.foot_width = shoe.foot_width;
        if (!merged.upper_breathability && shoe.upper_breathability) merged.upper_breathability = shoe.upper_breathability;
        if (merged.carbon_plate === null && shoe.carbon_plate !== null) merged.carbon_plate = shoe.carbon_plate;
        if (merged.waterproof === null && shoe.waterproof !== null) merged.waterproof = shoe.waterproof;
        if (!merged.additional_features && shoe.additional_features) merged.additional_features = shoe.additional_features;
        if (!merged.source_link && shoe.source_link) merged.source_link = shoe.source_link;

        keyToShoe.set(key, merged);
      }
    }

    // Добавляем дедуплицированные записи этой статьи к общему результату
    result.push(...Array.from(keyToShoe.values()));
  }

  return result;
}

// --- 5) основной маппер
export async function fromAirtableToShoeInputs(records: any[]): Promise<ShoeInput[]> {
  const out: ShoeInput[] = [];

  for (const rec of records) {
    const article_id = toPositiveInt(getField(rec, ["ID","Id","id","article_id"]));
    if (!article_id) continue;

    const airtable_id: string | null =
      (rec && typeof rec === "object" && typeof rec.id === "string" && rec.id) ||
      normStr(getField(rec, ["airtable_id","Record Id","Record ID","Airtable Record Id"])) ||
      null;

    const contentRaw = getField(rec, ["Content","Text","Article","content","text"]);
    const content = String(contentRaw ?? "");
    if (!content.trim()) continue;

    // Title-first эвристика бренда/модели
    const title = (getField(rec, ["Title","title"]) ?? "").toString();

    // Only process sneaker articles
    if (!isSneakerArticle(title, content)) {
      continue;
    }
    const titleBM = brandModelFromTitle(title);
    const titleBrand = titleBM.brand ? titleBM.brand.trim() : null;
    const titleModel = titleBM.model ? refineModelName(titleBrand ?? "", titleBM.model).trim() : null;

    // 1) Дата
    const rawDate = getField(rec, ["Created","Time created","Date","Published","publish_date","date"]);
    const date = parseDateOrNull(rawDate);

    // 2) Ссылка
    let source_link = normStr(getField(rec, ["Article link","URL","Link","Source","source_link","url"]));
    if (!source_link) {
      const linkObj = getField(rec, ["Summary (Article link)"]);
      if (linkObj) {
        const arr = Array.isArray(linkObj) ? linkObj : [linkObj];
        const firstUrl = arr.map((x: any) => x?.url || x?.href || x?.link).find(Boolean);
        source_link = normStr(firstUrl);
      }
    }

    // ENHANCED TITLE-FIRST LOGIC
    const isSingleModel = isSingleModelTitle(title);
    let modelsRaw: any[] = [];

    try {
      const raw = await callExtractor(content, { date, source_link });
      modelsRaw = toModelArray(raw);

      if (isSingleModel && titleBrand && titleModel) {
        // Single-model mode: extract only the title model's specs from content
        const titleModelKey = makeModelKey(titleBrand, titleModel);

        // Filter content models to only include the title model or similar ones
        const relevantModels = modelsRaw.filter(m => {
          const modelKey = makeModelKey(m.brand_name || titleBrand, m.model || '');
          return modelKey === titleModelKey ||
                 (m.brand_name === titleBrand && m.model === titleModel);
        });

        if (relevantModels.length > 0) {
          // Use the most complete model data for the title model
          const bestModel = relevantModels.reduce((best, current) => {
            return calculateRichness(current) > calculateRichness(best) ? current : best;
          });

          modelsRaw = [{
            ...bestModel,
            brand_name: titleBrand,
            model: titleModel,
            __source: 'title-single',
            __mode: 'single-model'
          }];
        } else {
          // Fallback to title-only data if no content match
          modelsRaw = [{
            brand_name: titleBrand,
            model: titleModel,
            __source: 'title-only',
            __mode: 'single-model'
          }];
        }
      } else {
        // Multi-model mode: extract all different models from content
        // Add title model as a candidate if it has good confidence
        if (titleBrand && titleModel && titleBM.confidence >= 0.8) {
          modelsRaw.push({
            brand_name: titleBrand,
            model: titleModel,
            __source: 'title',
            __mode: 'multi-model'
          });
        }
      }
    } catch {
      // Fallback on extraction error
      if (titleBrand && titleModel && titleBM.confidence >= 0.8) {
        modelsRaw = [{
          brand_name: titleBrand,
          model: titleModel,
          __source: 'title-fallback',
          __mode: isSingleModel ? 'single-model' : 'multi-model'
        }];
      }
    }

    if (!modelsRaw.length) continue;

    // 4) Фоллбеки из текста
    const heightsFb = parseHeights(content);
    const weightFb  = parseWeight(content);
    const priceFb   = parsePriceToUSD(content);
    const priceWeird = parseWeirdPrice(content);

    // 5) Кандидаты
    type Cand = { brand: string | null; model: string | null; src: any; score: number };
    const cands: Cand[] = modelsRaw.map((m: any) => {
      const modelStr = typeof m === "string" ? m : (m.model ?? m.model_name ?? m.shoe_model ?? "");
      const modelRaw = normStr(modelStr);

      let brand = normStr((m as any).brand_name ?? (m as any).brand);
      if (!brand) {
        const b1 = modelRaw ? MODEL_TO_BRAND[modelRaw.toLowerCase()] : null; // словарь модель→бренд
        const b2 = titleBrand;
        const b3 = inferBrandFromContentLoose(content);
        brand = b1 ?? b2 ?? b3 ?? null;
      }

      const model = modelRaw ? (refineModelName(brand ?? "", modelRaw) || modelRaw) : null;
      const score = scoreByTitle(brand, model, titleBrand, titleModel);
      return { brand, model, src: m, score };
    });

    // Не режем по score-порогам — оставляем полноту, просто ранжируем
    const bestCands = cands;

    // 6) Обработка всех валидных кандидатов (поддержка множественных моделей)
    function richness(src: any): number {
      const keys = [
        'heel_height','forefoot_height','drop','weight','price',
        'primary_use','surface_type','cushioning_type','foot_width',
        'carbon_plate','waterproof','upper_breathability','additional_features'
      ];
      let s = 0; for (const k of keys) if (src && src[k] != null) s++;
      return s;
    }

    // Фильтруем и сортируем всех кандидатов
    const validCands = bestCands
      .filter(c => c.brand && c.model)
      .sort((a,b) =>
        (b.score - a.score) ||
        (richness(b.src) - richness(a.src)) ||
        (((a.src?.__source === 'title') ? 1 : 0) - ((b.src?.__source === 'title') ? 1 : 0))
      );

    // In multi-model mode, deduplicate within this article to avoid repeats
    const processedInThisArticle = new Set<string>();

    // Обрабатываем каждого валидного кандидата
    for (const c of validCands) {
      const mk = makeModelKey(c.brand!, c.model!);
      if (!mk) continue;

      // In multi-model mode, check for duplicates within this article
      const currentMode = c.src?.__mode || 'multi-model';
      if (currentMode === 'multi-model' && processedInThisArticle.has(mk)) {
        continue; // Skip duplicate model in same article
      }

      // --- фильтр релевантности (SOFT/HARD)
      const titleHead = [titleBrand, titleModel].filter(Boolean).join(' ');
      const irr = detectIrrelevant(titleHead, mk, c.model!, c.brand || undefined);
      const mode = (process.env.PIPELINE_IRRELEVANT_MODE as 'soft' | 'hard') || 'hard';
      if (mode === 'hard' && irr && (irr as any).ok === false) {
        // здесь можно писать лог в shoe_results_rejected, если нужно
        continue;
      }

      const m: any = c.src ?? {};

      const heel_height     = m.heel_height ?? heightsFb.heel ?? null;
      const forefoot_height = m.forefoot_height ?? heightsFb.forefoot ?? null;
      let drop              = m.drop ?? heightsFb.drop ?? null;
      if (drop == null && heel_height != null && forefoot_height != null) {
        drop = Math.round((Number(heel_height) - Number(forefoot_height)) * 100) / 100;
      }

      const weight = m.weight ?? weightFb ?? null;

      let price: number | null = null;
      const llmUsd = m.price_usd ?? null;
      const llmRaw = m.price ?? null;
      if (isValidUsdPrice(llmUsd)) price = Math.round(Number(llmUsd) * 100) / 100;
      else if (isValidUsdPrice(llmRaw)) price = Math.round(Number(llmRaw) * 100) / 100;
      else if (isValidUsdPrice(priceFb.priceUsd)) price = Math.round(Number(priceFb.priceUsd) * 100) / 100;
      else if (isValidUsdPrice(priceWeird)) price = Math.round(Number(priceWeird) * 100) / 100;

      const surface_type    = m.surface_type ?? null;
      const foot_width      = m.foot_width ?? null;
      const cushioning_type = m.cushioning_type ?? null;

      out.push({
        article_id,
        airtable_id,
        brand_name: c.brand!,
        model: c.model!,
        model_key: mk,
        upper_breathability: m.upper_breathability ?? null,
        carbon_plate: m.carbon_plate ?? null,
        waterproof: m.waterproof ?? null,
        heel_height,
        forefoot_height,
        drop,
        weight,
        price,
        primary_use: m.primary_use ?? null,
        cushioning_type,
        surface_type,
        foot_width,
        additional_features: m.additional_features ?? null,
        date,
        source_link,
      } as ShoeInput);

      // Mark this model as processed for this article
      if (currentMode === 'multi-model') {
        processedInThisArticle.add(mk);
      }
    }
  }

  // Apply enhanced deduplication with model_key + source_id
  return deduplicateEnhanced(out);
}

