// Ingest articles from Airtable

import type { AirtableClient, AirtableRecord } from '../../integrations/airtable';
import type { IngestArticle, IngestResult, IngestOptions } from './types';
import { logger } from '../../core/logger';
import { getMetrics } from '../../core/metrics';
import { normStr, toPositiveInt } from '../../core/utils';
import { isRunningShoeArticle } from '../extract/title_analysis';

/**
 * Ingest articles from Airtable
 */
export async function ingestFromAirtable(
  client: AirtableClient,
  options?: IngestOptions
): Promise<IngestResult> {
  const metrics = getMetrics();
  logger.info('Starting Airtable ingest', { options });

  const result: IngestResult = {
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

    logger.info('Fetched Airtable records', { count: records.length });

    for (const record of records) {
      result.total++;

      const article = mapAirtableRecord(record);

      if (!article) {
        result.skipped++;
        metrics.incrementArticlesSkipped();
        continue;
      }

      // Filter: Check if article is about running shoes (two-stage: title → content)
      const isShoeArticle = isRunningShoeArticle(article.title, article.content);

      if (!isShoeArticle) {
        logger.info('Skipping non-shoe article', {
          article_id: article.article_id,
          title: article.title,
        });
        result.skipped++;
        metrics.incrementArticlesSkipped();
        continue;
      }

      result.articles.push(article);
    }

    logger.info('Airtable ingest completed', {
      total: result.total,
      articles: result.articles.length,
      skipped: result.skipped,
    });

    return result;
  } catch (error) {
    logger.error('Airtable ingest failed', { error });
    result.errors.push(`Ingest failed: ${error}`);
    return result;
  }
}

/**
 * Map Airtable record to IngestArticle
 */
function mapAirtableRecord(record: AirtableRecord): IngestArticle | null {
  const fields = record.fields;

  // Try different field name variations
  const getField = (candidates: string[]) => {
    for (const name of candidates) {
      const value = fields[name];
      if (value !== undefined && value !== null) return value;
    }
    return null;
  };

  const article_id = toPositiveInt(getField(['ID', 'Id', 'id', 'Article ID', 'ArticleID']));
  const title = normStr(getField(['Title', 'title', 'Headline', 'Name']));
  const content = normStr(getField(['Content', 'content', 'Text', 'Article', 'Body']));
  const date = normStr(getField(['Created', 'Date', 'Published', 'Time created', 'date']));
  const source_link = normStr(getField(['Article link', 'URL', 'Link', 'Source', 'url']));

  // Validate required fields
  if (!article_id || !title || !content) {
    logger.debug('Skipping record: missing required fields', {
      record_id: record.id,
      has_article_id: !!article_id,
      has_title: !!title,
      has_content: !!content,
    });
    return null;
  }

  return {
    article_id,
    record_id: record.id,
    title,
    content,
    date,
    source_link,
  };
}
