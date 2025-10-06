import Airtable from 'airtable';
import { SimpleSneakerParser } from './simple-parser';
import { SimpleDatabase } from './simple-db';
import { extractFromArticle } from './etl/extract';

export interface AirtableRecord {
  id: string;
  fields: {
    [key: string]: any;
  };
}

export interface SyncConfig {
  airtable: {
    apiKey: string;
    baseId: string;
    tableName: string;
  };
  supabase: {
    url: string;
    key: string;
  };
  openai: {
    apiKey: string;
  };
  batchSize?: number;
}

export interface SyncResult {
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
  sneakers_extracted: number;
}

export class SimpleSyncProcessor {
  private parser: SimpleSneakerParser;
  private database: SimpleDatabase;
  private airtable: any;
  private config: SyncConfig;

  constructor(config: SyncConfig) {
    this.config = config;
    this.parser = new SimpleSneakerParser(config.openai.apiKey);
    this.database = new SimpleDatabase(config.supabase.url, config.supabase.key);

    Airtable.configure({ apiKey: config.airtable.apiKey });
    this.airtable = new Airtable().base(config.airtable.baseId);
  }

  async syncFromAirtable(limit?: number): Promise<SyncResult> {
    console.log('🚀 Starting sync from Airtable...');

    const result: SyncResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
      sneakers_extracted: 0,
    };

    try {
      const records = await this.fetchAirtableRecords(limit);
      console.log(`📊 Found ${records.length} records to process`);

      const batchSize = this.config.batchSize || 10;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}`);

        await this.processBatch(batch, result);
      }

      console.log('✅ Sync completed');
      console.log(`📈 Results: ${result.successful}/${result.processed} successful`);
      console.log(`👟 Extracted ${result.sneakers_extracted} sneaker records`);

      if (result.errors.length > 0) {
        console.log(`❌ ${result.failed} failed:`);
        result.errors.forEach(error => console.log(`  - ${error}`));
      }

    } catch (error) {
      console.error('💥 Sync failed:', error);
      result.errors.push(`Sync failed: ${error}`);
    }

    return result;
  }

  async fetchAirtableRecords(limit?: number): Promise<AirtableRecord[]> {
    const records: AirtableRecord[] = [];

    const selectOptions: any = {
      sort: [{ field: 'ID', direction: 'desc' }], // Process newest first
    };

    if (limit && limit > 0) {
      selectOptions.maxRecords = limit;
    }

    const query = this.airtable(this.config.airtable.tableName)
      .select(selectOptions);

    await query.eachPage((pageRecords: any[], fetchNextPage: () => void) => {
      pageRecords.forEach(record => {
        records.push({
          id: record.id,
          fields: record.fields,
        });
      });

      fetchNextPage();
    });

    return records;
  }

  private async processBatch(records: AirtableRecord[], result: SyncResult): Promise<void> {
    const promises = records.map(record => this.processRecord(record, result));
    await Promise.allSettled(promises);
  }

  private async processRecord(record: AirtableRecord, result: SyncResult): Promise<void> {
    result.processed++;

    try {
      const article = this.mapAirtableRecord(record);

      if (!article) {
        result.failed++;
        result.errors.push(`Record ${record.id}: Missing required fields`);
        return;
      }

      console.log(`🔍 Processing: ${article.title.slice(0, 50)}...`);

      // Use ETL extraction pipeline (supports both regex and LLM)
      const extractResult = await extractFromArticle(
        {
          article_id: article.article_id,
          record_id: article.record_id,
          title: article.title,
          content: article.content,
          date: article.date,
          source_link: article.source_link,
        },
        this.config.openai.apiKey
      );

      if (extractResult.sneakers.length === 0) {
        console.log(`⚠️  No sneakers found in: ${article.title}`);
      }

      // Convert ETL sneaker format to SimpleSneakerParser format
      const sneakers = extractResult.sneakers.map(s => ({
        brand: s.brand_name,
        model: s.model,
        use: s.primary_use || undefined,
        surface: s.surface_type || undefined,
        heel: s.heel_height !== null ? s.heel_height : undefined,
        forefoot: s.forefoot_height !== null ? s.forefoot_height : undefined,
        drop: s.drop !== null ? s.drop : undefined,
        weight: s.weight !== null ? s.weight : undefined,
        price: s.price || undefined,
        plate: s.carbon_plate !== null ? s.carbon_plate : undefined,
        waterproof: s.waterproof !== null ? s.waterproof : undefined,
        cushioning: s.cushioning_type || undefined,
        width: s.foot_width || undefined,
        breathability: undefined, // Not extracted
        date: article.date,
        source: article.source_link,
      }));

      const saveResult = await this.database.saveSneakers(
        article.article_id,
        article.record_id,
        sneakers
      );

      result.successful++;
      result.sneakers_extracted += saveResult.success;

      if (saveResult.errors.length > 0) {
        result.errors.push(...saveResult.errors.map(e => `${record.id}: ${e}`));
      }

      console.log(`✅ Saved ${saveResult.success} sneakers for article ${article.article_id}`);

    } catch (error) {
      result.failed++;
      result.errors.push(`Record ${record.id}: ${error}`);
      console.error(`❌ Failed to process record ${record.id}:`, error);
    }
  }

  mapAirtableRecord(record: AirtableRecord): {
    article_id: number;
    record_id: string;
    title: string;
    content: string;
    date?: string;
    source_link?: string;
  } | null {
    const fields = record.fields;

    // Try different field name variations
    const getId = (candidates: string[]) => {
      for (const name of candidates) {
        const value = fields[name];
        if (value !== undefined && value !== null) return value;
      }
      return null;
    };

    const article_id = getId(['ID', 'Id', 'id', 'Article ID', 'ArticleID']);
    const title = getId(['Title', 'title', 'Headline', 'Name']);
    const content = getId(['Content', 'content', 'Text', 'Article', 'Body']);
    const date = getId(['Created', 'Date', 'Published', 'Time created', 'date']);
    const source_link = getId(['Article link', 'URL', 'Link', 'Source', 'url']);

    if (!article_id || !title || !content) {
      return null;
    }

    return {
      article_id: Number(article_id),
      record_id: record.id,
      title: String(title),
      content: String(content),
      date: date ? String(date) : undefined,
      source_link: source_link ? String(source_link) : undefined,
    };
  }

  async getStats() {
    return await this.database.getStats();
  }

  async clearDatabase() {
    return await this.database.clearAll();
  }
}