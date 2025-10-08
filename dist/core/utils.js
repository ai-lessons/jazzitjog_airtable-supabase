"use strict";
// Core utility functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.normStr = normStr;
exports.toNum = toNum;
exports.toIntOrNull = toIntOrNull;
exports.round2 = round2;
exports.toPositiveInt = toPositiveInt;
function normStr(x) {
    const s = String(x ?? "").trim();
    return s || null;
}
function toNum(x) {
    if (x === null || x === undefined)
        return null;
    const s = String(x).replace(/[^\d.\-]/g, "");
    if (!s || s === "-" || s === ".")
        return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}
function toIntOrNull(x) {
    const n = toNum(x);
    if (n == null)
        return null;
    return Math.round(n);
}
function round2(n) {
    return Math.round(n * 100) / 100;
}
function toPositiveInt(x) {
    const n = Number(String(x ?? "").replace(/[^\d]/g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
}
//# sourceMappingURL=utils.js.map