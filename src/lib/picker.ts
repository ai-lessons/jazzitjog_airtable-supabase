// src/lib/picker.ts
export type AnyRow = Record<string, any>;

const notEmpty = (v: any) =>
  v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "");

const norm = (s: string) => s.toLowerCase().replace(/[\s_-]/g, "");

function tryGetByNormalizedKey(obj: any, key: string) {
  if (!obj || typeof obj !== "object") return undefined;
  const nk = norm(key);
  for (const k of Object.keys(obj)) {
    if (norm(k) === nk && notEmpty(obj[k])) return obj[k];
  }
  return undefined;
}

function coerceValue(v: any) {
  if (Array.isArray(v)) {
    // Airtable иногда возвращает массивы — склеим простые значения
    const flat = v
      .map((x) => (x === null || x === undefined ? "" : typeof x === "object" ? JSON.stringify(x) : String(x)))
      .filter((s) => s !== "");
    return flat.length ? flat.join(" ") : undefined;
  }
  return v;
}

/** Возвращает значение ключа из row или row.fields (без учета регистра/пробелов/подчёркиваний) */
export function getField(row: AnyRow, key: string) {
  if (!row) return undefined;

  // 1) Прямое совпадение (быстро)
  if (key in row && notEmpty(row[key])) return coerceValue(row[key]);

  // 2) Нормализованное совпадение среди ключей row
  const v1 = tryGetByNormalizedKey(row, key);
  if (notEmpty(v1)) return coerceValue(v1);

  // 3) Поиск в row.fields
  const fields = (row as any).fields;
  if (fields && typeof fields === "object") {
    if (key in fields && notEmpty(fields[key])) return coerceValue(fields[key]);
    const v2 = tryGetByNormalizedKey(fields, key);
    if (notEmpty(v2)) return coerceValue(v2);
  }

  return undefined;
}

/** Берёт первое непустое значение по списку кандидатов, ищет в row и row.fields */
export function pickFirst(row: AnyRow, candidates: string[], fallback: any = null) {
  for (const k of candidates) {
    const v = getField(row, k);
    if (notEmpty(v)) return v;
  }
  return fallback;
}
