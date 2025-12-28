/**
 * Environment Configuration
 * 
 * Centralized management of environment variables with type safety
 */
export const env = {
  // OpenAI Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',

  // Supabase Configuration
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // ETL Configuration
  DISABLE_LLM: process.env.DISABLE_LLM === 'true',
  MAX_RECORDS: process.env.MAX_RECORDS 
    ? parseInt(process.env.MAX_RECORDS, 10) 
    : null,

  // Airtable Legacy Configuration (for potential cleanup)
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY || '',
  AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID || '',
};

// Optional: Type definition for environment configuration
export interface EnvConfig {
  OPENAI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  DISABLE_LLM: boolean;
  MAX_RECORDS: number | null;
  AIRTABLE_API_KEY: string;
  AIRTABLE_BASE_ID: string;
}
