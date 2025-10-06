"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SneakerEnricher = void 0;
// @ts-nocheck
const openai_1 = __importDefault(require("openai"));
const schema_1 = require("@/validate/schema");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'sneaker-enricher' });
class SneakerEnricher {
    client;
    config;
    // Статистика для отчетов
    stats = {
        totalCost: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        successfulExtractions: 0,
        failedExtractions: 0,
    };
    // Базовые исключенные бренды
    excludedBrands = new Set([
        'garmin', 'polar', 'suunto', 'fitbit', 'apple', 'samsung',
        'music', 'spotify', 'strava', 'app', 'google', 'amazon',
        'gopro', 'camera', 'video', 'the_north_face', 'patagonia', 'columbia'
    ]);
    constructor(config) {
        this.client = new openai_1.default({ apiKey: config.apiKey });
        this.config = config;
    }
    async enrichArticle(articleId, title, content, articleUrl) {
        try {
            logger.info(`Обрабатываем статью ${articleId}: ${title.slice(0, 50)}...`);
            const preprocessedContent = this.preprocessText(title, content);
            const prompt = this.createPrompt(title, preprocessedContent);
            const response = await this.client.chat.completions.create({
                model: this.config.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: this.config.temperature,
                max_tokens: this.config.maxTokens,
            });
            // Обновляем статистику
            this.updateStats(response.usage);
            const resultText = response.choices[0]?.message?.content?.trim();
            if (!resultText) {
                logger.warn(`Пустой ответ от AI для статьи ${articleId}`);
                return [];
            }
            const extractedData = this.parseJsonResponse(resultText);
            const validatedData = this.validateAndCleanData(extractedData, articleUrl);
            logger.info(`Извлечено ${validatedData.length} валидных моделей из статьи ${articleId}`);
            this.stats.successfulExtractions += validatedData.length;
            return validatedData;
        }
        catch (error) {
            logger.error(`Ошибка при обработке статьи ${articleId}:`, error);
            this.stats.failedExtractions++;
            return [];
        }
    }
    preprocessText(title, content) {
        // Основная предобработка текста
        const combined = `${title}\n\n${content}`;
        // Ищем сравнения
        const comparisons = this.extractComparisons(combined);
        let processed = combined;
        if (comparisons.length > 0) {
            const comparisonContext = `COMPARISONS FOUND: ${comparisons.join(', ')}\n\n`;
            processed = comparisonContext + processed;
        }
        // Ограничиваем длину
        return processed.slice(0, 4500);
    }
    extractComparisons(text) {
        const pattern = /(\w+(?:\s+\w+)*)\s+(?:vs\.?|versus|compared?\s+to)\s+(\w+(?:\s+\w+)*)/gi;
        const matches = text.matchAll(pattern);
        return Array.from(matches, match => `${match[1].trim()} vs ${match[2].trim()}`);
    }
    createPrompt(title, content) {
        return `You are an expert footwear analyst. Extract athletic footwear information from this article.

CRITICAL RULES:
1. Extract ONLY information explicitly mentioned in the text
2. If a field is not mentioned, DO NOT include it in the JSON
3. Use exact values from text, do not interpret or guess

Return ONLY a valid JSON array:

[
  {
    "brand": "brooks",
    "model": "Ghost 17",
    "primary_use": "daily_trainer",
    "cushioning_type": "soft",
    "heel_height": 32,
    "forefoot_height": 20,
    "weight": 283,
    "drop": 12,
    "surface_type": "road",
    "price": 140,
    "additional_features": "DNA Loft v3 midsole"
  }
]

FIELD RULES:
- brand: lowercase brand name
- model: exact model name as mentioned
- weight: in grams (convert oz × 28.35)
- heel_height/forefoot_height: in millimeters  
- drop: in millimeters
- primary_use: daily_trainer|tempo|racing|trail|stability|max_cushion|hiking|walking|trail_walking|water_sports|casual
- cushioning_type: soft|firm|responsive|max|minimal|balanced
- foot_width: narrow|medium|wide|regular
- surface_type: road|trail|mixed|track|water|sand
- upper_breathability: breathable|mesh|knit|standard|engineered mesh|synthetic
- carbon_plate: yes|no|partial
- waterproof: goretex|waterproof|water_resistant|none

IMPORTANT: Omit fields if not explicitly mentioned. Do not use "not mentioned" or similar placeholder values.

Title: ${title}

Article: ${content}`;
    }
    parseJsonResponse(text) {
        try {
            console.log('🔍 Ответ AI (первые 500 символов):', text.slice(0, 500));
            // Очищаем от markdown
            const cleanText = text
                .replace(/```json\s*/gi, '')
                .replace(/```\s*$/g, '')
                .trim();
            console.log('🧹 Очищенный текст:', cleanText.slice(0, 200));
            // Пытаемся парсить как JSON
            if (cleanText.startsWith('[') && cleanText.endsWith(']')) {
                const parsed = JSON.parse(cleanText);
                console.log('✅ Успешно распарсен JSON:', parsed);
                return parsed;
            }
            // Ищем JSON массив в тексте
            const jsonMatch = cleanText.match(/\[(.*?)\]/s);
            if (jsonMatch) {
                const parsed = JSON.parse(`[${jsonMatch[1]}]`);
                console.log('✅ Найден JSON в тексте:', parsed);
                return parsed;
            }
            logger.warn('Не удалось найти валидный JSON в ответе AI');
            console.log('❌ Полный ответ AI:', text);
            return [];
        }
        catch (error) {
            logger.error('Ошибка парсинга JSON:', error);
            console.log('❌ Проблемный текст:', text);
            return [];
        }
    }
    validateAndCleanData(rawData, articleUrl) {
        console.log('🔬 Валидация данных:', rawData);
        const validated = [];
        for (const item of rawData) {
            try {
                console.log('🧪 Проверяем запись:', item);
                // Очищаем поля с "not mentioned" и подобными значениями
                const cleanedItem = this.cleanItemData(item);
                console.log('🧹 Очищенная запись:', cleanedItem);
                // Проверяем исключенные бренды
                const brand = cleanedItem.brand?.toLowerCase()?.trim();
                if (!brand || this.excludedBrands.has(brand)) {
                    console.log(`❌ Отклонена: проблема с брендом ${brand}`);
                    continue;
                }
                // Валидируем через Zod схему
                const validatedItem = schema_1.SneakerDataSchema.parse(cleanedItem);
                console.log('✅ Валидная запись:', validatedItem);
                validated.push(validatedItem);
            }
            catch (error) {
                console.log('❌ Ошибка валидации:', error.message, 'для записи:', item);
                continue;
            }
        }
        return validated;
    }
    cleanItemData(item) {
        const cleaned = { ...item };
        // Удаляем поля с placeholder значениями
        const placeholderValues = ['not mentioned', 'none', 'n/a', 'unknown', ''];
        Object.keys(cleaned).forEach(key => {
            const value = cleaned[key];
            if (typeof value === 'string' && placeholderValues.includes(value.toLowerCase())) {
                delete cleaned[key];
            }
        });
        return cleaned;
    }
    updateStats(usage) {
        if (!usage)
            return;
        this.stats.totalInputTokens += usage.prompt_tokens || 0;
        this.stats.totalOutputTokens += usage.completion_tokens || 0;
        // Приблизительная стоимость для gpt-4o-mini
        const inputCost = (usage.prompt_tokens || 0) * 0.00015 / 1000;
        const outputCost = (usage.completion_tokens || 0) * 0.0006 / 1000;
        this.stats.totalCost += inputCost + outputCost;
    }
    getStats() {
        return { ...this.stats };
    }
    resetStats() {
        this.stats = {
            totalCost: 0,
            totalInputTokens: 0,
            totalOutputTokens: 0,
            successfulExtractions: 0,
            failedExtractions: 0,
        };
    }
}
exports.SneakerEnricher = SneakerEnricher;
//# sourceMappingURL=enrich.js.map