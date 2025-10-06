// Core utility functions

export function normStr(x: any): string | null {
  const s = String(x ?? "").trim();
  return s || null;
}

export function toNum(x: any): number | null {
  if (x === null || x === undefined) return null;
  const s = String(x).replace(/[^\d.\-]/g, "");
  if (!s || s === "-" || s === ".") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function toIntOrNull(x: any): number | null {
  const n = toNum(x);
  if (n == null) return null;
  return Math.round(n);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function toPositiveInt(x: any): number | null {
  const n = Number(String(x ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}
