"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromAirtableToShoeInputs = fromAirtableToShoeInputs;
// src/pipeline/fromAirtableToShoeInputs.ts
const fields_1 = require("../transform/fields");
const extractor = __importStar(require("../llm/extract"));
const regexFallback_1 = require("./regexFallback");
const brandModelFromTitle_1 = require("../transform/brandModelFromTitle");
const relevance_1 = require("../filters/relevance");
const crypto_1 = require("crypto");
// --- 1) извлекатель из ../llm/extract (поддержка разных имён экспорта)
function pickExtractFn(mod) {
    const names = ["extractFromArticle", "extractFromContent", "extractModels", "extract", "runExtraction", "default"];
    for (const n of names) {
        const fn = mod[n];
        if (typeof fn === "function")
            return fn;
    }
    const keys = Object.keys(mod).join(", ");
    throw new Error(`LLM extractor not found in ../llm/extract. Available exports: [${keys}].`);
}
const runExtract = pickExtractFn(extractor);
// --- 2) быстрый словарь модель→бренд (минимум захардкоженных брендов)
const MODEL_TO_BRAND = {
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
function getField(obj, candidates) {
    const fields = (obj?.fields ?? obj);
    if (!fields)
        return undefined;
    const keys = Object.keys(fields);
    for (const cand of candidates) {
        const hit = keys.find(k => k.trim().toLowerCase() === cand.trim().toLowerCase());
        if (hit)
            return fields[hit];
    }
    return undefined;
}
function toPositiveInt(x) {
    const n = Number(String(x ?? "").replace(/[^\d]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
}
function parseDateOrNull(x) {
    const s = String(x ?? "").trim();
    if (!s)
        return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
}
async function callExtractor(content, meta) {
    try {
        return await runExtract({ content, date: meta.date ?? null, source_link: meta.source_link ?? null });
    }
    catch { /* fall back */ }
    return await runExtract(content);
}
function toModelArray(res) {
    if (!res)
        return [];
    if (Array.isArray(res))
        return res;
    if (Array.isArray(res?.items))
        return res.items;
    if (Array.isArray(res?.models))
        return res.models;
    if (res?.model)
        return [res.model];
    return [];
}
function normStr(x) {
    const s = String(x ?? "").trim();
    return s || null;
}
function isValidUsdPrice(p) {
    const n = Number(p);
    return Number.isFinite(n) && n >= 40 && n <= 500;
}
// Нормализация токенов для сравнения модели с заголовком
const alnumLower = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const modelTokens = (s) => alnumLower(s).split(" ").filter(t => t && !/^(the|and|with|for|pro|max|gtx|carbon|plate)$/.test(t));
// Enhanced Title-first detection logic
function isSingleModelTitle(title) {
    const titleBM = (0, brandModelFromTitle_1.brandModelFromTitle)(title);
    // Высокая уверенность в title + явное упоминание модели
    return titleBM.confidence >= 0.85 && !!titleBM.brand && !!titleBM.model;
}
// Generate source_id with priority: article_id > normalized source_link > sha1(content)
function generateSourceId(args) {
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
        const hash = (0, crypto_1.createHash)('sha1').update(content.trim()).digest('hex');
        return `content_${hash}`;
    }
    throw new Error('Cannot generate source_id: no article_id, source_link, or content provided');
}
// Calculate field richness for comparison
function calculateRichness(obj) {
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
            if (typeof value === 'number' && !isNaN(value))
                count += 2;
            else if (typeof value === 'boolean')
                count += 2;
            else if (typeof value === 'string' && value.trim())
                count += 1;
        }
    }
    return count;
}
// Check if new model is richer than existing
function isRicherModel(newModel, existingModel) {
    const newRichness = calculateRichness(newModel);
    const existingRichness = calculateRichness(existingModel);
    return newRichness > existingRichness;
}
// Check if content is about sneakers/running shoes
function isSneakerArticle(title, content) {
    const combined = `${title} ${content}`.toLowerCase();
    // Must contain sneaker/shoe keywords
    const shoeKeywords = /\b(shoe|shoes|sneaker|sneakers|runner|runners|running\s+shoe|footwear|kicks)\b/;
    if (!shoeKeywords.test(combined))
        return false;
    // Common sneaker contexts
    const sneakerContext = /\b(review|test|comparison|guide|best|top|rated|comfortable|cushioning|support|trail|road|marathon|jogging|training|athletic|sports?)\b/;
    if (!sneakerContext.test(combined))
        return false;
    // Exclude obvious non-sneaker content
    const excludePattern = /\b(boot|boots|sandal|sandals|high\s+heel|dress\s+shoe|formal|oxford|loafer|pump|stiletto|cleat|cleats)\b/;
    if (excludePattern.test(combined))
        return false;
    return true;
}
function inferBrandFromContentLoose(content) {
    const map = new Map();
    for (const m of content.matchAll(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/g)) {
        const w = m[1];
        if (/^(With|And|The|This|That|Review|RTR|First|Impressions)$/.test(w))
            continue;
        map.set(w, (map.get(w) ?? 0) + 1);
    }
    let best = null;
    let max = 0;
    for (const [k, v] of map)
        if (v > max) {
            max = v;
            best = k;
        }
    return max > 1 ? best : null;
}
// «странная цена» из вида "180,$199."
function parseWeirdPrice(content) {
    const m = content.match(/(\d{2,3})\s*,\s*\$(\d{2,3})/);
    if (m) {
        const val = Number(m[2]);
        if (isValidUsdPrice(val))
            return val;
    }
    return null;
}
function scoreByTitle(brand, model, tBrand, tModel) {
    let score = 0;
    if (brand && tBrand && alnumLower(brand) === alnumLower(tBrand))
        score += 2;
    if (model && tModel) {
        const a = new Set(modelTokens(model));
        const b = new Set(modelTokens(tModel));
        let overlap = 0;
        for (const x of a)
            if (b.has(x))
                overlap++;
        if (overlap >= 2)
            score += 2;
        else if (overlap === 1)
            score += 1;
    }
    return score;
}
// Enhanced deduplication with model_key + source_id
function deduplicateEnhanced(shoes) {
    const dedupeMap = new Map();
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
        }
        else {
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
function deduplicateWithinArticles(shoes) {
    const articleGroups = new Map();
    // Группируем по article_id
    for (const shoe of shoes) {
        const articleId = shoe.article_id;
        if (!articleGroups.has(articleId)) {
            articleGroups.set(articleId, []);
        }
        articleGroups.get(articleId).push(shoe);
    }
    const result = [];
    // Обрабатываем каждую статью отдельно
    for (const [articleId, articleShoes] of articleGroups) {
        const keyToShoe = new Map();
        for (const shoe of articleShoes) {
            const key = shoe.model_key;
            const existing = keyToShoe.get(key);
            if (!existing) {
                keyToShoe.set(key, shoe);
            }
            else {
                // Объединяем данные только внутри одной статьи
                const merged = { ...existing };
                // Приоритет отдается непустым значениям
                if (!merged.heel_height && shoe.heel_height)
                    merged.heel_height = shoe.heel_height;
                if (!merged.forefoot_height && shoe.forefoot_height)
                    merged.forefoot_height = shoe.forefoot_height;
                if (!merged.drop && shoe.drop)
                    merged.drop = shoe.drop;
                if (!merged.weight && shoe.weight)
                    merged.weight = shoe.weight;
                if (!merged.price && shoe.price)
                    merged.price = shoe.price;
                if (!merged.primary_use && shoe.primary_use)
                    merged.primary_use = shoe.primary_use;
                if (!merged.surface_type && shoe.surface_type)
                    merged.surface_type = shoe.surface_type;
                if (!merged.cushioning_type && shoe.cushioning_type)
                    merged.cushioning_type = shoe.cushioning_type;
                if (!merged.foot_width && shoe.foot_width)
                    merged.foot_width = shoe.foot_width;
                if (!merged.upper_breathability && shoe.upper_breathability)
                    merged.upper_breathability = shoe.upper_breathability;
                if (merged.carbon_plate === null && shoe.carbon_plate !== null)
                    merged.carbon_plate = shoe.carbon_plate;
                if (merged.waterproof === null && shoe.waterproof !== null)
                    merged.waterproof = shoe.waterproof;
                if (!merged.additional_features && shoe.additional_features)
                    merged.additional_features = shoe.additional_features;
                if (!merged.source_link && shoe.source_link)
                    merged.source_link = shoe.source_link;
                keyToShoe.set(key, merged);
            }
        }
        // Добавляем дедуплицированные записи этой статьи к общему результату
        result.push(...Array.from(keyToShoe.values()));
    }
    return result;
}
// --- 5) основной маппер
async function fromAirtableToShoeInputs(records) {
    const out = [];
    for (const rec of records) {
        const article_id = toPositiveInt(getField(rec, ["ID", "Id", "id", "article_id"]));
        if (!article_id)
            continue;
        const record_id = (rec && typeof rec === "object" && typeof rec.id === "string" && rec.id) ||
            normStr(getField(rec, ["record_id", "Record Id", "Record ID", "Airtable Record Id"])) ||
            null;
        const contentRaw = getField(rec, ["Content", "Text", "Article", "content", "text"]);
        const content = String(contentRaw ?? "");
        if (!content.trim())
            continue;
        // Title-first эвристика бренда/модели
        const title = (getField(rec, ["Title", "title"]) ?? "").toString();
        // Only process sneaker articles
        if (!isSneakerArticle(title, content)) {
            continue;
        }
        const titleBM = (0, brandModelFromTitle_1.brandModelFromTitle)(title);
        const titleBrand = titleBM.brand ? titleBM.brand.trim() : null;
        const titleModel = titleBM.model ? (0, fields_1.refineModelName)(titleBrand ?? "", titleBM.model).trim() : null;
        // 1) Дата
        const rawDate = getField(rec, ["Created", "Time created", "Date", "Published", "publish_date", "date"]);
        const date = parseDateOrNull(rawDate);
        // 2) Ссылка
        let source_link = normStr(getField(rec, ["Article link", "URL", "Link", "Source", "source_link", "url"]));
        if (!source_link) {
            const linkObj = getField(rec, ["Summary (Article link)"]);
            if (linkObj) {
                const arr = Array.isArray(linkObj) ? linkObj : [linkObj];
                const firstUrl = arr.map((x) => x?.url || x?.href || x?.link).find(Boolean);
                source_link = normStr(firstUrl);
            }
        }
        // ENHANCED TITLE-FIRST LOGIC
        const isSingleModel = isSingleModelTitle(title);
        let modelsRaw = [];
        try {
            const raw = await callExtractor(content, { date, source_link });
            modelsRaw = toModelArray(raw);
            if (isSingleModel && titleBrand && titleModel) {
                // Single-model mode: extract only the title model's specs from content
                const titleModelKey = (0, fields_1.makeModelKey)(titleBrand, titleModel);
                // Filter content models to only include the title model or similar ones
                const relevantModels = modelsRaw.filter(m => {
                    const modelKey = (0, fields_1.makeModelKey)(m.brand_name || titleBrand, m.model || '');
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
                }
                else {
                    // Fallback to title-only data if no content match
                    modelsRaw = [{
                            brand_name: titleBrand,
                            model: titleModel,
                            __source: 'title-only',
                            __mode: 'single-model'
                        }];
                }
            }
            else {
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
        }
        catch {
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
        if (!modelsRaw.length)
            continue;
        // 4) Фоллбеки из текста
        const heightsFb = (0, regexFallback_1.parseHeights)(content);
        const weightFb = (0, regexFallback_1.parseWeight)(content);
        const priceFb = (0, regexFallback_1.parsePriceToUSD)(content);
        const priceWeird = parseWeirdPrice(content);
        const cands = modelsRaw.map((m) => {
            const modelStr = typeof m === "string" ? m : (m.model ?? m.model_name ?? m.shoe_model ?? "");
            const modelRaw = normStr(modelStr);
            let brand = normStr(m.brand_name ?? m.brand);
            if (!brand) {
                const b1 = modelRaw ? MODEL_TO_BRAND[modelRaw.toLowerCase()] : null; // словарь модель→бренд
                const b2 = titleBrand;
                const b3 = inferBrandFromContentLoose(content);
                brand = b1 ?? b2 ?? b3 ?? null;
            }
            const model = modelRaw ? ((0, fields_1.refineModelName)(brand ?? "", modelRaw) || modelRaw) : null;
            const score = scoreByTitle(brand, model, titleBrand, titleModel);
            return { brand, model, src: m, score };
        });
        // Не режем по score-порогам — оставляем полноту, просто ранжируем
        const bestCands = cands;
        // 6) Обработка всех валидных кандидатов (поддержка множественных моделей)
        function richness(src) {
            const keys = [
                'heel_height', 'forefoot_height', 'drop', 'weight', 'price',
                'primary_use', 'surface_type', 'cushioning_type', 'foot_width',
                'carbon_plate', 'waterproof', 'upper_breathability', 'additional_features'
            ];
            let s = 0;
            for (const k of keys)
                if (src && src[k] != null)
                    s++;
            return s;
        }
        // Фильтруем и сортируем всех кандидатов
        const validCands = bestCands
            .filter(c => c.brand && c.model)
            .sort((a, b) => (b.score - a.score) ||
            (richness(b.src) - richness(a.src)) ||
            (((a.src?.__source === 'title') ? 1 : 0) - ((b.src?.__source === 'title') ? 1 : 0)));
        // In multi-model mode, deduplicate within this article to avoid repeats
        const processedInThisArticle = new Set();
        // Обрабатываем каждого валидного кандидата
        for (const c of validCands) {
            const mk = (0, fields_1.makeModelKey)(c.brand, c.model);
            if (!mk)
                continue;
            // In multi-model mode, check for duplicates within this article
            const currentMode = c.src?.__mode || 'multi-model';
            if (currentMode === 'multi-model' && processedInThisArticle.has(mk)) {
                continue; // Skip duplicate model in same article
            }
            // --- фильтр релевантности (SOFT/HARD)
            const titleHead = [titleBrand, titleModel].filter(Boolean).join(' ');
            const irr = (0, relevance_1.detectIrrelevant)(titleHead, mk, c.model, c.brand || undefined);
            const mode = process.env.PIPELINE_IRRELEVANT_MODE || 'hard';
            if (mode === 'hard' && irr && irr.ok === false) {
                // здесь можно писать лог в shoe_results_rejected, если нужно
                continue;
            }
            const m = c.src ?? {};
            const heel_height = m.heel_height ?? heightsFb.heel ?? null;
            const forefoot_height = m.forefoot_height ?? heightsFb.forefoot ?? null;
            let drop = m.drop ?? heightsFb.drop ?? null;
            if (drop == null && heel_height != null && forefoot_height != null) {
                drop = Math.round((Number(heel_height) - Number(forefoot_height)) * 100) / 100;
            }
            const weight = m.weight ?? weightFb ?? null;
            let price = null;
            const llmUsd = m.price_usd ?? null;
            const llmRaw = m.price ?? null;
            if (isValidUsdPrice(llmUsd))
                price = Math.round(Number(llmUsd) * 100) / 100;
            else if (isValidUsdPrice(llmRaw))
                price = Math.round(Number(llmRaw) * 100) / 100;
            else if (isValidUsdPrice(priceFb.priceUsd))
                price = Math.round(Number(priceFb.priceUsd) * 100) / 100;
            else if (isValidUsdPrice(priceWeird))
                price = Math.round(Number(priceWeird) * 100) / 100;
            const surface_type = m.surface_type ?? null;
            const foot_width = m.foot_width ?? null;
            const cushioning_type = m.cushioning_type ?? null;
            out.push({
                article_id,
                record_id,
                brand_name: c.brand,
                model: c.model,
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
            });
            // Mark this model as processed for this article
            if (currentMode === 'multi-model') {
                processedInThisArticle.add(mk);
            }
        }
    }
    // Apply enhanced deduplication with model_key + source_id
    return deduplicateEnhanced(out);
}
//# sourceMappingURL=fromAirtableToShoeInputs.js.map