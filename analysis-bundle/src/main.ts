import 'dotenv/config';
import loadConfig from './config/index.js';
import { SneakerEnricher } from './llm/enrich.js';

async function main() {
  try {
    console.log('🚀 Запуск тестового извлечения данных...');
    
    const config = loadConfig();
    const enricher = new SneakerEnricher(config.openai);

    // Тестовые данные
    const testTitle = "Brooks Ghost 17 Review";
    const testContent = `
      The Brooks Ghost 17 weighs 283 grams and features a 32mm heel height with 20mm forefoot height.
      This daily trainer has a 12mm drop and costs $140. The shoe uses DNA Loft v3 midsole
      with soft cushioning perfect for road running.
    `;

    const results = await enricher.enrichArticle(1, testTitle, testContent, "https://test.com");
    
    console.log('📊 Результаты извлечения:');
    console.log(JSON.stringify(results, null, 2));
    
    console.log('\n📈 Статистика:');
    console.log(enricher.getStats());

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

main().catch(console.error);

