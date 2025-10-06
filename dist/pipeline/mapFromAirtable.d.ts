import { normalizeAll, tightenInput } from "../transform/fields";
import { fromAirtableToShoeInputs } from "./fromAirtableToShoeInputs";
/**
 * Совместимая обёртка над новым маппером:
 * принимает airtable-записи, возвращает массив строгих ShoeInput.
 */
export declare function mapFromAirtable(records: any[]): Promise<ReturnType<typeof fromAirtableToShoeInputs>>;
export { normalizeAll, tightenInput };
//# sourceMappingURL=mapFromAirtable.d.ts.map