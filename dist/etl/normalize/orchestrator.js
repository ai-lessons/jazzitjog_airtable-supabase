"use strict";
// Normalize orchestrator
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSneaker = normalizeSneaker;
exports.normalizeSneakers = normalizeSneakers;
const fields_1 = require("./fields");
const logger_1 = require("../../core/logger");
/**
 * Normalize a single sneaker spec
 */
function normalizeSneaker(sneaker, options) {
    const changes = [];
    const warnings = [];
    logger_1.logger.debug('Normalizing sneaker', {
        brand: sneaker.brand_name,
        model: sneaker.model,
    });
    // Normalize brand and model
    const brand_name = (0, fields_1.normalizeBrandName)(sneaker.brand_name, changes);
    const model = (0, fields_1.normalizeModelName)(sneaker.model, changes);
    // Normalize physical specs
    const heel_height = (0, fields_1.normalizeHeight)(sneaker.heel_height, 'heel_height', changes, warnings);
    const forefoot_height = (0, fields_1.normalizeHeight)(sneaker.forefoot_height, 'forefoot_height', changes, warnings);
    const drop = (0, fields_1.normalizeDrop)(sneaker.drop, heel_height, forefoot_height, changes, warnings);
    const weight = (0, fields_1.normalizeWeight)(sneaker.weight, changes, warnings);
    const price = (0, fields_1.normalizePrice)(sneaker.price, options?.currency || null, changes, warnings);
    // Normalize enum fields
    const upper_breathability = (0, fields_1.normalizeEnum)(sneaker.upper_breathability, ['low', 'medium', 'high'], 'upper_breathability', changes, warnings);
    const cushioning_type = (0, fields_1.normalizeEnum)(sneaker.cushioning_type, ['firm', 'balanced', 'max'], 'cushioning_type', changes, warnings);
    const surface_type = (0, fields_1.normalizeEnum)(sneaker.surface_type, ['road', 'trail'], 'surface_type', changes, warnings);
    const foot_width = (0, fields_1.normalizeEnum)(sneaker.foot_width, ['narrow', 'standard', 'wide'], 'foot_width', changes, warnings);
    // Normalize boolean fields
    const carbon_plate = (0, fields_1.normalizeBoolean)(sneaker.carbon_plate, 'carbon_plate', changes);
    const waterproof = (0, fields_1.normalizeBoolean)(sneaker.waterproof, 'waterproof', changes);
    // Build normalized sneaker
    const normalized = {
        brand_name,
        model,
        heel_height,
        forefoot_height,
        drop,
        weight,
        price,
        upper_breathability,
        carbon_plate,
        waterproof,
        primary_use: sneaker.primary_use,
        cushioning_type,
        surface_type,
        foot_width,
        additional_features: sneaker.additional_features,
    };
    logger_1.logger.debug('Normalization completed', {
        brand: normalized.brand_name,
        model: normalized.model,
        changes: changes.length,
        warnings: warnings.length,
    });
    if (warnings.length > 0) {
        logger_1.logger.warn('Normalization warnings', {
            brand: normalized.brand_name,
            model: normalized.model,
            warnings,
        });
    }
    return {
        sneaker: normalized,
        changes,
        warnings,
    };
}
/**
 * Normalize multiple sneakers
 */
function normalizeSneakers(sneakers, options) {
    return sneakers.map(sneaker => normalizeSneaker(sneaker, options));
}
//# sourceMappingURL=orchestrator.js.map