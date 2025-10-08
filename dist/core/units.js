"use strict";
// Unit conversion utilities
Object.defineProperty(exports, "__esModule", { value: true });
exports.ozToGrams = ozToGrams;
exports.gramsToOz = gramsToOz;
exports.convertToUSD = convertToUSD;
exports.detectCurrency = detectCurrency;
// Weight conversions
function ozToGrams(oz) {
    return Math.round(oz * 28.35);
}
function gramsToOz(grams) {
    return Math.round((grams / 28.35) * 100) / 100;
}
// Currency conversions (coarse average FX rates)
function convertToUSD(amount, code) {
    switch (code) {
        case "USD": return amount;
        case "EUR": return amount * 1.08;
        case "GBP": return amount * 1.26;
        case "CAD": return amount * 0.74;
        case "AUD": return amount * 0.67;
        case "JPY": return amount * 0.0068;
        case "CHF": return amount * 1.10;
        case "SEK": return amount * 0.095;
        case "NOK": return amount * 0.095;
        case "DKK": return amount * 0.145;
        case "PLN": return amount * 0.25;
        default: return null;
    }
}
function detectCurrency(text) {
    const t = text.toUpperCase();
    if (/\$\s*\d/.test(t) || /\bUSD\b/.test(t))
        return "USD";
    if (/€\s*\d/.test(t) || /\bEUR\b/.test(t))
        return "EUR";
    if (/£\s*\d/.test(t) || /\bGBP\b/.test(t))
        return "GBP";
    if (/\bJPY\b/.test(t) || /¥\s*\d/.test(t))
        return "JPY";
    if (/\bCAD\b/.test(t))
        return "CAD";
    if (/\bAUD\b/.test(t))
        return "AUD";
    if (/\bCHF\b/.test(t))
        return "CHF";
    if (/\bSEK\b/.test(t))
        return "SEK";
    if (/\bNOK\b/.test(t))
        return "NOK";
    if (/\bDKK\b/.test(t))
        return "DKK";
    if (/\bPLN\b/.test(t))
        return "PLN";
    return null;
}
//# sourceMappingURL=units.js.map