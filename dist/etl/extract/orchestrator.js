"use strict";
// Extract orchestrator - combines regex and LLM extraction
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFromArticle = extractFromArticle;
const extract_regex_1 = require("../../llm/extract_regex");
const extract_llm_1 = require("../../llm/extract_llm");
const title_analysis_1 = require("./title_analysis");
const logger_1 = require("../../core/logger");
const metrics_1 = require("../../core/metrics");
const utils_1 = require("../../core/utils");
/**
 * Extract sneaker specifications from article
 *
 * Algorithm:
 * 1. Analyze title for context (specific/general/brand-only)
 * 2. Try regex extraction (fast, structured content)
 * 3. Fallback to LLM if regex returns empty
 * 4. Filter results by title analysis
 * 5. Validate and deduplicate
 * 6. Calculate coverage metrics
 */
async function extractFromArticle(article, apiKey) {
    const metrics = (0, metrics_1.getMetrics)();
    metrics.incrementArticlesProcessed();
    logger_1.logger.info('Starting extraction', {
        article_id: article.article_id,
        title: article.title,
        contentLength: article.content.length,
    });
    // Step 1: Analyze title for context
    // NOTE: Article is already filtered by isRunningShoeArticle() in ingestion stage
    const titleAnalysis = (0, title_analysis_1.analyzeTitleForContext)(article.title);
    logger_1.logger.debug('Title analysis completed', { titleAnalysis });
    // Step 2: Try regex extraction (fast path)
    let results = (0, extract_regex_1.extractWithRegex)(article.content);
    let method = 'regex';
    logger_1.logger.debug('Regex extraction completed', { count: results.length });
    // Step 3: Filter by title analysis FIRST (before LLM fallback decision)
    const beforeFilter = results.length;
    if (titleAnalysis.scenario !== 'general') {
        results = results.filter(sneaker => (0, title_analysis_1.matchesTitleAnalysis)(sneaker, titleAnalysis));
        logger_1.logger.debug('Filtered by title analysis', {
            scenario: titleAnalysis.scenario,
            before: beforeFilter,
            after: results.length,
        });
    }
    // Step 4: Fallback to LLM if regex returned insufficient results AFTER filtering
    // For brand-only/general articles (roundups), expect multiple models (at least 3)
    // For specific-model articles (reviews), expect at least 1 model
    const needsLLM = results.length === 0 ||
        (titleAnalysis.scenario === 'brand-only' && results.length < 3) ||
        (titleAnalysis.scenario === 'general' && results.length < 3) ||
        (titleAnalysis.scenario === 'specific' && results.length === 0);
    if (needsLLM) {
        logger_1.logger.info('Regex extraction insufficient after filtering, falling back to LLM', {
            article_id: article.article_id,
            beforeFilter,
            afterFilter: results.length,
            scenario: titleAnalysis.scenario,
        });
        try {
            results = await (0, extract_llm_1.extractWithLLM)(apiKey, article.content, article.title, { titleAnalysis });
            method = 'llm';
            metrics.incrementLlmFallbacks();
            logger_1.logger.debug('LLM extraction completed', { count: results.length });
        }
        catch (error) {
            logger_1.logger.error('LLM extraction failed', {
                article_id: article.article_id,
                error,
            });
            metrics.incrementArticlesFailed();
            return {
                article_id: article.article_id,
                sneakers: [],
                extractionMethod: 'llm',
                titleAnalysis,
            };
        }
    }
    else {
        // Step 4b: Hybrid mode - if regex succeeded but missing critical text fields, enhance with LLM
        const hasMissingTextFields = results.some(sneaker => !sneaker.cushioning_type || !sneaker.foot_width || sneaker.waterproof === null);
        if (hasMissingTextFields && titleAnalysis.scenario === 'specific') {
            logger_1.logger.info('Regex succeeded but missing text fields, enhancing with LLM', {
                article_id: article.article_id,
                count: results.length,
            });
            try {
                const llmResults = await (0, extract_llm_1.extractWithLLM)(apiKey, article.content, article.title, { titleAnalysis });
                // Merge: keep regex numbers, add LLM text fields
                if (llmResults.length > 0) {
                    results = results.map(regexSneaker => {
                        // Find matching LLM result by brand+model
                        const llmMatch = llmResults.find(llm => llm.brand_name?.toLowerCase() === regexSneaker.brand_name?.toLowerCase() &&
                            llm.model?.toLowerCase() === regexSneaker.model?.toLowerCase());
                        if (llmMatch) {
                            return {
                                ...regexSneaker,
                                // Add missing text fields from LLM
                                cushioning_type: regexSneaker.cushioning_type || llmMatch.cushioning_type,
                                foot_width: regexSneaker.foot_width || llmMatch.foot_width,
                                waterproof: regexSneaker.waterproof !== null ? regexSneaker.waterproof : llmMatch.waterproof,
                            };
                        }
                        return regexSneaker;
                    });
                    logger_1.logger.debug('Hybrid extraction: merged regex + LLM', { count: results.length });
                }
            }
            catch (error) {
                logger_1.logger.warn('LLM enhancement failed, using regex results', { error });
                console.error('Hybrid LLM error details:', error);
                // Continue with regex results
            }
        }
        metrics.incrementRegexSuccess();
    }
    // Step 5: Post-processing
    results = postProcessSneakers(results);
    // Step 6: Validate
    results = results.filter(isValidSneaker);
    // Step 7: Deduplicate
    results = deduplicateSneakers(results);
    // Step 8: Calculate coverage metrics
    const coverage = calculateCoverage(results);
    // Update metrics
    metrics.incrementSneakersExtracted(results.length);
    logger_1.logger.info('Extraction completed', {
        article_id: article.article_id,
        method,
        sneakers: results.length,
        scenario: titleAnalysis.scenario,
        averageCoverage: coverage.averageCoverage,
    });
    return {
        article_id: article.article_id,
        sneakers: results,
        extractionMethod: method,
        titleAnalysis,
        coverage,
    };
}
/**
 * Post-process sneakers: enrich and normalize
 */
