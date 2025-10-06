"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectModelHeadings = detectModelHeadings;
exports.collectModelBlock = collectModelBlock;
exports.extractSpecs = extractSpecs;
exports.normalizeSpecs = normalizeSpecs;
exports.extractMultipleModels = extractMultipleModels;
const fields_1 = require("../transform/fields");
/**
 * Detect model headings in structured content
 */
function detectModelHeadings(content) {
    const headings = [];
    // Pattern for headings like "Best Road Running Shoes: Hoka Clifton 9 ($145)"
    const headingPattern = /^(?:Best\s+)?(?:Road|Trail)?\s*(?:Running\s+)?Shoes?[^:]*?[:—-]\s*([^(\n]+?)(?:\s*\([^)]*\$(\d{2,4})[^)]*\))?\s*$/gmi;
    let match;
    while ((match = headingPattern.exec(content)) !== null) {
        const heading = match[0].trim();
        const brandModel = match[1].trim();
        const price = match[2] ? parseInt(match[2], 10) : undefined;
        headings.push({
            heading,
            brandModel,
            price,
            startIndex: match.index,
            endIndex: match.index + match[0].length
        });
    }
    return headings;
}
/**
 * Collect the description block for each heading
 */
function collectModelBlock(content, heading, nextHeading) {
    const startPos = heading.endIndex;
    const endPos = nextHeading ? nextHeading.startIndex : content.length;
    return content.slice(startPos, endPos).trim();
}
/**
 * Extract specs from a model block (heading + description)
 */
function extractSpecs(block, heading) {
    const specs = {};
    // Extract brand and model from heading
    const { brand_name, model } = parseBrandModel(heading.brandModel);
    specs.brand_name = brand_name;
    specs.model = model;
    // Extract price (from heading or description)
    specs.price = heading.price || extractPrice(block);
    // Extract weight
    specs.weight = extractWeight(block);
    // Extract heights and drop
    const heights = extractHeights(block);
    specs.heel_height = heights.heel_height;
    specs.forefoot_height = heights.forefoot_height;
    specs.drop = extractDrop(block);
    // Calculate drop if not found but have both heights
    if (!specs.drop && specs.heel_height && specs.forefoot_height) {
        specs.drop = Math.round((specs.heel_height - specs.forefoot_height) * 10) / 10;
    }
    // Extract use and surface type from context
    const useInfo = extractUseAndSurface(heading.heading, block);
    specs.primary_use = useInfo.primary_use;
    specs.surface_type = useInfo.surface_type;
    // Extract boolean features
    specs.waterproof = extractWaterproof(block);
    specs.carbon_plate = extractCarbonPlate(block);
    return specs;
}
/**
 * Parse brand and model from brand-model string
 */
function parseBrandModel(brandModel) {
    const trimmed = brandModel.trim();
    if (!trimmed)
        return { brand_name: null, model: null };
    // Known brands for better parsing
    const knownBrands = ['Nike', 'Adidas', 'Hoka', 'Brooks', 'Asics', 'New Balance', 'Saucony', 'On', 'Salomon', 'Altra', 'Inov8', 'Mizuno', 'Puma', 'Under Armour'];
    // Try to match known brands first
    for (const brand of knownBrands) {
        if (trimmed.toLowerCase().startsWith(brand.toLowerCase())) {
            const model = trimmed.slice(brand.length).trim();
            return { brand_name: brand, model: model || null };
        }
    }
    // Fallback: first word is brand, rest is model
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
        return { brand_name: parts[0], model: null };
    }
    const brand = parts[0];
    const model = (0, fields_1.refineModelName)(brand, parts.slice(1).join(' '));
    return {
        brand_name: brand,
        model: model
    };
}
/**
 * Extract price from text
 */
function extractPrice(text) {
    const pricePattern = /\(\s*\$?\s*(\d{2,4})\s*\)|\b\$\s*(\d{2,4})\b/g;
    const match = pricePattern.exec(text);
    if (match) {
        const price = parseInt(match[1] || match[2], 10);
        return (price >= 40 && price <= 500) ? price : null;
    }
    return null;
}
/**
 * Extract weight in grams
 */
function extractWeight(text) {
    // Pattern 1: "8.9 ounces (252 grams)" - prefer grams from parentheses
    const ozGramsMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ounces?|oz)\s*\((\d+)\s*grams?\)/i);
    if (ozGramsMatch) {
        return parseInt(ozGramsMatch[2], 10);
    }
    // Pattern 2: standalone grams
    const gramsMatch = text.match(/\b(\d{2,4})\s*grams?\b/i);
    if (gramsMatch) {
        return parseInt(gramsMatch[1], 10);
    }
    // Pattern 3: standalone ounces - convert to grams
    const ozMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:ounces?|oz)\b/i);
    if (ozMatch) {
        const oz = parseFloat(ozMatch[1]);
        return Math.round(oz * 28.3495);
    }
    return null;
}
/**
 * Extract heel and forefoot heights
 */
function extractHeights(text) {
    // Pattern 1: Range "32-28 millimeters" or "32 – 28 millimeters"
    const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*millimeters?/i);
    if (rangeMatch) {
        const heel = parseFloat(rangeMatch[1]);
        const forefoot = parseFloat(rangeMatch[2]);
        return { heel_height: heel, forefoot_height: forefoot };
    }
    // Pattern 2: Single value with context
    const heelMatch = text.match(/(\d+(?:\.\d+)?)\s*millimeters?\s*.*?(?:stack\s*height|stack|heel)/i);
    if (heelMatch) {
        return { heel_height: parseFloat(heelMatch[1]), forefoot_height: null };
    }
    const foreFootMatch = text.match(/(\d+(?:\.\d+)?)\s*millimeters?\s*.*?forefoot/i);
    if (foreFootMatch) {
        return { heel_height: null, forefoot_height: parseFloat(foreFootMatch[1]) };
    }
    return { heel_height: null, forefoot_height: null };
}
/**
 * Extract drop value
 */
