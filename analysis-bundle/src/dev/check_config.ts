import { cfg } from '../config';

console.log('✅ Supabase URL:', cfg.supabase.url);
console.log('✅ Supabase key prefix:', cfg.supabase.serviceRoleKey.slice(0, 12) + '…');
console.log('✅ Airtable base:', cfg.airtable.baseId);
console.log('✅ Airtable table:', cfg.airtable.tableName);
console.log('✅ OpenAI set?:', !!cfg.openai.apiKey);
console.log('✅ Pipeline settings:', cfg.pipeline);

console.log('OK: конфигурация загружена.');
