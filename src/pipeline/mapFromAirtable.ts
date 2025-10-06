// src/pipeline/mapFromAirtable.ts
import { normalizeAll, tightenInput, type ShoeInputLoose } from "../transform/fields";
import { fromAirtableToShoeInputs } from "./fromAirtableToShoeInputs";

/**
 * Совместимая обёртка над новым маппером:
 * принимает airtable-записи, возвращает массив строгих ShoeInput.
 */
export async function mapFromAirtable(records: any[]): Promise<ReturnType<typeof fromAirtableToShoeInputs>> {
  // новый конвертер уже возвращает ShoeInput[]
  const rows = await fromAirtableToShoeInputs(records);

  // на случай, если где-то старый код ожидает normalizeAll/tightenInput
  const loose: ShoeInputLoose[] = rows as any;
  const strict = normalizeAll(loose);
  return strict as any;
}

// сохраняем старые именованные экспорты, если кто-то импортировал напрямую
export { normalizeAll, tightenInput };
