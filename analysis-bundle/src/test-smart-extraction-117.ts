// src/test-smart-extraction-117.ts - Умный анализ записи 117
import 'dotenv/config';
import { fetchAirtableRows } from './airtable/fetch';
import OpenAI from 'openai';
import loadConfig from './config/index';

async function smartAnalysis117() {
  try {
    console.log('🔍 Умный анализ записи ID 117...\n');

    // Получаем запись
    const records = await fetchAirtableRows({ max: 500 });
    const targetRecord = records.find(r => String(r.fields.ID || r.id) === '117');

    if (!targetRecord) {
      console.log('❌ Запись не найдена');
      return;
    }

    const content = String(targetRecord.fields.Content || '');
    const title = String(targetRecord.fields.Title || targetRecord.fields['New Title'] || '');

    console.log(`📝 Анализируем: ${title}`);
    console.log(`📊 Размер контента: ${content.length} символов`);

    // Предварительный анализ содержимого
    console.log('\n🔍 Предварительный анализ содержимого:');

    // Ищем упоминания брендов
    const brands = ['brooks', 'nike', 'adidas', 'asics', 'hoka', 'new balance', 'puma', 'saucony', 'mizuno', 'on', 'altra'];
    const foundBrands = brands.filter(brand =>
      content.toLowerCase().includes(brand)
    );
    console.log(`👟 Найденные бренды: ${foundBrands.join(', ')}`);

    // Ищем числовые характеристики
    const weightMatches = content.match(/\b\d+(\.\d+)?\s*(g|grams?|oz|ounces?)\b/gi) || [];
    const dropMatches = content.match(/\b\d+(\.\d+)?\s*mm\s*(drop|дроп)\b/gi) || [];
    const priceMatches = content.match(/\$\d+/g) || [];

    console.log(`⚖️  Веса найдено: ${weightMatches.length} (${weightMatches.slice(0, 3).join(', ')}...)`);
    console.log(`📏 Дропов найдено: ${dropMatches.length} (${dropMatches.slice(0, 3).join(', ')}...)`);
    console.log(`💰 Цен найдено: ${priceMatches.length} (${priceMatches.slice(0, 5).join(', ')}...)`);

    // Разбиваем контент на управляемые части
    const maxChunkSize = 8000; // Безопасный размер для GPT-4o-mini
    const chunks = [];

    for (let i = 0; i < content.length; i += maxChunkSize) {
      chunks.push(content.slice(i, i + maxChunkSize));
    }

    console.log(`\n📄 Разбито на ${chunks.length} частей для анализа`);

    const config = loadConfig();
    const client = new OpenAI({ apiKey: config.openai.apiKey });

    let allExtracted: any[] = [];
    let totalCost = 0;

    // Анализируем каждую часть
    for (let i = 0; i < chunks.length; i++) {
      console.log(`\n🤖 Анализируем часть ${i + 1}/${chunks.length}...`);

      const chunkPrompt = `Extract ALL sneakers/running shoes from this part of a comprehensive shoe review article.

EXTRACT EVERY MODEL with ANY available specifications. Look for:
- Brand and model names
- Weight (in grams or oz)
- Drop (in mm)
- Heel/forefoot height (in mm)
- Price (in USD)
- Cushioning type
- Surface type
- Technologies/features

Return ONLY valid JSON array:

Article part: ${chunks[i]}`;

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: chunkPrompt }],
        temperature: 0.1,
        max_tokens: 2000,
      });

      // Подсчет стоимости
      if (response.usage) {
        const inputCost = (response.usage.prompt_tokens || 0) * 0.00015 / 1000;
        const outputCost = (response.usage.completion_tokens || 0) * 0.0006 / 1000;
        totalCost += inputCost + outputCost;
      }

      const resultText = response.choices[0]?.message?.content?.trim();

      // Парсим результат
      try {
        const cleanText = resultText
          ?.replace(/```json\s*/gi, '')
          .replace(/```\s*$/g, '')
          .trim();

        if (cleanText?.startsWith('[') && cleanText.endsWith(']')) {
          const chunkData = JSON.parse(cleanText);
          allExtracted.push(...chunkData);
          console.log(`✅ Извлечено ${chunkData.length} моделей из части ${i + 1}`);
        } else {
          console.log(`⚠️  Часть ${i + 1}: некорректный JSON`);
        }
      } catch (e) {
        console.log(`❌ Часть ${i + 1}: ошибка парсинга`);
      }
    }

    // Дедупликация по brand + model
    const uniqueModels = [];
    const seen = new Set();

    for (const model of allExtracted) {
      const key = `${model.brand || 'unknown'}::${model.model || 'unknown'}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueModels.push(model);
      }
    }

    console.log(`\n📊 Итого после дедупликации: ${uniqueModels.length} уникальных моделей`);
    console.log(`💰 Общая стоимость: $${totalCost.toFixed(6)}`);

    if (uniqueModels.length > 0) {
      console.log('\n👟 Все найденные кроссовки:');

      // Сортируем по полноте данных
      const sortedModels = uniqueModels.sort((a, b) => {
        const scoreA = [a.weight, a.drop, a.price, a.primary_use].filter(x => x).length;
        const scoreB = [b.weight, b.drop, b.price, b.primary_use].filter(x => x).length;
        return scoreB - scoreA; // Сначала более полные
      });

      sortedModels.forEach((sneaker: any, index: number) => {
        const completeness = [sneaker.weight, sneaker.drop, sneaker.price, sneaker.primary_use].filter(x => x).length;
        const status = completeness >= 3 ? '✅' : completeness >= 2 ? '⚠️' : '❌';

        console.log(`\n${index + 1}. ${status} ${sneaker.brand?.toUpperCase() || 'UNKNOWN'} ${sneaker.model || 'Unknown Model'}`);

        const specs = [];
        if (sneaker.weight) specs.push(`Вес: ${sneaker.weight}г`);
        if (sneaker.drop) specs.push(`Дроп: ${sneaker.drop}мм`);
        if (sneaker.heel_height) specs.push(`Пятка: ${sneaker.heel_height}мм`);
        if (sneaker.price) specs.push(`Цена: $${sneaker.price}`);
        if (sneaker.primary_use) specs.push(`Тип: ${sneaker.primary_use}`);

        if (specs.length > 0) {
          console.log(`   ${specs.join(' | ')}`);
        }

        if (sneaker.additional_features) {
          console.log(`   💡 ${sneaker.additional_features}`);
        }
      });

      // Статистика полноты
      const fullData = sortedModels.filter(s => s.weight && s.drop && s.price);
      const partialData = sortedModels.filter(s => !s.weight || !s.drop || !s.price);

      console.log(`\n📈 Анализ данных:`);
      console.log(`✅ Полные данные (вес+дроп+цена): ${fullData.length}`);
      console.log(`⚠️  Частичные данные: ${partialData.length}`);
      console.log(`📊 Средняя полнота данных: ${((fullData.length / uniqueModels.length) * 100).toFixed(1)}%`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

smartAnalysis117().catch(console.error);