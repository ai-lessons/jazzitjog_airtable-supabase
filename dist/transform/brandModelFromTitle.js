"use strict";
// src/transform/brandModelFromTitle.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.brandModelFromTitle = brandModelFromTitle;
// Слова, которые не должны попадать в бренд/модель (многоязычные варианты «обзор», «тест», и пр.)
const STOP_WORDS = [
    'review', 'first look', 'first impressions', 'hands-on', 'test', 'rtr review',
    'превью', 'обзор', 'тест', 'первый взгляд',
    'beoordeling', 'recensie', 'recension', 'recensione', 'avis',
    'analyse', 'analysis', 'prueba', 'testbericht',
    'in depth'
];
// Предлоги к префиксам на разных языках (после них идёт бренд)
const PREF_PREPS = [
    'of', 'van', 'von', 'vom', 'sur', 'sobre',
    'de', 'del', 'della', 'dei', 'delle', 'du', 'des', 'der', 'den', 'das',
    'la', 'le', 'los', 'las', 'el', "l'"
];
// Вводные/детерминативы и предлоги в начале заголовка
const STOP_HEAD = /\b(a|an|the|this|that|these|those|our|my|your|le|la|les|un|une|el|los|las|der|die|das|from|by|how|why|when|where|never|always|best)\b/i;
// Шум вокруг модели после бренда
const AFTER_NOISE = /\b(the|a|an|that|that's|is|are|was|were|will|can|could|should|delivers?|brings?|makes?|isn'?t|aren'?t|yep|yes|no|but|and|or|with|without)\b/i;
// Бренды, у которых артикль — часть названия
const HEAD_WHITELIST = [
    /^the\s+north\s+face\b/i,
    /^la\s+sportiva\b/i,
    /^mount\s+to\s+coast\b/i
];
// Базовый список брендов (fallback-поиск)
const KNOWN_BRANDS = [
    'Asics', 'Nike', 'Adidas', 'Brooks', 'Hoka', 'Saucony', 'New Balance', 'On', 'Puma', 'Mizuno',
    'Salomon', 'Altra', 'Reebok', 'Inov-8', 'Skechers', 'Under Armour', 'Topo Athletic', 'Karhu', 'Craft',
    '361', '361°', 'Merrell', 'Norda', 'NNormal', 'Kiprun', 'Decathlon', 'Scott', 'Diadora', 'Vibram',
    'Tracksmith', 'La Sportiva', 'Mount to Coast', 'Kailas', 'Li-Ning', 'Li Ning'
];
// Явные двусловные бренды в голове
const MULTIWORD_BRANDS_HEAD = [
    ['Li', 'Ning', 'Li-Ning'],
    ['Under', 'Armour', 'Under Armour'],
    ['New', 'Balance', 'New Balance'],
    ['La', 'Sportiva', 'La Sportiva'],
];
const HELPERS_SECOND = /^(North|Face|Sportiva|Balance|One|Athletic|Armour)$/i;
function toTitleCase(s) {
    return s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
}
function cleanTitle(raw) {
    if (!raw)
        return '';
    let s = raw.replace(/\s+/g, ' ').trim();
    if (s && s === s.toUpperCase())
        s = toTitleCase(s);
    return s;
}
function stripLeadingPrefix(s) {
    const pfx = STOP_WORDS.join('|');
    const preps = PREF_PREPS.join('|');
    const re = new RegExp(`^(?:${pfx})\\b(?:\\s+(?:${preps})\\b)?\\s*(?:[:\\-–—])?\\s*`, 'i');
    return s.replace(re, '');
}
function stripTrailingReviewWords(s) {
    const re = new RegExp(`\\s+(?:${STOP_WORDS.join('|')})\\.?$`, 'i');
    return s.replace(re, '').trim();
}
function titleTokens(s) {
    return s.split(' ').filter(Boolean);
}
function refineModel(model) {
    let m = model.replace(/\((?:[^()]*)\)/g, '').trim();
    m = m.replace(/\s+(?:review|обзор|test|beoordeling|recensie|recension|recensione|in depth)$/i, '').trim();
    m = m.replace(/\s*[:\-–—]\s+.*$/, '').trim();
    return m;
}
function startsWithWhitelistedBrand(s) {
    return HEAD_WHITELIST.some(rx => rx.test(s));
}
function stripInitialNoise(s) {
    let t = s.trim();
    let guard = 0;
    while (guard++ < 5) {
        const before = t;
        t = t.replace(/^[A-Za-zÀ-ÿ]+(?:['’ʼ]s)\b\s+/i, '').trim(); // Nils’s / Kurt's
        t = t.replace(/^(?:top\s*)?\d+[.)]?\s+/i, '').trim(); // "9.", "Top 10 "
        t = t.replace(/^no\.\s*\d+\s+/i, '').trim(); // "No. 3 "
        if (!startsWithWhitelistedBrand(t)) {
            t = t.replace(new RegExp(`^${STOP_HEAD.source}\\s+`, 'i'), '').trim();
        }
        if (t === before)
            break;
    }
    return t;
}
// Fallback: бренд в любом месте строки
function findKnownBrandAnywhere(s) {
    let bestIdx = Infinity;
    let bestBrand = null;
    for (const b of KNOWN_BRANDS) {
        const re = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i');
        const m = re.exec(s);
        if (m && m.index < bestIdx) {
            bestIdx = m.index;
            bestBrand = m[0];
        }
    }
    if (!bestBrand)
        return null;
    const after = s.slice(bestIdx + bestBrand.length).trim();
    return { brand: toTitleCase(bestBrand), after };
}
// Вытащить «модельную группу» из хвоста после бренда.
// Берём первые подряд идущие токены, которые выглядят как модель (буквы/цифры/дефисы/слэши),
// и останавливаемся на служебных словах/глаголах.
function extractModelFromAfter(afterRaw) {
    if (!afterRaw)
        return null;
    // убираем вводные «the/that’s/is/…» сразу после бренда
    let s = afterRaw.replace(/^\s*(?:the|a|an|that|that's|is|are|was|were)\b\s*/i, '').trim();
    if (!s)
        return null;
    const tokens = s.split(/\s+/);
    const modelTokens = [];
    const isModelish = (t) => /^[A-Za-z0-9][A-Za-z0-9\-\/]*$/.test(t);
    for (const tok of tokens) {
        if (AFTER_NOISE.test(tok))
            break;
        if (!isModelish(tok))
            break;
        modelTokens.push(tok);
        // ограничим длину модели 1..4 токенами, чтобы не тянуть «Delivers Both»
        if (modelTokens.length >= 4)
            break;
    }
    const raw = modelTokens.join(' ').trim();
    return raw ? refineModel(raw) : null;
}
// Нормализация некоторых моделей под единый ключ (точечные правила)
function canonicalizeModel(brand, model) {
    const b = brand.toLowerCase();
    // Требование: Asics "GT-2000 14" → "GT-2000"
    if (b === 'asics') {
        const m = model.trim();
        const m1 = m.match(/\b(gt[-\s]?2000)\b/i);
        if (m1)
            return 'GT-2000';
    }
    // Li-Ning: допустим "Feidian 5 Elite" остаётся как есть
    return model;
}
// Эвристика многословного бренда в начале
function splitBrandModelFromHead(headRaw) {
    let s = stripInitialNoise(headRaw);
    const tokens = titleTokens(s);
    if (tokens.length < 2) {
        const fb = findKnownBrandAnywhere(s);
        if (fb) {
            const modelA = extractModelFromAfter(fb.after) || refineModel(fb.after);
            return { brand: fb.brand, model: modelA || null };
        }
        return { brand: null, model: null };
    }
    // Mount to Coast
    if (tokens[0].toLowerCase() === 'mount' && tokens[1]?.toLowerCase() === 'to' && tokens[2]?.toLowerCase() === 'coast') {
        const brand = 'Mount to Coast';
        const model = tokens.slice(3).join(' ').trim();
        if (!model)
            return { brand: null, model: null };
        return { brand, model: refineModel(model) };
    }
    // Явные двусловные бренды
    for (const [w1, w2, brandCanonical] of MULTIWORD_BRANDS_HEAD) {
        if (tokens[0].toLowerCase() === w1.toLowerCase() && tokens[1]?.toLowerCase() === w2.toLowerCase()) {
            const model = tokens.slice(2).join(' ').trim();
            if (!model)
                return { brand: null, model: null };
            return { brand: brandCanonical, model: refineModel(model) };
        }
    }
    // Общий случай
    let brand = tokens[0];
    let start = 1;
    if (HELPERS_SECOND.test(tokens[1])) {
        brand = `${tokens[0]} ${tokens[1]}`;
        start = 2;
        if (tokens[2] && HELPERS_SECOND.test(tokens[2])) {
            brand = `${brand} ${tokens[2]}`;
            start = 3;
        }
    }
    let model = tokens.slice(start).join(' ').trim();
    // Если начало не похоже на бренд — ищем бренд где-то дальше
    if (!model || STOP_HEAD.test(brand)) {
        const fb = findKnownBrandAnywhere(s);
        if (fb) {
            const m = extractModelFromAfter(fb.after) || refineModel(fb.after);
            return { brand: fb.brand, model: m || null };
        }
    }
    if (!model)
        return { brand: null, model: null };
    return { brand: brand.trim(), model: refineModel(model) };
}
/**
 * Примеры:
 * "Shoe That's Stable and Fun? Yep, the Asics GT-2000 14 Delivers Both"
 *    → brand="Asics", model="GT-2000"
 * "Nils’s Puma Fast-R Nitro 3 In Depth"            → brand="Puma",        model="Fast-R Nitro 3"
 * "Kurt's Mizuno Wave Sky 9 Review"                → brand="Mizuno",      model="Wave Sky 9"
 * "Li Ning Feidian 5 Elite Review"                 → brand="Li-Ning",     model="Feidian 5 Elite"
 * "Beoordeling: New Balance SC Elite V5: …"        → brand="New Balance", model="SC Elite V5"
 * "Test des Mount to Coast T1 – …"                 → brand="Mount to Coast", model="T1"
 */
function brandModelFromTitle(rawTitle) {
    let t = cleanTitle(rawTitle);
    if (!t)
        return { brand: null, model: null, confidence: 0 };
    t = stripLeadingPrefix(t);
    const parts = t.split(/(?:\s+[-–—]\s+|:\s*)/);
    if (parts.length >= 2) {
        const leftRaw = parts[0].trim();
        const rightRaw = parts.slice(1).join(' - ').trim();
        const left = stripTrailingReviewWords(leftRaw);
        const head = left || rightRaw;
        const bm = splitBrandModelFromHead(head);
        if (bm.brand && bm.model) {
            const canon = canonicalizeModel(bm.brand, bm.model);
            return { brand: bm.brand, model: canon, confidence: 0.95 };
        }
        if (/\s/.test(rightRaw)) {
            const canon = canonicalizeModel(left || '', refineModel(rightRaw));
            return { brand: left || null, model: canon, confidence: 0.7 };
        }
    }
    const bm2 = splitBrandModelFromHead(t);
    if (bm2.brand && bm2.model) {
        const canon = canonicalizeModel(bm2.brand, bm2.model);
        return { brand: bm2.brand, model: canon, confidence: 0.8 };
    }
    return { brand: null, model: null, confidence: 0 };
}
//# sourceMappingURL=brandModelFromTitle.js.map