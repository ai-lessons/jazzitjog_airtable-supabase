import { exec } from 'child_process';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Ensure Supabase connection URL is available
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase connection details in .env');
  process.exit(1);
}

// Construct psql connection string
const connectionString = `postgresql://postgres:${supabaseServiceRoleKey}@${new URL(supabaseUrl).hostname}:5432/postgres`;

// Path to migration SQL
const migrationPath = './migrations/004_create_article_id_linkage_functions.sql';

// Execute migration
exec(`psql "${connectionString}" -f ${migrationPath}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Migration execution error: ${error}`);
    console.error(`stderr: ${stderr}`);
    process.exit(1);
  }
  
  console.log('RPC Functions Migration executed successfully');
  console.log(stdout);
});
