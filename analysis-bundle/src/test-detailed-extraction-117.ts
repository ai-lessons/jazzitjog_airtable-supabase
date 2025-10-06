// src/test-detailed-extraction-117.ts - Детальный анализ записи 117
import 'dotenv/config';
import { fetchAirtableRows } from './airtable/fetch';
import OpenAI from 'openai';
import loadConfig from './config/index';

async function detailedAnalysis117() {
  try {
    console.log('🔍 Детальный анализ записи ID 117...\n');

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
    console.log(`📊 Размер контента: ${content.length} символов\n`);

    // Улучшенный промпт для более детального извлечения
    const enhancedPrompt = `You are an expert sneaker analyst. Extract ALL SNEAKERS/RUNNING SHOES from this comprehensive review article with COMPLETE information.

CRITICAL INSTRUCTIONS:
1. Extract EVERY sneaker model mentioned in the article - don't skip any
2. For each model, extract ALL available technical specifications
3. Look for information throughout the ENTIRE article, not just the beginning
4. Include ALL brands: Nike, Adidas, Brooks, Asics, Hoka, New Balance, Puma, Saucony, etc.
5. Extract COMPLETE data sets - weight, drop, height, price, etc.

REQUIRED OUTPUT: Complete JSON array with ALL models found.

For each sneaker, extract these fields if mentioned:
- brand (lowercase)
- model (exact name)
- primary_use (daily_trainer/racing/trail/etc)
- cushioning_type (soft/firm/responsive/etc)
- heel_height (in mm)
- forefoot_height (in mm)
- weight (in grams - convert oz to grams: oz × 28.35)
- foot_width (narrow/medium/wide)
- drop (in mm)
- surface_type (road/trail/mixed)
- upper_breathability (breathable/mesh/knit/etc)
- carbon_plate (yes/no/partial)
- waterproof (goretex/waterproof/water_resistant/none)
- price (in USD)
- additional_features (key technologies/features)

IMPORTANT:
- Scan the ENTIRE article, not just excerpts
- Extract EVERY model with ANY available data
- Don't skip models with partial information
- Look for comparison tables, specification lists, detailed reviews

Title: ${title}

Article Content: ${content}`;

    const config = loadConfig();
    const client = new OpenAI({ apiKey: config.openai.apiKey });

    console.log('🤖 Запускаем улучшенный AI анализ...');

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: enhancedPrompt }],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const resultText = response.choices[0]?.message?.content?.trim();
    console.log('\n📄 Полный ответ AI:');
    console.log(resultText);

    // Парсим результат
    let extractedData = [];
    try {
      const cleanText = resultText
        ?.replace(/```json\s*/gi, '')
        .replace(/```\s*$/g, '')
        .trim();

      if (cleanText?.startsWith('[') && cleanText.endsWith(']')) {
        extractedData = JSON.parse(cleanText);
      }
    } catch (e) {
      console.log('❌ Ошибка парсинга JSON');
    }

    console.log(`\n📊 Итого извлечено моделей: ${extractedData.length}`);

    if (extractedData.length > 0) {
      console.log('\n👟 Все найденные кроссовки:');
      extractedData.forEach((sneaker: any, index: number) => {
        console.log(`\n${index + 1}. ${sneaker.brand?.toUpperCase()} ${sneaker.model}`);

        const specs = [];
        if (sneaker.weight) specs.push(`Вес: ${sneaker.weight}г`);
        if (sneaker.drop) specs.push(`Дроп: ${sneaker.drop}мм`);
        if (sneaker.heel_height) specs.push(`Пятка: ${sneaker.heel_height}мм`);
        if (sneaker.forefoot_height) specs.push(`Носок: ${sneaker.forefoot_height}мм`);
        if (sneaker.price) specs.push(`Цена: $${sneaker.price}`);
        if (sneaker.primary_use) specs.push(`Тип: ${sneaker.primary_use}`);
        if (sneaker.cushioning_type) specs.push(`Амортизация: ${sneaker.cushioning_type}`);
        if (sneaker.surface_type) specs.push(`Покрытие: ${sneaker.surface_type}`);

        if (specs.length > 0) {
          console.log(`   ${specs.join(' | ')}`);
        }

        if (sneaker.additional_features) {
          console.log(`   💡 ${sneaker.additional_features}`);
        }
      });

      // Анализ полноты данных
      console.log('\n📈 Анализ полноты данных:');
      const modelsWithFullData = extractedData.filter((s: any) =>
        s.weight && s.drop && s.price && s.primary_use
      );
      console.log(`✅ Модели с полными данными: ${modelsWithFullData.length}`);

      const modelsWithPartialData = extractedData.filter((s: any) =>
        !s.weight || !s.drop || !s.price || !s.primary_use
      );
      console.log(`⚠️  Модели с неполными данными: ${modelsWithPartialData.length}`);
    }

    console.log('\n💰 Стоимость запроса:');
    if (response.usage) {
      const inputCost = (response.usage.prompt_tokens || 0) * 0.00015 / 1000;
      const outputCost = (response.usage.completion_tokens || 0) * 0.0006 / 1000;
      console.log(`Входящие токены: ${response.usage.prompt_tokens}`);
      console.log(`Исходящие токены: ${response.usage.completion_tokens}`);
      console.log(`Общая стоимость: $${(inputCost + outputCost).toFixed(6)}`);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

detailedAnalysis117().catch(console.error);