export type AirtableRaw = {
    id: string;
    fields: Record<string, any>;
    createdTime: string;
};
export declare function fetchAirtableRows(options?: {
    view?: string;
    max?: number;
}): Promise<AirtableRaw[]>;
//# sourceMappingURL=fetch.d.ts.map