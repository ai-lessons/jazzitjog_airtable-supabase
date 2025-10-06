// scripts/sync-airtable.js
const Airtable = require('airtable');
const { createClient } = require('@supabase/supabase-js');

console.log('🚀 Starting Airtable to Supabase sync...\n');

// Проверка переменных окружения
const requiredEnvVars = [
  'AIRTABLE_API_KEY',
  'AIRTABLE_BASE_ID',
  'AIRTABLE_TABLE_NAME',
  'SUPABASE_URL',
  'SUPABASE_KEY'
];

console.log('📋 Environment variables check:');
let missingVars = [];
requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`❌ ${varName}: Missing`);
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.error(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Инициализация клиентов
const airtableBase = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Функция синхронизации
async function syncData() {
  try {
    console.log('\n📥 Step 1: Extracting data from Airtable...');
    
    const records = [];
    await airtableBase(process.env.AIRTABLE_TABLE_NAME)
      .select({
        // Фильтр: только новые записи (измените под свои нужды)
        filterByFormula: '{Status} = "New"',
        maxRecords: 100,
        view: 'Grid view'
      })
      .eachPage(
        function page(pageRecords, fetchNextPage) {
          pageRecords.forEach(record => {
            records.push({
              airtable_id: record.id,
              name: record.get('Name'),
              url: record.get('URL'),
              price: record.get('Price'),
              brand: record.get('Brand'),
              size: record.get('Size'),
              color: record.get('Color'),
              status: record.get('Status'),
              created_at: new Date().toISOString()
            });
          });
          fetchNextPage();
        },
        function done(err) {
          if (err) {
            console.error('❌ Airtable error:', err);
            throw err;
          }
        }
      );
    
    console.log(`✅ Found ${records.length} new records\n`);
    
    if (records.length === 0) {
      console.log('ℹ️  No new records to sync');
      return;
    }
    
    // Шаг 2: Transform (опционально - добавьте свою логику)
    console.log('⚙️  Step 2: Transforming data...');
    // Здесь можно добавить валидацию, очистку, обогащение данных
    console.log('✅ Data transformed\n');
    
    // Шаг 3: Load в Supabase
    console.log('📤 Step 3: Loading data to Supabase...');
    
    const { data, error } = await supabase
      .from('sneakers') // Измените на название вашей таблицы
      .upsert(records, {
        onConflict: 'airtable_id' // Измените на вашу уникальную колонку
      });
    
    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    
    console.log(`✅ Successfully synced ${records.length} records to Supabase\n`);
    
    // Опционально: Обновить статус в Airtable
    console.log('🔄 Step 4: Updating Airtable status...');
    for (const record of records) {
      try {
        await airtableBase(process.env.AIRTABLE_TABLE_NAME).update([
          {
            id: record.airtable_id,
            fields: {
              'Status': 'Synced',
              'Synced At': new Date().toISOString()
            }
          }
        ]);
      } catch (err) {
        console.warn(`⚠️  Failed to update record ${record.airtable_id}:`, err.message);
      }
    }
    console.log('✅ Airtable status updated\n');
    
    console.log('🎉 Sync completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    throw error;
  }
}

// Запуск
syncData()
  .then(() => {
    console.log('\n✅ Process completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  });