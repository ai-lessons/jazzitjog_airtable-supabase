// Airtable types

export type AirtableRecord = {
  id: string;
  fields: Record<string, any>;
  createdTime?: string;
};

export type FetchOptions = {
  view?: string;
  maxRecords?: number;
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
};
