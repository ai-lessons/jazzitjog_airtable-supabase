"use strict";
// Ingest articles from Airtable
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestFromAirtable = ingestFromAirtable;
const logger_1 = require("../../core/logger");
const metrics_1 = require("../../core/metrics");
const utils_1 = require("../../core/utils");
const title_analysis_1 = require("../extract/title_analysis");
/**
 * Ingest articles from Airtable
 */
async function ingestFromAirtable(client, options) {
    const metrics = (0, metrics_1.getMetrics)();
    logger_1.logger.info('Starting Airtable ingest', { options });
    const result = {
        articles: [],
        total: 0,
        skipped: 0,
        errors: [],
    };
    try {
        const records = await client.fetchRecords({
            view: options?.view,
            maxRecords: options?.maxRecords,
            sort: options?.sort,
        });
        logger_1.logger.info('Fetched Airtable records', { count: records.length });
        for (const record of records) {
            result.total++;
            const article = mapAirtableRecord(record);
            if (!article) {
                result.skipped++;
                metrics.incrementArticlesSkipped();
                continue;
            }
            // Filter: Check if article is about running shoes (two-stage: title → content)
            const isShoeArticle = (0, title_analysis_1.isRunningShoeArticle)(article.title, article.content);
            if (!isShoeArticle) {
                logger_1.logger.info('Skipping non-shoe article', {
                    article_id: article.article_id,
                    title: article.title,
                });
                result.skipped++;
                metrics.incrementArticlesSkipped();
                continue;
            }
            result.articles.push(article);
        }
        logger_1.logger.info('Airtable ingest completed', {
            total: result.total,
            articles: result.articles.length,
            skipped: result.skipped,
        });
        return result;
    }
    catch (error) {
        logger_1.logger.error('Airtable ingest failed', { error });
        result.errors.push(`Ingest failed: ${error}`);
        return result;
    }
}
/**
 * Map Airtable record to IngestArticle
 */
function mapAirtableRecord(record) {
    const fields = record.fields;
    // Try different field name variations
    const getField = (candidates) => {
        for (const name of candidates) {
            const value = fields[name];
            if (value !== undefined && value !== null)
                return value;
        }
        return null;
    };
    const article_id = (0, utils_1.toPositiveInt)(getField(['ID', 'Id', 'id', 'Article ID', 'ArticleID']));
    const title = (0, utils_1.normStr)(getField(['Title', 'title', 'Headline', 'Name']));
    const content = (0, utils_1.normStr)(getField(['Content', 'content', 'Text', 'Article', 'Body']));
    const date = (0, utils_1.normStr)(getField(['Created', 'Date', 'Published', 'Time created', 'date']));
    const source_link = (0, utils_1.normStr)(getField(['Article link', 'URL', 'Link', 'Source', 'url']));
    // Validate required fields
    if (!article_id || !title || !content) {
        logger_1.logger.debug('Skipping record: missing required fields', {
            airtable_id: record.id,
            has_article_id: !!article_id,
            has_title: !!title,
            has_content: !!content,
        });
        return null;
    }
    return {
        article_id,
        airtable_id: record.id,
        title,
        content,
        date,
        source_link,
    };
}
//# sourceMappingURL=from_airtable.js.map