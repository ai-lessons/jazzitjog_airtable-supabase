"use strict";
// Airtable integration client
// Migrated from: src/airtable/fetch.ts + src/airtable/checkpoint.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirtableClient = void 0;
exports.createAirtableClient = createAirtableClient;
const airtable_1 = __importDefault(require("airtable"));
const logger_1 = require("../../core/logger");
class AirtableClient {
    base;
    tableName;
    constructor(config) {
        airtable_1.default.configure({ apiKey: config.apiKey });
        this.base = new airtable_1.default().base(config.baseId);
        this.tableName = config.tableName;
        logger_1.logger.debug('Airtable client initialized', { baseId: config.baseId, tableName: config.tableName });
    }
    /**
     * Fetch records from Airtable table
     */
    async fetchRecords(options) {
        const view = options?.view || 'Grid view';
        const maxRecords = options?.maxRecords || 100;
        const sort = options?.sort || [{ field: 'ID', direction: 'desc' }];
        logger_1.logger.info('Fetching Airtable records', { view, maxRecords });
        const records = [];
        try {
            await new Promise((resolve, reject) => {
                this.base(this.tableName)
                    .select({
                    view,
                    pageSize: 100,
                    maxRecords,
                    sort,
                })
                    .eachPage((pageRecords, fetchNextPage) => {
                    for (const record of pageRecords) {
                        records.push({
                            id: record.id,
                            fields: record.fields,
                            createdTime: record._rawJson?.createdTime,
                        });
                    }
                    fetchNextPage();
                }, (err) => {
                    if (err) {
                        logger_1.logger.error('Error fetching Airtable records', { error: err });
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
            logger_1.logger.info('Successfully fetched Airtable records', { count: records.length });
            return records;
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch Airtable records', { error });
            throw error;
        }
    }
    /**
     * Fetch single record by ID
     */
    async fetchRecordById(recordId) {
        try {
            const record = await this.base(this.tableName).find(recordId);
            return {
                id: record.id,
                fields: record.fields,
                createdTime: record._rawJson?.createdTime,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch Airtable record by ID', { recordId, error });
            return null;
        }
    }
}
exports.AirtableClient = AirtableClient;
/**
 * Create Airtable client from config
 */
function createAirtableClient(config) {
    return new AirtableClient(config);
}
//# sourceMappingURL=client.js.map