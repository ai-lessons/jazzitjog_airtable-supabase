// src/airtable/fetch.ts
import Airtable from 'airtable';
import { cfg } from '../config';

export type AirtableRaw = {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
};

export async function fetchAirtableRows(options?: { view?: string; max?: number }) {
  const view = options?.view || 'Grid view';
  const max = options?.max || 100;

  const base = new Airtable({ apiKey: cfg.airtable.apiKey }).base(cfg.airtable.baseId);
  const table = base(cfg.airtable.tableName);

  const rows: AirtableRaw[] = [];

  await new Promise<void>((resolve, reject) => {
    table
      .select({ view, pageSize: 100, maxRecords: max })
      .eachPage(
        (records, next) => {
          for (const r of records) {
            rows.push({
              id: r.id,
              fields: r.fields,
              createdTime: (r as any)._rawJson.createdTime,
            });
          }
          next();
        },
        (err) => (err ? reject(err) : resolve())
      );
  });

  return rows;
}
