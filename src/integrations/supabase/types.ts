// Supabase types

import type { SupabaseClient } from '@supabase/supabase-js';

export type SupabaseClientType = SupabaseClient<any, 'public', any>;

export type RpcCallOptions = {
  sql: string;
};

export type DatabaseConfig = {
  url: string;
  serviceRoleKey: string;
};
