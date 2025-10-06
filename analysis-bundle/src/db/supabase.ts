import { createClient } from '@supabase/supabase-js';
import { cfg } from '../config';

export const supabaseAdmin = createClient(
  cfg.supabase.url,
  cfg.supabase.serviceRoleKey,
  { auth: { persistSession: false } }
);
