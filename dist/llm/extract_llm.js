"use strict";
// Unified LLM-based sneaker extraction
// Combines logic from: llm/extract.ts + simple-parser.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractWithLLM = extractWithLLM;
const client_1 = require("./client");
const prompts_1 = require("./prompts");
const logger_1 = require("../core/logger");
const metrics_1 = require("../core/metrics");
const units_1 = require("../core/units");
const validation_1 = require("../core/validation");
const utils_1 = require("../core/utils");
/**
 * Extract sneakers using LLM (GPT-4o-mini)
 */
async function extractWithLLM(apiKey, content, title, options) {
    const metrics = (0, metrics_1.getMetrics)();
    metrics.incrementLlmCalls();
    logger_1.logger.info('Starting LLM extraction', {
        contentLength: content.length,
        hasTitle: !!title,
        scenario: options?.titleAnalysis?.scenario
    });
    try {
        const client = (0, client_1.getOpenAIClient)(apiKey);
        const systemPrompt = (0, prompts_1.generateSystemPrompt)(options?.titleAnalysis);
        const userPrompt = (0, prompts_1.generateUserPrompt)(content, title, options?.titleAnalysis);
        const responseText = await (0, client_1.callOpenAI)(client, {
            systemPrompt,
            userPrompt,
            fewShotExamples: prompts_1.FEW_SHOT_EXAMPLES,
        });
        // Parse JSON response
        let parsed = {};
        try {
            parsed = JSON.parse(responseText);
        }
        catch (parseError) {
            logger_1.logger.error('Failed to parse LLM JSON response', { error: parseError });
            metrics.incrementLlmFailed();
            return [];
        }
        // Extract items array (handle different response formats)
        const rawItems = extractItemsArray(parsed);
        console.log('[DEBUG] LLM response:', JSON.stringify(parsed, null, 2).substring(0, 1000));
        console.log('[DEBUG] rawItems count:', rawItems.length);
        if (rawItems.length === 0) {
            logger_1.logger.warn('LLM returned empty results', {
                responseKeys: Object.keys(parsed),
                response: JSON.stringify(parsed).substring(0, 500)
            });
            return [];
        }
        // Normalize and validate items
        const sneakers = rawItems
            .map(item => normalizeSneaker(item, options))
            .filter(isValidSneaker);
        logger_1.logger.info('LLM extraction completed', {
            rawCount: rawItems.length,
            validCount: sneakers.length
        });
        return sneakers;
    }
    catch (error) {
        logger_1.logger.error('LLM extraction failed', { error });
        metrics.incrementLlmFailed();
        return [];
    }
}
/**
 * Extract items array from various LLM response formats
 */
function extractItemsArray(response) {
    if (Array.isArray(response.items))
        return response.items;
    if (Array.isArray(response.sneakers))
        return response.sneakers;
    if (Array.isArray(response.models))
        return response.models;
    if (response.model)
        return [response.model];
    return [];
}
/**
 * Normalize raw LLM response item to SneakerSpec
 */
function normalizeSneaker(raw, options) {
    // Brand and model
    const brand_name = normalizeBrand(raw.brand_name || raw.brand);
    const model = normalizeModel(raw.model || raw.model_name || raw.shoe_model);
    // Heights
    const heel = normalizeHeight(raw.heel_height);
    const fore = normalizeHeight(raw.forefoot_height);
    let drop = normalizeDrop(raw.drop);
    // Calculate drop if not provided but have both heights
    if (drop === null && heel !== null && fore !== null) {
        drop = (0, utils_1.round2)(heel - fore);
    }
    // Weight
    const weight = normalizeWeight(raw.weight);
    // Price (handle multiple formats: price_usd, price, price with currency)
    const price = normalizePrice(raw.price_usd, raw.price, raw.price_currency, raw.price_text);
    return {
        brand_name,
        model,
        heel_height: heel,
        forefoot_height: fore,
        drop,
        weight,
        price,
        upper_breathability: normalizeBreathability(raw.upper_breathability),
        carbon_plate: normalizeBoolean(raw.carbon_plate),
        waterproof: normalizeBoolean(raw.waterproof),
        primary_use: normalizePrimaryUse(raw.primary_use),
        cushioning_type: normalizeCushioning(raw.cushioning_type || raw.cushioning),
        surface_type: normalizeSurface(raw.surface_type || raw.surface),
        foot_width: normalizeWidth(raw.foot_width || raw.width),
        additional_features: raw.additional_features || null,
    };
}
/**
 * Validate if sneaker has minimum required data
 */
