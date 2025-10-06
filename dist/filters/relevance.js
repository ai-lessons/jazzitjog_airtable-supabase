"use strict";
// src/filters/relevance.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectIrrelevant = detectIrrelevant;
// Листиклы/гайдовые/подборки (якорим в начале для высокой точности)
const LISTICLE = /\b^(best|top|our (?:favorite|favourites)|roundup|buying guide|gift guide|right now|top picks|editor(?:'|s)? choice|what to buy)\b/i;
// Одежда/аксессуары/инвентарь (аккуратные word-boundaries + исключения для ASICS GEL)
const APPAREL = new RegExp(String.raw `\b(` +
    [
        // apparel
        `t-?shirt`, `tee`, `shirt`, `shorts?`, `tights?`, `bra`, `singlet`, `jersey`,
        `jacket`, `vest`, `pants`, `trousers`, `hoodie`, `socks?`, `gloves?`,
        `hat`, `beanie`, `cap`, `headband`,
        // аксессуары / инвентарь
        `belt`, `hydration`, `pack`, `backpack`, `poles?`, `watch`, `headlamp`,
        `gaiters?`,
        // питание/тренажёры (без "gel")
        `nutrition`, `treadmill`,
        // доп. «не-обувь»
        `strollers?`, `joggers?`, `stroller`
    ].join(`|`)
    + `)\\b`, 'i');
// Не-кроссовки
const NONSHOE = /\b(sandals?|slides?|slippers?|boots?)\b/i;
// «плохие бренды» — если итоговый brand_name равен одному из них → нерелевант
const BAD_BRAND = /^(best|the|our|editor(?:'|s)?|guide|review|test|from|by|how|why|when|where|never|stability|trail|running|shoes?|type|every|beginners?|stable|fun|delivers?|both|good|great|right|\d+)$/i;
// «плохие модели» — слишком общие или содержащие статейные фразы
const BAD_MODEL = /\b(shoes? for every type of runner|running shoes? for beginners?|shoe that'?s stable and fun|delivers? both|for every type|type of runner|for beginners?|stable and fun)\b/i;
function detectIrrelevant(title, modelKey, model, brand) {
    const hay = `${title || ''} ${modelKey || ''} ${model || ''}`;
    if (LISTICLE.test(hay))
        return { ok: false, reason: 'listicle' };
    if (APPAREL.test(hay))
        return { ok: false, reason: 'apparel' };
    if (NONSHOE.test(hay))
        return { ok: false, reason: 'nonshoe' };
    if (brand && BAD_BRAND.test(String(brand).trim()))
        return { ok: false, reason: 'badbrand' };
    if (model && BAD_MODEL.test(String(model).trim()))
        return { ok: false, reason: 'badmodel' };
    // Проверка длины - отсеиваем слишком длинные названия (характерны для заголовков статей)
    if (brand && String(brand).trim().length > 25)
        return { ok: false, reason: 'badbrand' };
    if (model && String(model).trim().length > 50)
        return { ok: false, reason: 'badmodel' };
    // Проверка на слишком много слов (больше 6 слов в модели = подозрительно)
    if (model && String(model).trim().split(/\s+/).length > 6)
        return { ok: false, reason: 'badmodel' };
    return { ok: true };
}
//# sourceMappingURL=relevance.js.map