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
        let brandModel = match[1].trim();
        // Clean up "Runner-Up:" prefix and similar prefixes
        brandModel = brandModel.replace(/^(?:Runner-Up:\s*|Winner:\s*|Pick:\s*|Choice:\s*|Selection:\s*)/i, '');
        // Skip if it doesn't look like a brand+model (too generic or too descriptive)
        if (/^(?:millimeter|grams?|ounces?|features?|offers?|weighs?|stack|height|lugs|vibram|compound|outsole)/i.test(brandModel)) {
            continue;
        }
        // Must contain at least one capital letter and be reasonable length
        if (!/[A-Z]/.test(brandModel) || brandModel.length > 50 || brandModel.length < 3) {
            continue;
        }
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
    // If no drop found but text contains "zero-drop" or similar
    if (specs.drop === null && /zero[^a-z]*drop|0[^a-z]*drop|zero.drop/i.test(block)) {
        specs.drop = 0;
    }
    // Calculate drop if not found but have both heights
    if (specs.drop === null && specs.heel_height && specs.forefoot_height) {
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
    let heel_height = null;
    let forefoot_height = null;
    // Pattern 1: Range "32-28 millimeters" or "32 – 28 millimeters"
    const rangeMatch = text.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*millimeters?/i);
    if (rangeMatch) {
        heel_height = parseFloat(rangeMatch[1]);
        forefoot_height = parseFloat(rangeMatch[2]);
        return { heel_height, forefoot_height };
    }
    // Pattern 2: Specific "X-millimeter stack height at the heel" format
    const heelStackMatch = text.match(/(\d+(?:\.\d+)?)[^0-9]*millimeters?\s*stack\s*height\s*at\s*the\s*heel/i);
    if (heelStackMatch) {
        heel_height = parseFloat(heelStackMatch[1]);
    }
    // Pattern 3: General heel mentions (but avoid drop values)
    if (!heel_height) {
        const heelMatch = text.match(/(\d+(?:\.\d+)?)[^0-9]*millimeters?[^.]*(?:heel|stack\s*height)(?!\s*drop)/i);
        if (heelMatch) {
            const value = parseFloat(heelMatch[1]);
            // Skip values that are likely drops (usually < 15mm)
            if (value > 15) {
                heel_height = value;
            }
        }
    }
    // Pattern 4: Forefoot mentions
    const foreFootMatch = text.match(/(\d+(?:\.\d+)?)[^0-9]*millimeters?[^.]*forefoot/i);
    if (foreFootMatch) {
        forefoot_height = parseFloat(foreFootMatch[1]);
    }
    // Pattern 5: "heel height and forefoot height" format
    const heightsMatch = text.match(/(\d+(?:\.\d+)?)[^0-9]*millimeters?\s*heel[^0-9]+(\d+(?:\.\d+)?)[^0-9]*millimeters?\s*forefoot/i);
    if (heightsMatch) {
        heel_height = parseFloat(heightsMatch[1]);
        forefoot_height = parseFloat(heightsMatch[2]);
    }
    // Pattern 6: Stack height general (assume heel if no other context and value is reasonable)
    if (!heel_height) {
        const stackMatch = text.match(/(\d+(?:\.\d+)?)[^0-9]*millimeters?\s*(?:stack|height)(?!\s*drop)/i);
        if (stackMatch && !forefoot_height) {
            const value = parseFloat(stackMatch[1]);
            // Only use as heel height if it's a reasonable stack height (> 15mm)
            if (value > 15) {
                heel_height = value;
            }
        }
    }
    return { heel_height, forefoot_height };
}
/**
 * Extract drop value
 */