function extractDrop(text) {
    const dropMatch = text.match(/(\d+(?:\.\d+)?)\s*millimeters?\s*drop/i);
    if (dropMatch) {
        return parseFloat(dropMatch[1]);
    }
    return null;
}
/**
 * Extract primary use and surface type from context
 */
function extractUseAndSurface(heading, description) {
    const combined = `${heading} ${description}`.toLowerCase();
    let primary_use = null;
    let surface_type = null;
    // Determine surface type first
    if (/trail/i.test(combined)) {
        surface_type = "trail";
        primary_use = "trail running";
    }
    else if (/road|pavement|asphalt/i.test(combined)) {
        surface_type = "road";
        primary_use = "road";
    }
    else if (/road[^]*trail|trail[^]*road|door[^]*trail|versatile/i.test(combined)) {
        surface_type = "mixed";
        primary_use = "road";
    }
    // Look for more specific use cases
    if (/tempo|speed|racing/i.test(combined)) {
        primary_use = "tempo";
    }
    else if (/daily|training|trainer/i.test(combined)) {
        primary_use = "daily trainer";
    }
    else if (/recovery/i.test(combined)) {
        primary_use = "recovery";
    }
    return { primary_use, surface_type };
}
/**
 * Extract waterproof info
 */
function extractWaterproof(text) {
    if (/gore[^]*tex|gtx|waterproof|water[^]*resistant/i.test(text)) {
        return true;
    }
    return null;
}
/**
 * Extract carbon plate info
 */
function extractCarbonPlate(text) {
    if (/carbon[^]*plate|carbon[^]*fiber/i.test(text)) {
        return true;
    }
    return null;
}
// Import existing normalization functions
function normalizeCushion(x) {
    const s = String(x ?? "").toLowerCase();
    if (!s)
        return null;
    if (/(max|plush|high)/.test(s))
        return "max";
    if (/(firm|stiff)/.test(s))
        return "firm";
    if (/(balanced|moderate|middle|medium)/.test(s))
        return "balanced";
    return null;
}
function normalizeSurface(x) {
    const s = String(x ?? "").toLowerCase();
    if (/trail/.test(s))
        return "trail";
    if (/road|asphalt|pavement/.test(s))
        return "road";
    return null;
}
function normalizeWidth(x) {
    const s = String(x ?? "").toLowerCase();
    if (/narrow|slim/.test(s))
        return "narrow";
    if (/wide|2e|4e/.test(s))
        return "wide";
    if (/standard|regular|d width|medium/.test(s))
        return "standard";
    return null;
}
/**
 * Normalize specs using existing project rules
 */
function normalizeSpecs(raw) {
    return {
        brand_name: raw.brand_name || null,
        model: raw.model || null,
        price: raw.price && raw.price >= 40 && raw.price <= 500 ? raw.price : null,
        weight: raw.weight ? Math.round(raw.weight) : null,
        heel_height: raw.heel_height || null,
        forefoot_height: raw.forefoot_height || null,
        drop: raw.drop || null,
        primary_use: raw.primary_use || null,
        surface_type: normalizeSurface(raw.surface_type),
        carbon_plate: raw.carbon_plate || null,
        waterproof: raw.waterproof || null,
        upper_breathability: raw.upper_breathability || null,
        cushioning_type: normalizeCushion(raw.cushioning_type),
        foot_width: normalizeWidth(raw.foot_width),
        additional_features: raw.additional_features || null,
    };
}
/**
 * Extract multiple models from structured content with headings
 */
function extractMultipleModels(content) {
    const headings = detectModelHeadings(content);
    if (headings.length === 0) {
        return []; // Fall back to existing LLM extraction
    }
    const models = [];
    const dedupeMap = new Map();
    for (let i = 0; i < headings.length; i++) {
        const heading = headings[i];
        const nextHeading = headings[i + 1];
        const description = collectModelBlock(content, heading, nextHeading);
        const fullBlock = `${heading.heading}\n${description}`;
        const rawSpecs = extractSpecs(fullBlock, heading);
        const normalizedSpecs = normalizeSpecs(rawSpecs);
        // Skip if no brand or model
        if (!normalizedSpecs.brand_name || !normalizedSpecs.model) {
            continue;
        }
        // Create model key for deduplication
        const modelKey = `${normalizedSpecs.brand_name.toLowerCase()}::${normalizedSpecs.model.toLowerCase()}`;
        // Deduplicate by model_key
        const existing = dedupeMap.get(modelKey);
        if (existing) {
            // Merge specs, preferring non-null values
            const merged = { ...existing };
            Object.keys(normalizedSpecs).forEach(key => {
                const newVal = normalizedSpecs[key];
                if (newVal !== null && merged[key] === null) {
                    merged[key] = newVal;
                }
            });
            dedupeMap.set(modelKey, merged);
        }
        else {
            dedupeMap.set(modelKey, normalizedSpecs);
        }
    }
    return Array.from(dedupeMap.values());
}
//# sourceMappingURL=extractMultiModel.js.map