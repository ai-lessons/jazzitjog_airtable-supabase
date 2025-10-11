#!/usr/bin/env node
// Sneaker Pipeline CLI
// Usage examples:
//   pnpm sync -- --limit=100 --dry-run
//   tsx src/cli/index.ts sync-airtable --limit=50

import 'dotenv/config';
import { runPipeline } from '../etl/run';
import type { PipelineConfig } from '../etl/run';

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v === undefined) {
        // boolean flag
        args[k] = true;
      } else {
        args[k] = v;
      }
    }
  }
  return args;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const flags = parseArgs(rest);

  switch (command) {
    case 'sync-airtable':
    case 'sync':
      await runSync(flags);
      break;
    case 'help':
    default:
      showHelp();
  }
}

function showHelp() {
  console.log(`\nSneaker Pipeline CLI\n\nCommands:\n  sync-airtable [--limit=N] [--dry-run]  Run ETL from Airtable to Supabase\n  help                                 Show this help\n\nExamples:\n  pnpm sync -- --limit=100\n  tsx src/cli/index.ts sync-airtable --dry-run\n`);
}

async function runSync(flags: Record<string, string | boolean>) {
  const maxRecords = flags['limit'] ? parseInt(String(flags['limit']), 10) : undefined;
  const dryRun = flags['dry-run'] === true;
  const upsertConcurrency = flags['upsert-concurrency'] ? parseInt(String(flags['upsert-concurrency']), 10) : undefined;

  const config: PipelineConfig = {
    airtable: {
      apiKey: process.env.AIRTABLE_API_KEY || '',
      baseId: process.env.AIRTABLE_BASE_ID || '',
      tableName: process.env.AIRTABLE_TABLE_NAME || 'Articles',
    },
    database: {
      url: process.env.SUPABASE_URL || '',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '',
    },
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    maxRecords,
    dryRun,
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    upsertConcurrency,
  };

  // Basic validation
  const missing: string[] = [];
  if (!config.airtable.apiKey) missing.push('AIRTABLE_API_KEY');
  if (!config.airtable.baseId) missing.push('AIRTABLE_BASE_ID');
  if (!config.database.url) missing.push('SUPABASE_URL');
  if (!config.database.serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!config.openaiApiKey) missing.push('OPENAI_API_KEY');

  if (missing.length) {
    console.error('Missing required env vars:', missing.join(', '));
    process.exitCode = 1;
    return;
  }

  await runPipeline(config);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
