"use strict";
// Core validation functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidUsdPrice = isValidUsdPrice;
exports.isValidHeight = isValidHeight;
exports.isValidWeight = isValidWeight;
exports.isValidDrop = isValidDrop;
function isValidUsdPrice(p) {
    const n = Number(p);
    return Number.isFinite(n) && n >= 40 && n <= 500;
}
function isValidHeight(h) {
    const n = Number(h);
    return Number.isFinite(n) && n >= 10 && n <= 60;
}
function isValidWeight(w) {
    const n = Number(w);
    return Number.isFinite(n) && n >= 100 && n <= 600;
}
function isValidDrop(d) {
    const n = Number(d);
    return Number.isFinite(n) && n >= 0 && n <= 20;
}
//# sourceMappingURL=validation.js.map