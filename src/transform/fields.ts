// src/transform/fields.ts (legacy helpers kept for compatibility)

export type ShoeInput = {
  article_id: number;
  // Legacy: record_id (deprecated). Use airtable_id instead.
  record_id: string | null;
  airtable_id: string | null;
  brand_name: string;
  model: string;
  model_key: string;
  upper_breathability: string | null;
  carbon_plate: boolean | null;
  waterproof: boolean | null;
  heel_height: number | null;
  forefoot_height: number | null;
  drop: number | null;
  weight: number | null;
  price: number | null;
  primary_use: string | null;
  cushioning_type: string | null;
  surface_type: string | null;
  foot_width: string | null;
  additional_features: string | null;
  date: string | null;
  source_link: string | null;
};

export type ShoeInputLoose = Partial<ShoeInput> & {
  brand_name?: string;
  model?: string;
  record_id?: string | null;
  airtable_id?: string | null;
  article_id?: number | string | null;
};

export type ShoeRow = ShoeInput;

// --- utils ---

const stripDiacritics = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
const norm = (s: string) => stripDiacritics(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

export function refineModelName(brand: string, model: string): string {
  const b = (brand || '').trim();
  let m = (model || '').trim();

  // Remove parentheses and trailing subtitle after separators
  m = m.replace(/\((?:[^()]*)\)/g, '').replace(/\s*[:\-–—]\s+.*$/, '').trim();

  // Remove duplicated brand name from model
  const bn = norm(b);
  const mn = norm(m);
  if (bn && (mn === bn || mn.startsWith(bn + ' '))) {
    m = m.slice(b.length).trim();
  }

  // Remove noise suffixes
  m = m.replace(/\s+(?:multi\s+)?tester\s*$/i, '').trim();
  m = m.replace(/\s+\d+\s+mile\s*$/i, '').trim();
  m = m.replace(/^running\s+/i, '').trim();
  m = m.replace(/\s+running\s*$/i, '').trim();
  m = m.replace(/\s+review\s*$/i, '').trim();
  m = m.replace(/\s+test\s*$/i, '').trim();

  if (bn === 'decathlon') {
    m = m.replace(/^kiprun\s+/i, '').trim();
  }

  return m.replace(/\s+/g, ' ').trim();
}

export function makeModelKey(brand: string, model: string): string {
  const b = norm(brand || '');
  const m = norm(model || '');
  if (!b || !m) return '';
  // Legacy separator kept for backward compatibility
  return `${b}::${m}`;
}

function toNum(x: any): number | null {
  if (x === null || x === undefined) return null;
  const n = Number(String(x).replace(/[^\d.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function toBoolOrNull(x: any): boolean | null {
  return x === true ? true : x === false ? false : null;
}

function toIsoOrNull(x: any): string | null {
  if (!x) return null;
  const d = new Date(x as any);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function tightenInput(loose: ShoeInputLoose): ShoeInput | null {
  const article_id_raw = loose.article_id;
  const article_id = toNum(article_id_raw);
  const brand = (loose.brand_name || '').toString().trim();
  const model0 = (loose.model || '').toString().trim();
  const model = refineModelName(brand, model0);
  const model_key = loose.model_key && loose.model_key.includes('::') ? loose.model_key : makeModelKey(brand, model);

  // Prefer new airtable_id, fallback to legacy record_id
  const id = (loose.airtable_id || loose.record_id || null) as string | null;

  if (!article_id || !brand || !model || !model_key || !id) {
    return null;
  }

  return {
    article_id,
    record_id: id,
    airtable_id: id,
    brand_name: brand,
    model,
    model_key,
    upper_breathability: (loose.upper_breathability ?? null) as any,
    carbon_plate: toBoolOrNull(loose.carbon_plate),
    waterproof: toBoolOrNull(loose.waterproof),
    heel_height: toNum(loose.heel_height),
    forefoot_height: toNum(loose.forefoot_height),
    drop: toNum(loose.drop),
    weight: toNum(loose.weight),
    price: toNum(loose.price),
    primary_use: (loose.primary_use ?? null) as any,
    cushioning_type: (loose.cushioning_type ?? null) as any,
    surface_type: (loose.surface_type ?? null) as any,
    foot_width: (loose.foot_width ?? null) as any,
    additional_features: (loose.additional_features ?? null) as any,
    date: toIsoOrNull(loose.date),
    source_link: (loose.source_link ?? null) as any,
  };
}

export function normalizeAll(list: ShoeInputLoose[]): ShoeInput[] {
  const out: ShoeInput[] = [];
  for (const r of list) {
    const t = tightenInput(r);
    if (t) out.push(t);
  }
  return out;
}

