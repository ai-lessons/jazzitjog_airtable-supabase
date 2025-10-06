"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const index_js_1 = __importDefault(require("./config/index.js"));
const enrich_js_1 = require("./llm/enrich.js");
async function main() {
    try {
        console.log('🚀 Запуск тестового извлечения данных...');
        const config = (0, index_js_1.default)();
        const enricher = new enrich_js_1.SneakerEnricher(config.openai);
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
    }
    catch (error) {
        console.error('❌ Ошибка:', error);
    }
}
main().catch(console.error);
//# sourceMappingURL=main.js.map