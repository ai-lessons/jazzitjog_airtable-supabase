// Airtable integration client
// Migrated from: src/airtable/fetch.ts + src/airtable/checkpoint.ts

import Airtable from 'airtable';
import type { AirtableRecord, FetchOptions } from './types';
import { logger } from '../../core/logger';

export class AirtableClient {
  private base: any;
  private tableName: string;

  constructor(config: { apiKey: string; baseId: string; tableName: string }) {
    Airtable.configure({ apiKey: config.apiKey });
    this.base = new Airtable().base(config.baseId);
    this.tableName = config.tableName;
    logger.debug('Airtable client initialized', { baseId: config.baseId, tableName: config.tableName });
  }

  /**
   * Fetch records from Airtable table
   */
  async fetchRecords(options?: FetchOptions): Promise<AirtableRecord[]> {
    const view = options?.view || 'Grid view';
    const maxRecords = options?.maxRecords || 100;
    const sort = options?.sort || [{ field: 'ID', direction: 'desc' as const }];

    logger.info('Fetching Airtable records', { view, maxRecords });

    const records: AirtableRecord[] = [];

    try {
      await new Promise<void>((resolve, reject) => {
        this.base(this.tableName)
          .select({
            view,
            pageSize: 100,
            maxRecords,
            sort,
          })
          .eachPage(
            (pageRecords: any[], fetchNextPage: () => void) => {
              for (const record of pageRecords) {
                records.push({
                  id: record.id,
                  fields: record.fields,
                  createdTime: record._rawJson?.createdTime,
                });
              }
              fetchNextPage();
            },
            (err: any) => {
              if (err) {
                logger.error('Error fetching Airtable records', { error: err });
                reject(err);
              } else {
                resolve();
              }
            }
          );
      });

      logger.info('Successfully fetched Airtable records', { count: records.length });
      return records;
    } catch (error) {
      logger.error('Failed to fetch Airtable records', { error });
      throw error;
    }
  }

  /**
   * Fetch single record by ID
   */
  async fetchRecordById(recordId: string): Promise<AirtableRecord | null> {
    try {
      const record = await this.base(this.tableName).find(recordId);
      return {
        id: record.id,
        fields: record.fields,
        createdTime: record._rawJson?.createdTime,
      };
    } catch (error) {
      logger.error('Failed to fetch Airtable record by ID', { recordId, error });
      return null;
    }
  }
}

/**
 * Create Airtable client from config
 */
export function createAirtableClient(config: {
  apiKey: string;
  baseId: string;
  tableName: string;
}): AirtableClient {
  return new AirtableClient(config);
}
