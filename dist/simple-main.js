#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const simple_sync_1 = require("./simple-sync");
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    // Configuration from environment
    const config = {
        airtable: {
            apiKey: process.env.AIRTABLE_API_KEY,
            baseId: process.env.AIRTABLE_BASE_ID,
            tableName: process.env.AIRTABLE_TABLE_NAME,
        },
        supabase: {
            url: process.env.SUPABASE_URL,
            key: process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
        openai: {
            apiKey: process.env.OPENAI_API_KEY,
        },
        batchSize: Number(process.env.BATCH_SIZE) || 10,
    };
    // Validate configuration
    const missing = [];
    if (!config.airtable.apiKey)
        missing.push('AIRTABLE_API_KEY');
    if (!config.airtable.baseId)
        missing.push('AIRTABLE_BASE_ID');
    if (!config.airtable.tableName)
        missing.push('AIRTABLE_TABLE_NAME');
    if (!config.supabase.url)
        missing.push('SUPABASE_URL');
    if (!config.supabase.key)
        missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!config.openai.apiKey)
        missing.push('OPENAI_API_KEY');
    if (missing.length > 0) {
        console.error('❌ Missing environment variables:', missing.join(', '));
        process.exit(1);
    }
    const processor = new simple_sync_1.SimpleSyncProcessor(config);
    try {
        switch (command) {
            case 'sync':
                await handleSync(processor, args);
                break;
            case 'stats':
                await handleStats(processor);
                break;
            case 'test':
                await handleTest(processor, args);
                break;
            case 'clear-db':
                await handleClearDb(processor);
                break;
            case 'help':
            default:
                showHelp();
                break;
        }
    }
    catch (error) {
        console.error('💥 Command failed:', error);
        process.exit(1);
    }
}
async function handleSync(processor, args) {
    const limitArg = args.find(arg => arg.startsWith('--limit='));
    const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;
    console.log('🔄 Starting Airtable → Database sync...');
    if (limit) {
        console.log(`📊 Processing max ${limit} records`);
    }
    const result = await processor.syncFromAirtable(limit);
    console.log('\n📈 Sync Summary:');
    console.log(`✅ Successful: ${result.successful}`);
    console.log(`❌ Failed: ${result.failed}`);
    console.log(`👟 Sneakers extracted: ${result.sneakers_extracted}`);
    if (result.errors.length > 0) {
        console.log('\n🚨 Errors:');
        result.errors.slice(0, 10).forEach(error => console.log(`  ${error}`));
        if (result.errors.length > 10) {
            console.log(`  ... and ${result.errors.length - 10} more errors`);
        }
    }
}
async function handleStats(processor) {
    console.log('📊 Fetching database statistics...');
    const stats = await processor.getStats();
    console.log('\n📈 Database Stats:');
    console.log(`📝 Total records: ${stats.total_records}`);
    console.log(`👟 Unique models: ${stats.unique_models}`);
    console.log(`🏷️  Brands: ${stats.brands.length}`);
    if (stats.brands.length > 0) {
        console.log('\n🏷️  Brand list:');
        stats.brands.sort().forEach(brand => console.log(`  - ${brand}`));
    }
}
async function handleTest(processor, args) {
    console.log('🧪 Running test sync with 5 records...');
    const result = await processor.syncFromAirtable(5);
    console.log('\n🧪 Test Results:');
    console.log(`✅ Processed: ${result.processed}`);
    console.log(`👟 Extracted: ${result.sneakers_extracted}`);
    if (result.errors.length > 0) {
        console.log('\n❌ Test errors:');
        result.errors.forEach(error => console.log(`  ${error}`));
    }
    else {
        console.log('\n🎉 Test completed successfully!');
    }
}
async function handleClearDb(processor) {
    console.log('🗑️  Clearing database...');
    console.log('⚠️  This will delete ALL records from shoe_results table!');
    const result = await processor.clearDatabase();
    if (result.success) {
        console.log(`✅ Successfully deleted ${result.deleted_count} records`);
    }
    else {
        console.log(`❌ Failed to clear database: ${result.error}`);
    }
}
function showHelp() {
    console.log(`
🚀 Simple Sneaker Pipeline

Commands:
  sync [--limit=N]    Sync articles from Airtable to database
  test               Run test sync with 5 records
  stats              Show database statistics
  clear-db           Clear all records from database
  help               Show this help message

Examples:
  npm run simple sync              # Sync all records
  npm run simple sync --limit=100  # Sync max 100 records
  npm run simple test              # Test with 5 records
  npm run simple stats             # Show stats

Environment variables required:
  AIRTABLE_API_KEY
  AIRTABLE_BASE_ID
  AIRTABLE_TABLE_NAME
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  OPENAI_API_KEY
  BATCH_SIZE (optional, default: 10)
`);
}
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=simple-main.js.map