import Airtable from 'airtable';
import { cfg } from '../config';

const base = new Airtable({ apiKey: cfg.airtable.apiKey }).base(cfg.airtable.baseId);
const tableName = cfg.airtable.tableName;

(async () => {
  try {
    const records = await base(tableName).select({ maxRecords: 1 }).all();
    console.log(`✅ Airtable OK. Таблица "${tableName}", записей получено:`, records.length);
  } catch (e: any) {
    console.error('❌ Ошибка подключения к Airtable:', e?.statusCode || '', e?.message || e);
    console.error('Подсказки: проверьте токен (scopes), Base ID и точное имя таблицы.');
    process.exit(1);
  }
})();
