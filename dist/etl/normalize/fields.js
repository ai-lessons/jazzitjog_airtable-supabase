"use strict";
// Field normalization functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBrandName = normalizeBrandName;
exports.normalizeModelName = normalizeModelName;
exports.normalizeHeight = normalizeHeight;
exports.normalizeDrop = normalizeDrop;
exports.normalizeWeight = normalizeWeight;
exports.normalizePrice = normalizePrice;
exports.normalizeEnum = normalizeEnum;
exports.normalizeBoolean = normalizeBoolean;
const mapping_1 = require("../../core/mapping");
const utils_1 = require("../../core/utils");
const units_1 = require("../../core/units");
const validation_1 = require("../../core/validation");
/**
 * Normalize brand name
 */
function normalizeBrandName(brand, changes) {
    if (!brand)
        return null;
    const normalized = (0, mapping_1.normalizeBrand)(brand);
    if (normalized !== brand) {
        changes.push({
            field: 'brand_name',
            before: brand,
            after: normalized,
            reason: 'Applied brand normalization',
        });
    }
    return normalized;
}
/**
 * Normalize model name
 */
function normalizeModelName(model, changes) {
    if (!model)
        return null;
    const cleaned = (0, utils_1.normStr)(model);
    if (!cleaned)
        return null;
    // Remove common noise words
    let normalized = cleaned
        .replace(/\b(shoe|sneaker|running)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (normalized !== model) {
        changes.push({
            field: 'model',
            before: model,
            after: normalized,
            reason: 'Removed noise words',
        });
    }
    return normalized;
}
/**
 * Normalize height (heel/forefoot)
 */
function normalizeHeight(height, fieldName, changes, warnings) {
    if (height === null)
        return null;
    const num = (0, utils_1.toNum)(height);
    if (num === null) {
        warnings.push(`Invalid ${fieldName}: ${height}`);
        return null;
    }
    // Validate range
    if (!(0, validation_1.isValidHeight)(num)) {
        warnings.push(`${fieldName} out of range (10-60mm): ${num}mm`);
        return null;
    }
    const rounded = (0, utils_1.round2)(num);
    if (rounded !== height) {
        changes.push({
            field: fieldName,
            before: height,
            after: rounded,
            reason: 'Rounded to 2 decimals',
        });
    }
    return rounded;
}
/**
 * Normalize drop
 */
function normalizeDrop(drop, heelHeight, foreFootHeight, changes, warnings) {
    // If drop is provided, validate it
    if (drop !== null) {
        const num = (0, utils_1.toNum)(drop);
        if (num === null) {
            warnings.push(`Invalid drop: ${drop}`);
            return null;
        }
        if (!(0, validation_1.isValidDrop)(num)) {
            warnings.push(`Drop out of range (0-15mm): ${num}mm`);
            return null;
        }
        return (0, utils_1.round2)(num);
    }
    // Try to calculate from heel and forefoot
    if (heelHeight !== null && foreFootHeight !== null) {
        const calculated = (0, utils_1.round2)(heelHeight - foreFootHeight);
        changes.push({
            field: 'drop',
            before: null,
            after: calculated,
            reason: 'Calculated from heel - forefoot',
        });
        return calculated;
    }
    return null;
}
/**
 * Normalize weight
 */
function normalizeWeight(weight, changes, warnings) {
    if (weight === null)
        return null;
    let num = (0, utils_1.toNum)(weight);
    if (num === null) {
        warnings.push(`Invalid weight: ${weight}`);
        return null;
    }
    // Detect if weight is in oz (< 20) and convert to grams
    if (num < 20) {
        const grams = (0, units_1.ozToGrams)(num);
        changes.push({
            field: 'weight',
            before: num,
            after: grams,
            reason: 'Converted from oz to grams',
        });
        num = grams;
    }
    // Validate range
    if (!(0, validation_1.isValidWeight)(num)) {
        warnings.push(`Weight out of range (150-400g): ${num}g`);
        return null;
    }
    return (0, utils_1.round2)(num);
}
/**
 * Normalize price
 */
function normalizePrice(price, currency, changes, warnings) {
    if (price === null)
        return null;
    let num = (0, utils_1.toNum)(price);
    if (num === null) {
        warnings.push(`Invalid price: ${price}`);
        return null;
    }
    // Detect currency and convert to USD if needed
    const detectedCurrency = currency ? currency.toUpperCase() : (0, units_1.detectCurrency)(num.toString());
    if (detectedCurrency && detectedCurrency !== 'USD') {
        const usd = (0, units_1.convertToUSD)(num, detectedCurrency);
        if (usd !== null) {
            changes.push({
                field: 'price',
                before: num,
                after: usd,
                reason: `Converted from ${detectedCurrency} to USD`,
            });
            num = usd;
        }
    }
    // Validate range
    if (!(0, validation_1.isValidUsdPrice)(num)) {
        warnings.push(`Price out of range (40-500 USD): $${num}`);
        return null;
    }
    return (0, utils_1.round2)(num);
}
/**
 * Normalize enum field
 */
function normalizeEnum(value, allowedValues, fieldName, changes, warnings) {
    if (value === null)
        return null;
    const normalized = value.toLowerCase().trim();
    // Check if value is in allowed list
    if (!allowedValues.includes(normalized)) {
        warnings.push(`Invalid ${fieldName}: ${value} (allowed: ${allowedValues.join(', ')})`);
        return null;
    }
    if (normalized !== value) {
        changes.push({
            field: fieldName,
            before: value,
            after: normalized,
            reason: 'Normalized to lowercase',
        });
    }
    return normalized;
}
/**
 * Normalize boolean field
 */
function normalizeBoolean(value, fieldName, changes) {
    if (value === null || value === undefined)
        return null;
    // Ensure it's actually boolean
    if (typeof value !== 'boolean') {
        const boolValue = Boolean(value);
        changes.push({
            field: fieldName,
            before: value,
            after: boolValue,
            reason: 'Converted to boolean',
        });
        return boolValue;
    }
    return value;
}
//# sourceMappingURL=fields.js.map