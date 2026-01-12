// Ingest articles from Supabase table "JazzItJog_db"

import type { SupabaseClient } from '../../integrations/supabase/client';
import type { IngestArticle, IngestResult, IngestOptions } from './types';
import { logger } from '../../core/logger';
import { getMetrics } from '../../core/metrics';
import { normStr, toPositiveInt } from '../../core/utils';
import { isRunningShoeArticle } from '../extract/title_analysis';

/**
 * Ingest articles from Supabase table "JazzItJog_db"
 * 
 * Maps:
 * - ID (numeric) → article_id
 * - Title → title
 * - Content → content
 * - Published (optional) → date
 * 
 * Filters out rows with NULL/empty Content
 */
export async function ingestFromSupabaseArticles(
  client: SupabaseClient,
  options?: IngestOptions
): Promise<IngestResult> {
  const metrics = getMetrics();
  logger.info('Starting Supabase ingest from JazzItJog_db', { options });

  let nullSourceLinkCount = 0;

  const result: IngestResult = {
    articles: [],
    total: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Build query
    let query = client
      .from('JazzItJog_db')
      .select('ID, Title, Content, Published, "Article link"')
      .not('Content', 'is', null) // Filter out NULL content
      .order('Published', { ascending: false }); // Order by Published DESC

    // Apply limit if specified
    if (options?.maxRecords) {
      query = query.limit(options.maxRecords);
    }

    // Execute query
    const { data: records, error } = await query;

    if (error) {
      logger.error('Supabase query failed', { error: error.message });
      result.errors.push(`Query failed: ${error.message}`);
      return result;
    }

    if (!records || records.length === 0) {
      logger.info('No articles found in JazzItJog_db');
      return result;
    }

    logger.info('Fetched JazzItJog_db records', { count: records.length });

    // Process each record
    for (const record of records) {
      result.total++;

      const article = mapSupabaseRecord(record);

      if (!article) {
        result.skipped++;
        metrics.incrementArticlesSkipped();
        continue;
      }

      if (article.source_link === null) {
        nullSourceLinkCount++;
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

    // Log summary with article_id range
    const articleIds = result.articles.map(a => a.article_id);
    const minId = articleIds.length > 0 ? Math.min(...articleIds) : null;
    const maxId = articleIds.length > 0 ? Math.max(...articleIds) : null;

    logger.info('Supabase ingest completed', {
      total: result.total,
      articles: result.articles.length,
      skipped: result.skipped,
      null_source_link_count: nullSourceLinkCount,
      article_id_range: articleIds.length > 0 ? { min: minId, max: maxId } : null,
    });

    return result;
  } catch (error) {
    logger.error('Supabase ingest failed', { error });
    result.errors.push(`Ingest failed: ${error}`);
    return result;
  }
}

/**
 * Map Supabase record to IngestArticle
 * 
 * Expected columns:
 * - ID (numeric) - primary key
 * - Title (string) - article title
 * - Content (string) - article body
 * - Published (string, optional) - publication date
 */
function mapSupabaseRecord(record: any): IngestArticle | null {
  const article_id = toPositiveInt(record.ID);
  const title = normStr(record.Title);
  const content = normStr(record.Content);
  const date = normStr(record.Published);
  const source_link = normStr(record['Article link']);

  if (!article_id || !title || !content) {
    logger.debug('Skipping record: missing required fields', {
      id: record.ID,
      has_article_id: !!article_id,
      has_title: !!title,
      has_content: !!content,
    });
    return null;
  }

  return {
    article_id,
    airtable_id: String(article_id),
    title,
    content,
    date,
    source_link, // <-- теперь URL прокидывается
  };
}
