"use strict";
// Brand/Model mapping and normalization
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRAND_ALIASES = exports.MODEL_TO_BRAND = void 0;
exports.normalizeBrand = normalizeBrand;
exports.MODEL_TO_BRAND = {
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
exports.BRAND_ALIASES = {
    'ASICS': 'Asics',
    'HOKA': 'Hoka',
    'PUMA': 'Puma',
    'On Running': 'On',
    'THE NORTH FACE': 'The North Face',
    'NIKE': 'Nike',
    'ADIDAS': 'Adidas'
};
function normalizeBrand(brand) {
    const cleaned = brand.trim();
    return exports.BRAND_ALIASES[cleaned] || cleaned;
}
//# sourceMappingURL=mapping.js.map