function extractDrop(text) {
    // Pattern 1: "X millimeters drop" or "X-millimeter drop"
    const dropMatch = text.match(/(\d+(?:\.\d+)?)[^0-9]*millimeters?\s*drop/i);
    if (dropMatch) {
        return parseFloat(dropMatch[1]);
    }
    // Pattern 2: "Drop is X millimeters" or "The drop is X.X millimeters"
    const dropIsMatch = text.match(/drop\s+is\s+(\d+(?:\.\d+)?)\s*millimeters?/i);
    if (dropIsMatch) {
        return parseFloat(dropIsMatch[1]);
    }
    // Pattern 3: "with an X-millimeter drop"
    const withDropMatch = text.match(/with\s+an?\s+(\d+(?:\.\d+)?)[^0-9]*millimeters?\s*drop/i);
    if (withDropMatch) {
        return parseFloat(withDropMatch[1]);
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
        drop: raw.drop !== null && raw.drop !== undefined ? raw.drop : null,
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
 * Detect models in unstructured content using brand+model patterns
 */
function detectUnstructuredModels(content) {
    const models = [];
    // Known brands for better detection
    const knownBrands = ['Nike', 'Adidas', 'Hoka', 'Brooks', 'Asics', 'New Balance', 'Saucony', 'On', 'Salomon', 'Altra', 'Inov8', 'Mizuno', 'Puma', 'Under Armour', 'Topo Athletic', 'Skechers'];
    // Pattern to find brand + model combinations - much more restrictive
    for (const brand of knownBrands) {
        // Look for Brand + specific model patterns (numbers, known series names)
        const modelPatterns = [
            // Brand + Name + Number (e.g., "Nike Pegasus 40", "Brooks Ghost 17")
            new RegExp(`\\b${brand}\\s+(Air\\s+Zoom\\s+|Gel-?|Fresh\\s+Foam\\s+)?([A-Z][a-z]+)\\s*(\\d+[a-z]*)`, 'gi'),
            // Brand + Known Series Names
            new RegExp(`\\b${brand}\\s+(Air\\s+Zoom\\s+Pegasus|Pegasus|Ghost|Clifton|Speedgoat|Nimbus|Kayano|Cumulus|Structure|Vomero|React|Infinity|Turbo|Tempo|Free|Revolution|Downshifter|Blazer|Cortez|Waffle|Zoom|Air\\s+Max|Air\\s+Force|Gel-Nimbus|Gel-Kayano|Gel-Cumulus|GT-\\d+|Fresh\\s+Foam|FuelCell|MORE|Beacon|Rebel|Arishi|Minimus|Trail|Hierro|Summit|Ultraboost|4D|NMD|Stan\\s+Smith|Superstar|Gazelle|Campus|Continental|Solar|Edge|Alphaboost|Pureboost|Response|Galaxy|Duramo|EQT|POD|Yeezy|Boost|ZX|Energy|Cloud|Cloudstratus|Cloudflow|Cloudswift|Cloudsurfer|Cloudflyer|Cloudrush|Cloudventure|Cloudace|Pulse|Endorphin|Kinvara|Ride|Guide|Hurricane|Triumph|Cohesion|Grid|Jazz|Shadow|Peregrine|Xodus|Switchback|Mad\\s+River|Clifton|Bondi|Arahi|Rincon|Mach|Carbon\\s+X|Speedgoat|Challenger|Tecton|Torrent|Evo|Kawana|Transport|Solimar|Kaha|Ora|Slide|Clifton\\s+Edge|Akasa|Skyward|Mafate|Lone\\s+Peak|Escalante|Rivera|Paradigm|Provision|Torin|Timp|Olympus|King|Superior|Mont\\s+Blanc|Cross|Lone|Superior|Via|Race|Repeat|X-Mission|Sense|Predict|Outpath|Alphacross|Speedcross|Wildcross|Supercross|Ultra|Sonic|Aero|Wave|Rider|Inspire|Horizon|Prophecy|Creation|Paradox|Ultima|Sky|Alchemy|Connect|Catalyst|Precog|Trail|RunBird|Vapor|Streak|Rival|Victory|Zoom\\s+Fly|Alphafly|Vaporfly|ZoomX|Tempo|Invincible|Ultrafly)\\b`, 'gi')
        ];
        for (const pattern of modelPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const fullMatch = match[0].trim();
                // Extract brand and model parts
                const brandPart = brand;
                const modelPart = fullMatch.replace(new RegExp(`^${brand}\\s+`, 'i'), '').trim();
                // Validate the model part
                if (!isValidModelPart(modelPart)) {
                    continue;
                }
                // Extract potential price from nearby text
                const beforeMatch = content.slice(Math.max(0, match.index - 100), match.index);
                const afterMatch = content.slice(match.index, Math.min(content.length, match.index + match[0].length + 200));
                const surroundingText = beforeMatch + match[0] + afterMatch;
                const priceMatch = surroundingText.match(/(?:Price[:\s]*|Retail\s+price[:\s]*|costs?\s*|\$)(\d{2,4})\b/i);
                const price = priceMatch ? parseInt(priceMatch[1], 10) : undefined;
                models.push({
                    heading: fullMatch,
                    brandModel: `${brandPart} ${modelPart}`,
                    price,
                    startIndex: match.index,
                    endIndex: match.index + match[0].length
                });
            }
        }
    }
    return models;
}
/**
 * Validate if a model part looks like a legitimate model name
 */
function isValidModelPart(modelPart) {
    if (!modelPart || modelPart.length < 2)
        return false;
    // Convert to lowercase for checking
    const lower = modelPart.toLowerCase();
    // Must contain numbers OR known model series names
    const hasNumbers = /\d/.test(modelPart);
    const hasKnownSeries = /(pegasus|ghost|clifton|speedgoat|nimbus|kayano|cumulus|structure|vomero|react|infinity|turbo|tempo|free|revolution|downshifter|blazer|cortez|waffle|zoom|air|gel|fresh|fuelcell|more|beacon|rebel|arishi|minimus|trail|hierro|summit|ultraboost|nmd|stan|superstar|gazelle|campus|continental|solar|edge|alphaboost|pureboost|response|galaxy|duramo|eqt|pod|yeezy|boost|energy|cloud|pulse|endorphin|kinvara|ride|guide|hurricane|triumph|cohesion|grid|jazz|shadow|peregrine|xodus|switchback|mad|bondi|arahi|rincon|mach|carbon|challenger|tecton|torrent|evo|kawana|transport|solimar|kaha|ora|slide|akasa|skyward|mafate|lone|escalante|rivera|paradigm|provision|torin|timp|olympus|king|superior|mont|cross|repeat|mission|sense|predict|outpath|alphacross|speedcross|wildcross|supercross|ultra|sonic|aero|wave|rider|inspire|horizon|prophecy|creation|paradox|ultima|sky|alchemy|connect|catalyst|precog|runbird|vapor|streak|rival|victory|fly|alphafly|vaporfly|zoomx|invincible|ultrafly)/i.test(lower);
    if (!hasNumbers && !hasKnownSeries) {
        return false;
    }
    // Reject obvious non-model words
    const invalidWords = /^(version|model|option|design|iteration|offering|lineup|system|technology|innovation|engineering|development|has|enhanced|latest|improved|updated|moved|added|nailed|redesigned|developed|stability|cushioning|trainer|lightweight|maximum|shoe|shoes|running|trail|road|features|offers|provides|delivers|weighs|measures|boasts)$/i;
    if (invalidWords.test(lower)) {
        return false;
    }
    // Reject if it contains action verbs or descriptive phrases
    const invalidPhrases = /(moved|enhanced|improved|updated|added|nailed|redesigned|developed|has|offers|provides|delivers|features|weighs|measures|boasts|latest|newest|signature|daily|trainer|lineup|offering|system|technology|innovation|engineering|development)/i;
    if (invalidPhrases.test(lower)) {
        return false;
    }
    // Reject if too long (likely descriptive)
    if (modelPart.length > 25) {
        return false;
    }
    return true;
}
/**
 * Extract multiple models from structured content with headings
 */
function extractMultipleModels(content) {
    let allModels = [];
    // First try structured headings
    const headings = detectModelHeadings(content);
    allModels.push(...headings);
    // If no structured headings found, try unstructured detection
    if (headings.length === 0) {
        const unstructuredModels = detectUnstructuredModels(content);
        allModels.push(...unstructuredModels);
    }
    // If still nothing found, fall back to LLM extraction
    if (allModels.length === 0) {
        return [];
    }
    const models = [];
    const dedupeMap = new Map();
    for (let i = 0; i < allModels.length; i++) {
        const modelMatch = allModels[i];
        const nextModel = allModels[i + 1];
        let description;
        let fullBlock;
        if (headings.length > 0) {
            // For structured content, use the original collectModelBlock
            description = collectModelBlock(content, modelMatch, nextModel);
            fullBlock = `${modelMatch.heading}\n${description}`;
        }
        else {
            // For unstructured content, extract surrounding context
            const startPos = Math.max(0, modelMatch.startIndex - 100);
            const endPos = nextModel ? nextModel.startIndex : Math.min(content.length, modelMatch.endIndex + 300);
            description = content.slice(modelMatch.endIndex, endPos).trim();
            fullBlock = `${modelMatch.heading}\n${description}`;
        }
        const rawSpecs = extractSpecs(fullBlock, modelMatch);
        const normalizedSpecs = normalizeSpecs(rawSpecs);
        // Skip if no brand or model
        if (!normalizedSpecs.brand_name || !normalizedSpecs.model) {
            continue;
        }
        // Additional validation for model quality
        if (!isHighQualityModel(normalizedSpecs.brand_name, normalizedSpecs.model)) {
            continue;
        }
        // Create model key for deduplication
        const modelKey = `${normalizedSpecs.brand_name.toLowerCase()}::${normalizedSpecs.model.toLowerCase()}`;
        // Check for similar models to avoid duplicates (e.g., "Pegasus" vs "Pegasus 40")
        let shouldMerge = false;
        let existingKey = modelKey;
        for (const [existingModelKey, existingModel] of dedupeMap.entries()) {
            if (areSimilarModels(normalizedSpecs, existingModel)) {
                shouldMerge = true;
                existingKey = existingModelKey;
                break;
            }
        }
        if (shouldMerge) {
            // Merge with similar model, preferring more specific versions
            const existing = dedupeMap.get(existingKey);
            const merged = mergeModels(existing, normalizedSpecs);
            dedupeMap.set(existingKey, merged);
        }
        else {
            dedupeMap.set(modelKey, normalizedSpecs);
        }
    }
    return Array.from(dedupeMap.values());
}
/**
 * Additional validation for model quality
 */
function isHighQualityModel(brand, model) {
    // Check if this is a known high-quality brand
    const knownBrands = ['Nike', 'Adidas', 'Hoka', 'Brooks', 'Asics', 'New Balance', 'Saucony', 'On', 'Salomon', 'Altra', 'Inov8', 'Mizuno', 'Puma', 'Under Armour', 'Topo Athletic', 'Skechers'];
    if (!knownBrands.includes(brand)) {
        return false;
    }
    // Model should either have numbers or be a known series
    const hasNumbers = /\d/.test(model);
    const hasKnownSeries = /^(Air|Gel|Fresh|Wave|Cloud|Ultra|Pure|Solar|Alpha|React|Zoom|Infinity|Turbo|Tempo|Free|Revolution|Downshifter|Blazer|Cortez|Waffle|Pegasus|Ghost|Clifton|Speedgoat|Nimbus|Kayano|Cumulus|Structure|Vomero|Bondi|Arahi|Rincon|Mach|Challenger|Torrent|Evo|Endorphin|Kinvara|Ride|Guide|Hurricane|Triumph|Peregrine|Xodus|Lone|Escalante|Rivera|Paradigm|Torin|Timp|Olympus|Sense|Predict|Speedcross|Wildcross|Supercross|Sonic|Aero|Rider|Inspire|Horizon|Prophecy|Creation|Paradox|Ultima|Sky|Vapor|Streak|Rival|Victory|Alphafly|Vaporfly|ZoomX|Invincible)/i.test(model);
    return hasNumbers || hasKnownSeries;
}
/**
 * Check if two models are similar and should be merged
 */
function areSimilarModels(model1, model2) {
    // Must be same brand
    if (model1.brand_name?.toLowerCase() !== model2.brand_name?.toLowerCase()) {
        return false;
    }
    const name1 = model1.model?.toLowerCase() || '';
    const name2 = model2.model?.toLowerCase() || '';
    // If one is a subset of the other (e.g., "Pegasus" vs "Pegasus 40")
    const shorterName = name1.length < name2.length ? name1 : name2;
    const longerName = name1.length >= name2.length ? name1 : name2;
    // Check if shorter name is the beginning of longer name
    if (longerName.startsWith(shorterName) && longerName.length - shorterName.length <= 5) {
        return true;
    }
    return false;
}
/**
 * Merge two similar models, preferring more complete data
 */
function mergeModels(existing, newModel) {
    // Prefer more specific model names (longer names)
    const useExistingName = (existing.model?.length || 0) >= (newModel.model?.length || 0);
    const merged = {
        brand_name: existing.brand_name,
        model: useExistingName ? existing.model : newModel.model,
        price: existing.price || newModel.price,
        weight: existing.weight || newModel.weight,
        heel_height: existing.heel_height || newModel.heel_height,
        forefoot_height: existing.forefoot_height || newModel.forefoot_height,
        drop: existing.drop !== null ? existing.drop : newModel.drop,
        primary_use: existing.primary_use || newModel.primary_use,
        surface_type: existing.surface_type || newModel.surface_type,
        carbon_plate: existing.carbon_plate !== null ? existing.carbon_plate : newModel.carbon_plate,
        waterproof: existing.waterproof !== null ? existing.waterproof : newModel.waterproof,
        upper_breathability: existing.upper_breathability || newModel.upper_breathability,
        cushioning_type: existing.cushioning_type || newModel.cushioning_type,
        foot_width: existing.foot_width || newModel.foot_width,
        additional_features: existing.additional_features || newModel.additional_features,
    };
    return merged;
}
//# sourceMappingURL=extractMultiModel.js.map