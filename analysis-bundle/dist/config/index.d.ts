import 'dotenv/config';
/** Единый объект конфигурации */
export declare const cfg: {
    readonly supabase: {
        readonly url: string;
        readonly serviceRoleKey: string;
    };
    readonly airtable: {
        readonly apiKey: string;
        readonly baseId: string;
        readonly tableName: string;
    };
    readonly openai: {
        readonly apiKey: string | null;
    };
    readonly pipeline: {
        readonly syncIntervalMin: number;
        readonly batchSize: number;
        readonly maxParallelRequests: number;
    };
};
export type Config = {
    openai: {
        apiKey: string;
        model: string;
        temperature: number;
        maxTokens: number;
    };
};
export type AppConfig = typeof cfg;
export default function loadConfig(): Config;
//# sourceMappingURL=index.d.ts.map