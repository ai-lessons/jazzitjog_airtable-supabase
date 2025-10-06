// Brand/Model mapping and normalization

export const MODEL_TO_BRAND: Record<string, string> = {
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

export const BRAND_ALIASES: Record<string, string> = {
  'ASICS': 'Asics',
  'HOKA': 'Hoka',
  'PUMA': 'Puma',
  'On Running': 'On',
  'THE NORTH FACE': 'The North Face',
  'NIKE': 'Nike',
  'ADIDAS': 'Adidas'
};

export function normalizeBrand(brand: string): string {
  const cleaned = brand.trim();
  return BRAND_ALIASES[cleaned] || cleaned;
}
