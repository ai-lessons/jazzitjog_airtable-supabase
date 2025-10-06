// src/dev/upsert_from_airtable.ts
import { fetchAirtableRows } from "../airtable/fetch";
import { mapFromAirtable } from "../pipeline/mapFromAirtable";
import { upsertResultsBatch } from "../db/upsertResults";

(async () => {
  // возьмём 20 для теста; можно менять
  const raw = await fetchAirtableRows({ max: 20 });

  const mapped = raw.map(mapFromAirtable).filter((x): x is NonNullable<typeof x> => !!x);

  console.log("Всего получено из Airtable:", raw.length);
  console.log("Готово к записи (после маппинга):", mapped.length);

  if (!mapped.length) {
    console.log("Нет подходящих строк для записи. Проверьте поля URL/ID/Title в Airtable.");
    process.exit(0);
  }

  await upsertResultsBatch(mapped, 500);
  console.log("✅ Upsert в Supabase завершён:", mapped.length);
})();
