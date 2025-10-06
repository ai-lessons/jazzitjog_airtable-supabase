// Core validation functions

export function isValidUsdPrice(p: any): boolean {
  const n = Number(p);
  return Number.isFinite(n) && n >= 40 && n <= 500;
}

export function isValidHeight(h: any): boolean {
  const n = Number(h);
  return Number.isFinite(n) && n >= 10 && n <= 60;
}

export function isValidWeight(w: any): boolean {
  const n = Number(w);
  return Number.isFinite(n) && n >= 100 && n <= 600;
}

export function isValidDrop(d: any): boolean {
  const n = Number(d);
  return Number.isFinite(n) && n >= 0 && n <= 20;
}
