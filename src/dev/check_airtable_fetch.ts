// src/dev/check_airtable_fetch.ts
import { fetchAirtableRows } from '../airtable/fetch';

(async () => {
  const rows = await fetchAirtableRows({ max: 5 });
  console.log('✅ Получено из Airtable:', rows.length);
  if (rows[0]) {
    console.log('Пример строки:', {
      id: rows[0].id,
      keys: Object.keys(rows[0].fields).slice(0, 8),
      createdTime: rows[0].createdTime,
    });
  }
})();