function postProcessSneakers(sneakers) {
    return sneakers.map(sneaker => {
        // Calculate drop if heel + forefoot available but drop is missing
        if (sneaker.heel_height !== null &&
            sneaker.forefoot_height !== null &&
            sneaker.drop === null) {
            sneaker.drop = (0, utils_1.round2)(sneaker.heel_height - sneaker.forefoot_height);
            logger_1.logger.debug('Calculated drop', {
                brand: sneaker.brand_name,
                model: sneaker.model,
                heel: sneaker.heel_height,
                forefoot: sneaker.forefoot_height,
                drop: sneaker.drop,
            });
        }
        // Set waterproof default: false for trail shoes (if not explicitly set)
        // Trail shoes are usually waterproof only if explicitly mentioned
        // Road shoes don't need waterproof, so keep as null
        if (sneaker.waterproof === null && sneaker.surface_type === 'trail') {
            sneaker.waterproof = false;
            logger_1.logger.debug('Set default waterproof for trail shoe', {
                brand: sneaker.brand_name,
                model: sneaker.model,
                waterproof: sneaker.waterproof,
            });
        }
        return sneaker;
    });
}
/**
 * Validate sneaker has minimum required fields
 */
function isValidSneaker(sneaker) {
    // Must have brand and model
    if (!sneaker.brand_name || !sneaker.model) {
        logger_1.logger.debug('Invalid sneaker: missing brand or model', {
            brand: sneaker.brand_name,
            model: sneaker.model,
        });
        return false;
    }
    return true;
}
/**
 * Deduplicate sneakers by brand + model (case-insensitive)
 */
function deduplicateSneakers(sneakers) {
    const seen = new Set();
    const unique = [];
    for (const sneaker of sneakers) {
        const key = `${sneaker.brand_name?.toLowerCase()}:${sneaker.model?.toLowerCase()}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(sneaker);
        }
        else {
            logger_1.logger.debug('Duplicate sneaker removed', {
                brand: sneaker.brand_name,
                model: sneaker.model,
            });
        }
    }
    return unique;
}
/**
 * Calculate extraction coverage metrics
 */
function calculateCoverage(sneakers) {
    if (sneakers.length === 0) {
        return {
            totalSneakers: 0,
            averageCoverage: 0,
            fieldCoverage: {},
        };
    }
    const fieldCoverage = {};
    let totalCoverage = 0;
    // All possible fields (excluding brand_name and model which are required)
    const fields = [
        'heel_height',
        'forefoot_height',
        'drop',
        'weight',
        'price',
        'upper_breathability',
        'carbon_plate',
        'waterproof',
        'primary_use',
        'cushioning_type',
        'surface_type',
        'foot_width',
        'additional_features',
    ];
    for (const sneaker of sneakers) {
        let filledCount = 2; // brand_name + model (required)
        for (const field of fields) {
            const value = sneaker[field];
            if (value !== null && value !== undefined) {
                filledCount++;
                fieldCoverage[field] = (fieldCoverage[field] || 0) + 1;
            }
        }
        const coverage = (filledCount / (fields.length + 2)) * 100;
        totalCoverage += coverage;
        logger_1.logger.debug('Sneaker coverage', {
            brand: sneaker.brand_name,
            model: sneaker.model,
            coverage: (0, utils_1.round2)(coverage),
            filled: filledCount,
            total: fields.length + 2,
        });
    }
    const averageCoverage = (0, utils_1.round2)(totalCoverage / sneakers.length);
    return {
        totalSneakers: sneakers.length,
        averageCoverage,
        fieldCoverage,
    };
}
//# sourceMappingURL=orchestrator.js.map