function isValidSneaker(sneaker) {
    // Must have brand and model
    if (!sneaker.brand_name || !sneaker.model) {
        return false;
    }
    // Brand must be valid length
    if (sneaker.brand_name.length < 2 || sneaker.brand_name.length > 30) {
        return false;
    }
    // Model must be valid length
    if (sneaker.model.length < 2 || sneaker.model.length > 50) {
        return false;
    }
    // Skip obviously invalid models
    const invalidModels = /^(shoe|shoes|sneaker|trainer|running|review|test|performance|comparison)$/i;
    if (invalidModels.test(sneaker.model)) {
        return false;
    }
    // Must have at least one meaningful characteristic
    const hasCharacteristics = !!(sneaker.heel_height ||
        sneaker.forefoot_height ||
        sneaker.drop !== null ||
        sneaker.weight ||
        sneaker.price ||
        sneaker.primary_use ||
        sneaker.surface_type ||
        sneaker.carbon_plate !== null ||
        sneaker.waterproof !== null ||
        sneaker.cushioning_type ||
        sneaker.foot_width ||
        sneaker.upper_breathability);
    return hasCharacteristics;
}
// Normalization functions
function normalizeBrand(brand) {
    if (!brand)
        return null;
    const cleaned = String(brand).trim();
    // Common brand corrections
    const brandMap = {
        'ASICS': 'Asics',
        'HOKA': 'Hoka',
        'PUMA': 'Puma',
        'On Running': 'On',
        'THE NORTH FACE': 'The North Face',
        'NIKE': 'Nike',
        'ADIDAS': 'Adidas',
    };
    return brandMap[cleaned] || cleaned;
}
function normalizeModel(model) {
    if (!model)
        return null;
    let cleaned = String(model).trim();
    // Remove common suffixes that shouldn't be part of model name
    cleaned = cleaned.replace(/\s+(review|test|performance|running|shoe|trainer)$/i, '');
    return cleaned || null;
}
function normalizeHeight(height) {
    const h = (0, utils_1.toNum)(height);
    return h !== null && (0, validation_1.isValidHeight)(h) ? Math.round(h) : null;
}
function normalizeDrop(drop) {
    const d = (0, utils_1.toNum)(drop);
    return d !== null && (0, validation_1.isValidDrop)(d) ? (0, utils_1.round2)(d) : null;
}
function normalizeWeight(weight) {
    const w = (0, utils_1.toIntOrNull)(weight);
    return w !== null && (0, validation_1.isValidWeight)(w) ? w : null;
}
function normalizePrice(priceUsdRaw, priceRaw, currencyRaw, priceText) {
    // Try direct USD price first
    const usdDirect = (0, utils_1.toNum)(priceUsdRaw);
    if (usdDirect !== null && (0, validation_1.isValidUsdPrice)(usdDirect)) {
        return (0, utils_1.round2)(usdDirect);
    }
    // Try to convert from other currency
    const val = (0, utils_1.toNum)(priceRaw);
    if (val === null)
        return null;
    const currency = normalizeCurrency(currencyRaw) || (0, units_1.detectCurrency)(String(priceText || ''));
    if (!currency)
        return null;
    const usd = (0, units_1.convertToUSD)(val, currency);
    if (usd === null)
        return null;
    return (0, validation_1.isValidUsdPrice)(usd) ? (0, utils_1.round2)(usd) : null;
}
function normalizeCurrency(x) {
    const s = String(x ?? '').trim().toUpperCase();
    if (!s)
        return null;
    if (s === '$' || s === 'USD' || s === 'US$')
        return 'USD';
    if (s === '€' || s === 'EUR')
        return 'EUR';
    if (s === '£' || s === 'GBP')
        return 'GBP';
    if (s === 'JPY' || s === '¥')
        return 'JPY';
    if (s === 'CAD')
        return 'CAD';
    if (s === 'AUD')
        return 'AUD';
    if (s === 'CHF')
        return 'CHF';
    return s.length === 3 ? s : null;
}
function normalizeBoolean(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string') {
        const s = value.toLowerCase();
        if (s.includes('true') || s.includes('yes'))
            return true;
        if (s.includes('false') || s.includes('no'))
            return false;
    }
    return null;
}
function normalizeBreathability(value) {
    if (!value)
        return null;
    const s = String(value).toLowerCase();
    if (s.includes('high') || s.includes('excellent') || s.includes('great'))
        return 'high';
    if (s.includes('low') || s.includes('poor'))
        return 'low';
    if (s.includes('medium') || s.includes('moderate') || s.includes('average'))
        return 'medium';
    return null;
}
function normalizeCushioning(value) {
    if (!value)
        return null;
    const s = String(value).toLowerCase();
    if (/(max|plush|high)/.test(s))
        return 'max';
    if (/(firm|stiff)/.test(s))
        return 'firm';
    if (/(balanced|moderate|middle|medium)/.test(s))
        return 'balanced';
    return null;
}
function normalizeSurface(value) {
    if (!value)
        return null;
    const s = String(value).toLowerCase();
    if (/trail/.test(s))
        return 'trail';
    if (/road|asphalt|pavement/.test(s))
        return 'road';
    return null;
}
function normalizeWidth(value) {
    if (!value)
        return null;
    const s = String(value).toLowerCase();
    if (/narrow|slim/.test(s))
        return 'narrow';
    if (/wide|2e|4e/.test(s))
        return 'wide';
    if (/standard|regular|d width|medium/.test(s))
        return 'standard';
    return null;
}
function normalizePrimaryUse(value) {
    if (!value)
        return null;
    const s = String(value).toLowerCase();
    if (s.includes('daily') || s.includes('trainer'))
        return 'daily trainer';
    if (s.includes('tempo'))
        return 'tempo';
    if (s.includes('race'))
        return 'race';
    if (s.includes('trail'))
        return 'trail';
    return value;
}
//# sourceMappingURL=extract_llm.js.map