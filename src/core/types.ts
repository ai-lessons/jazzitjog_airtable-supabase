// Core types for sneaker pipeline
// This will contain: ShoeInput, AirtableRecord, PipelineConfig, etc.

export type ShoeInput = {
  article_id: string; // Changed to string to match DB schema
  record_id: string | null;
  brand_name: string;
  model: string;
  model_key: string;

  // Physical specs
  heel_height: number | null;
  forefoot_height: number | null;
  drop: number | null;
  weight: number | null;
  price: number | null;

  // Features
  upper_breathability: "low" | "medium" | "high" | null;
  carbon_plate: boolean | null;
  waterproof: boolean | null;

  // Usage
  primary_use: string | null;
  cushioning_type: "firm" | "balanced" | "max" | null;
  surface_type: "road" | "trail" | null;
  foot_width: "narrow" | "standard" | "wide" | null;

  // Metadata
  additional_features: string | null;
  date: string | null;
  source_link: string | null;
};

export type AirtableRecord = {
  id: string;
  fields: Record<string, any>;
};

export type PipelineConfig = {
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
};
