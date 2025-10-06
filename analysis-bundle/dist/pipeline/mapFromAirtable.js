"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapFromAirtable = mapFromAirtable;
// src/pipeline/mapFromAirtable.ts
const dayjs_1 = __importDefault(require("dayjs"));
const deduplication_1 = require("../utils/deduplication");
const sneakerValidation_1 = require("../utils/sneakerValidation");
/** Какие названия полей пробовать для URL и Title */
const URL_FIELD_CANDIDATES = ["URL", "Link", "Source", "Source URL", "FeedUrl", "feed_url"];
const TITLE_FIELD_CANDIDATES = ["New Title", "Title", "Headline"];
/** Достаём первое непустое значение по списку кандидатов */
function pickField(fields, names) {
    for (const n of names) {
        if (n in fields && fields[n] != null && String(fields[n]).trim() !== "") {
            return fields[n];
        }
    }
    return null;
}
/** Нормализуем значение поля URL (строка / массив / объект вложения) */
function normalizeUrl(v) {
    if (!v)
        return null;
    if (typeof v === "string")
        return v.trim();
    if (Array.isArray(v) && v.length) {
        const first = v[0];
        if (typeof first === "string")
            return first.trim();
        if (first && typeof first.url === "string")
            return first.url.trim();
    }
    if (v && typeof v.url === "string")
        return v.url.trim();
    return null;
}
/** Безопасный перевод в ISO или null */
function toISOorNull(v) {
    if (!v)
        return null;
    const d = (0, dayjs_1.default)(v);
    return d.isValid() ? d.toISOString() : null;
}
/** Очень простой разбор бренда/модели из заголовка (для теста) */
function splitBrandModel(title) {
    const t = title.trim();
    if (!t)
        return { brand: "unknown", model: "unknown" };
    const parts = t.split(/\s+/);
    const brand = parts[0] || "unknown";
    const model = parts.slice(1).join(" ") || brand;
    return { brand, model };
}
/** Преобразуем одну запись Airtable к строке shoe_results */
function mapFromAirtable(r) {
    const f = r.fields || {};
    const article_id = String(f.ID ?? r.id).trim();
    const rawUrl = pickField(f, URL_FIELD_CANDIDATES);
    const source_link = normalizeUrl(rawUrl) ??
        // резерв: искусственная ссылка, чтобы (article_id, source_link) были уникальны
        `https://airtable.local/article/${article_id}`;
    // Заголовок → наивно вычленим brand/model
    const title = String(pickField(f, TITLE_FIELD_CANDIDATES) ?? "").trim();
    const { brand, model } = splitBrandModel(title || article_id);
    // Дата: Published → Created → createdTime записи → текущее время
    const dateISO = toISOorNull(f.Published) ??
        toISOorNull(f.Created) ??
        toISOorNull(r.createdTime) ??
        new Date().toISOString();
    // Generate source_id for deduplication
    const sourceId = (0, deduplication_1.generateSourceId)(article_id, source_link, f.Content);
    const row = {
        brand_name: brand,
        model,
        primary_use: null,
        cushioning_type: null,
        heel_height: null,
        forefoot_height: null,
        weight: null,
        foot_width: null,
        drop: null,
        surface_type: null,
        upper_breathability: null,
        carbon_plate: null,
        waterproof: null,
        price: null,
        additional_features: null,
        source_link,
        article_id,
        date: dateISO,
        source_id: sourceId,
    };
    // фильтр на всякий случай
    if (!row.article_id || !row.source_link)
        return null;
    // ЖЕСТКОЕ ПРАВИЛО: только кроссовки попадают в базу
    if (!(0, sneakerValidation_1.shouldIncludeInSneakerDB)(row.brand_name, row.model)) {
        console.log(`❌ Отклонена запись из Airtable: не кроссовки - ${row.brand_name} ${row.model}`);
        return null;
    }
    return row;
}
//# sourceMappingURL=mapFromAirtable.js.map