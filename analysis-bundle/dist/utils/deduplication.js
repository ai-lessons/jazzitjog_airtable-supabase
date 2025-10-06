"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSourceId = generateSourceId;
exports.generateModelKey = generateModelKey;
exports.mergeShoeResults = mergeShoeResults;
exports.isPayloadRicher = isPayloadRicher;
exports.deduplicateInDocument = deduplicateInDocument;
// src/utils/deduplication.ts
const crypto_1 = require("crypto");
/**
 * Generate source_id for deduplication:
 * 1. Use article_id if available
 * 2. Else use normalized source_link
 * 3. Else use sha1(Content)
 */
function generateSourceId(articleId, sourceLink, content) {
    if (articleId && articleId.trim()) {
        return articleId.trim();
    }
    if (sourceLink && sourceLink.trim()) {
        // Normalize URL by removing protocol, www, trailing slashes
        const normalized = sourceLink
            .trim()
            .replace(/^https?:\/\//i, '')
            .replace(/^www\./i, '')
            .replace(/\/+$/, '');
        return normalized;
    }
    if (content && content.trim()) {
        return (0, crypto_1.createHash)('sha1').update(content.trim()).digest('hex');
    }
    throw new Error('Cannot generate source_id: all inputs are empty');
}
/**
 * Generate model_key for deduplication: lower(brand_name)::lower(model)
 */
function generateModelKey(brandName, model) {
    const normalizedBrand = brandName.toLowerCase().trim();
    const normalizedModel = model.toLowerCase().trim();
    return `${normalizedBrand}::${normalizedModel}`;
}
/**
 * Merge two ShoeResult objects, preferring richer (non-null) values.
 * For weight: prefer grams over oz conversion approximations.
 * For drop: prefer explicit values over computed ones.
 */
function mergeShoeResults(existing, incoming) {
    const merged = { ...existing };
    // Helper to determine if a value is "richer" than another
    const isRicher = (newVal, oldVal) => {
        if (oldVal === null || oldVal === undefined)
            return newVal !== null && newVal !== undefined;
        if (newVal === null || newVal === undefined)
            return false;
        // For strings, prefer non-empty
        if (typeof newVal === 'string' && typeof oldVal === 'string') {
            return newVal.trim().length > oldVal.trim().length;
        }
        return true; // For numbers/booleans, prefer any non-null value
    };
    // Merge each field, preferring richer values
    Object.keys(incoming).forEach(key => {
        const incomingVal = incoming[key];
        const existingVal = merged[key];
        // Special handling for certain fields
        if (key === 'weight') {
            // Prefer values that are likely in grams (> 50) over oz conversions
            if (incomingVal && existingVal) {
                if (incomingVal > 50 && existingVal <= 50) {
                    merged[key] = incomingVal;
                }
                else if (existingVal > 50 && incomingVal <= 50) {
                    // Keep existing
                }
                else if (isRicher(incomingVal, existingVal)) {
                    merged[key] = incomingVal;
                }
            }
            else if (isRicher(incomingVal, existingVal)) {
                merged[key] = incomingVal;
            }
        }
        else if (isRicher(incomingVal, existingVal)) {
            merged[key] = incomingVal;
        }
    });
    return merged;
}
/**
 * Check if a payload is strictly richer than another.
 * A payload is richer if it has more non-null fields or better values.
 */
function isPayloadRicher(candidate, existing) {
    let candidateScore = 0;
    let existingScore = 0;
    // Count non-null fields and apply weights
    Object.keys(candidate).forEach(key => {
        const candidateVal = candidate[key];
        const existingVal = existing[key];
        // Weight important fields more heavily
        const weight = ['brand_name', 'model', 'weight', 'drop', 'price'].includes(key) ? 2 : 1;
        if (candidateVal !== null && candidateVal !== undefined) {
            candidateScore += weight;
        }
        if (existingVal !== null && existingVal !== undefined) {
            existingScore += weight;
        }
        // Special case for weight: prefer grams over oz
        if (key === 'weight' && candidateVal && existingVal) {
            if (candidateVal > 50 && existingVal <= 50) {
                candidateScore += 2; // Bonus for likely grams
            }
            else if (existingVal > 50 && candidateVal <= 50) {
                existingScore += 2; // Bonus for existing grams
            }
        }
    });
    return candidateScore > existingScore;
}
/**
 * Deduplicate models within a single document by model_key.
 * Merges duplicate models, preferring richer values.
 */
function deduplicateInDocument(models) {
    const modelMap = new Map();
    for (const model of models) {
        const modelKey = generateModelKey(model.brand_name, model.model);
        if (modelMap.has(modelKey)) {
            const existing = modelMap.get(modelKey);
            const merged = mergeShoeResults(existing, model);
            modelMap.set(modelKey, merged);
        }
        else {
            modelMap.set(modelKey, model);
        }
    }
    return Array.from(modelMap.values());
}
//# sourceMappingURL=deduplication.js.map