"use strict";
// src/transform/fields.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.refineModelName = refineModelName;
exports.makeModelKey = makeModelKey;
exports.tightenInput = tightenInput;
exports.normalizeAll = normalizeAll;
/* ---------- нормализация ----------- */
const stripDiacritics = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
const norm = (s) => stripDiacritics(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
/** Уточняет название модели */
function refineModelName(brand, model) {
    const b = (brand || '').trim();
    let m = (model || '').trim();
    // убираем скобки и хвост после ":"/дэша
    m = m.replace(/\((?:[^()]*)\)/g, '').replace(/\s*[:\-–—]\s+.*$/, '').trim();
    // убираем повтор бренда в модели (например, "Asics ASICS Nimbus")
    const bn = norm(b);
    const mn = norm(m);
    if (bn && (mn === bn || mn.startsWith(bn + ' '))) {
        m = m.slice(b.length).trim();
    }
    // убираем общие суффиксы (тестеры, дистанции, общие слова)
    m = m.replace(/\s+(?:multi\s+)?tester\s*$/i, '').trim();
    m = m.replace(/\s+\d+\s+mile\s*$/i, '').trim();
    m = m.replace(/^running\s+/i, '').trim();
    m = m.replace(/\s+running\s*$/i, '').trim();
    m = m.replace(/\s+review\s*$/i, '').trim();
    m = m.replace(/\s+test\s*$/i, '').trim();
    // специальные случаи для брендов
    if (bn === 'decathlon') {
        // Убираем "Kiprun" из названия модели для Decathlon
        m = m.replace(/^kiprun\s+/i, '').trim();
    }
    return m.replace(/\s+/g, ' ').trim();
}
/** Строит ключ модели в формате "brand::model" */
function makeModelKey(brand, model) {
    const b = norm(brand || '');
    const m = norm(model || '');
    if (!b || !m)
        return '';
    return `${b}::${m}`;
}
function toNum(x) {
    if (x === null || x === undefined)
        return null;
    const n = Number(String(x).replace(/[^\d.\-]/g, ''));
    return Number.isFinite(n) ? n : null;
}
function toBoolOrNull(x) {
    return x === true ? true : x === false ? false : null;
}
function toIsoOrNull(x) {
    if (!x)
        return null;
    const d = new Date(x);
    return isNaN(d.getTime()) ? null : d.toISOString();
}
/** Приводит Loose-вход к строгому ShoeInput */
function tightenInput(loose) {
    const article_id_raw = loose.article_id;
    const article_id = toNum(article_id_raw);
    const brand = (loose.brand_name || '').toString().trim();
    const model0 = (loose.model || '').toString().trim();
    const model = refineModelName(brand, model0);
    const model_key = loose.model_key && loose.model_key.includes('::')
        ? loose.model_key
        : makeModelKey(brand, model);
    // обязательные для апсерта
    if (!article_id || !brand || !model || !model_key || !loose.record_id) {
        return null;
    }
    return {
        article_id,
        record_id: loose.record_id ?? null,
        brand_name: brand,
        model,
        model_key,
        upper_breathability: (loose.upper_breathability ?? null),
        carbon_plate: toBoolOrNull(loose.carbon_plate),
        waterproof: toBoolOrNull(loose.waterproof),
        heel_height: toNum(loose.heel_height),
        forefoot_height: toNum(loose.forefoot_height),
        drop: toNum(loose.drop),
        weight: toNum(loose.weight),
        price: toNum(loose.price),
        primary_use: (loose.primary_use ?? null),
        cushioning_type: (loose.cushioning_type ?? null),
        surface_type: (loose.surface_type ?? null),
        foot_width: (loose.foot_width ?? null),
        additional_features: (loose.additional_features ?? null),
        date: toIsoOrNull(loose.date),
        source_link: (loose.source_link ?? null),
    };
}
/** Массовая нормализация для массивов loose-объектов */
function normalizeAll(list) {
    const out = [];
    for (const r of list) {
        const t = tightenInput(r);
        if (t)
            out.push(t);
    }
    return out;
}
//# sourceMappingURL=fields.js.map