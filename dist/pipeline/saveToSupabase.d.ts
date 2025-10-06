import { type ShoeInput, type ShoeRow } from "../transform/fields";
export default function saveToSupabase(rows: ShoeInput[] | ShoeRow[] | any[]): Promise<{
    written: number;
}>;
//# sourceMappingURL=saveToSupabase.d.ts.map