// src/test-record-117.ts - Анализ записи с ID 117
import 'dotenv/config';
import { fetchAirtableRows } from './airtable/fetch';
import { SneakerEnricher } from './llm/enrich';
import loadConfig from './config/index';

async function analyzeRecord117() {
  try {
    console.log('🔍 Ищем запись с ID 117...\n');

    // Получаем все записи из Airtable
    const records = await fetchAirtableRows({ max: 500 });
    console.log(`📊 Получено ${records.length} записей из Airtable`);

    // Ищем запись с ID 117
    const targetRecord = records.find(r => {
      const id = r.fields.ID || r.fields.id || r.id;
      return String(id) === '117';
    });

    if (!targetRecord) {
      console.log('❌ Запись с ID 117 не найдена');

      // Покажем первые несколько ID для справки
      console.log('\n📋 Доступные ID (первые 10):');
      records.slice(0, 10).forEach(r => {
        const id = r.fields.ID || r.fields.id || r.id;
        const title = r.fields.Title || r.fields['New Title'] || 'No title';
        console.log(`  ID: ${id}, Title: ${String(title).slice(0, 50)}...`);
      });
      return;
    }

    console.log('✅ Найдена запись с ID 117!\n');

    // Анализируем содержимое
    const fields = targetRecord.fields;
    const title = fields.Title || fields['New Title'] || 'No title';
    const content = fields.Content || 'No content';
    const url = fields.URL || fields.Link || fields['Article link'] || 'No URL';

    console.log('📝 Информация о записи:');
    console.log(`Title: ${title}`);
    console.log(`URL: ${url}`);
    console.log(`Content length: ${content.length} символов`);
    console.log(`Content preview: ${String(content).slice(0, 200)}...\n`);

    // Используем SneakerEnricher для извлечения кроссовок
    const config = loadConfig();
    if (!config.openai.apiKey) {
      console.log('❌ Нет OPENAI_API_KEY, пропускаем AI анализ');
      return;
    }

    const enricher = new SneakerEnricher(config.openai);

    console.log('🤖 Запускаем AI анализ для извлечения кроссовок...');
    const extractedSneakers = await enricher.enrichArticle(
      117,
      String(title),
      String(content),
      String(url)
    );

    console.log('\n📊 Результаты извлечения:');
    console.log(`Извлечено кроссовок: ${extractedSneakers.length}`);

    if (extractedSneakers.length > 0) {
      console.log('\n👟 Найденные кроссовки:');
      extractedSneakers.forEach((sneaker, index) => {
        console.log(`\n${index + 1}. ${sneaker.brand_name} ${sneaker.model}`);
        console.log(`   Использование: ${sneaker.primary_use || 'не указано'}`);
        console.log(`   Вес: ${sneaker.weight ? sneaker.weight + 'г' : 'не указан'}`);
        console.log(`   Цена: ${sneaker.price ? '$' + sneaker.price : 'не указана'}`);
        console.log(`   Дроп: ${sneaker.drop ? sneaker.drop + 'мм' : 'не указан'}`);
        if (sneaker.additional_features) {
          console.log(`   Особенности: ${sneaker.additional_features}`);
        }
      });
    } else {
      console.log('❌ Кроссовки не найдены или отфильтрованы валидацией');
    }

    // Показываем статистику
    console.log('\n📈 Статистика AI:');
    console.log(enricher.getStats());

  } catch (error) {
    console.error('❌ Ошибка при анализе записи:', error);
  }
}

analyzeRecord117().catch(console.error);