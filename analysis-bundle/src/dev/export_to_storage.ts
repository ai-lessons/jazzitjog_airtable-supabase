// src/dev/export_to_storage.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// 1) Клиент с service_role (только на сервере!)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// 2) Какие колонки кладём в CSV (под вашу таблицу)
const COLUMNS = [
  'brand_name','model','primary_use','cushioning_type',
  'heel_height','forefoot_height','weight','foot_width','drop','surface_type',
  'upper_breathability','carbon_plate','waterproof','price',
  'additional_features','source_link','article_id','date'
] as const;

type Row = Record<(typeof COLUMNS)[number], any>;

// 3) Простой CSV-форматтер (без внешних пакетов)
function toCsv(rows: Row[], columns = COLUMNS): Buffer {
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    // экранируем кавычки и переносы строк
    const q = s.replace(/"/g, '""');
    return `"${q}"`;
  };

  const header = columns.map(esc).join(',');
  const lines = rows.map(r => columns.map(c => esc(r[c])).join(','));
  const csv = [header, ...lines].join('\r\n');
  return Buffer.from(csv, 'utf8');
}

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  // YYYYMMDD_HHMMSS без двоеточий (удобно для имён файлов)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

(async () => {
  // 4) Параметры поиска (можно менять по необходимости)
  const params = {
    p_q: null as string | null,                 // текстовый поиск
    p_brands: null as string[] | null,          // например: ['Nike','Asics']
    p_surface_types: null as string[] | null,   // например: ['road','trail']
    p_carbon: null as boolean | null,           // true/false/null
    p_waterproof: null as boolean | null,
    p_price_min: null as number | null,
    p_price_max: null as number | null,
    p_date_from: null as string | null,         // '2025-01-01'
    p_date_to: null as string | null,           // '2025-12-31'
    p_limit: 1000,
    p_offset: 0
  };

  // 5) Тянем данные через RPC (использует нашу вьюху v_shoes_latest)
  const { data, error } = await supabase.rpc('search_shoes', params);

  if (error) {
    console.error('RPC error:', error);
    process.exit(1);
  }
  const rows = (data ?? []) as any[];

  console.log(`Найдено строк: ${rows.length}`);

  // 6) Приведём строки к нужным колонкам (и типам)
  const prepared: Row[] = rows.map((r: any) => ({
    brand_name: r.brand_name ?? '',
    model: r.model ?? '',
    primary_use: r.primary_use ?? '',
    cushioning_type: r.cushioning_type ?? '',
    heel_height: r.heel_height ?? '',
    forefoot_height: r.forefoot_height ?? '',
    weight: r.weight ?? '',
    foot_width: r.foot_width ?? '',
    drop: r.drop ?? '',
    surface_type: r.surface_type ?? '',
    upper_breathability: r.upper_breathability ?? '',
    carbon_plate: r.carbon_plate ?? '',
    waterproof: r.waterproof ?? '',
    price: r.price ?? '',
    additional_features: r.additional_features ?? '',
    source_link: r.source_link ?? '',
    article_id: r.article_id ?? '',
    date: r.date ? String(r.date).slice(0, 10) : '',
  }));

  const buf = toCsv(prepared);

  // 7) Имя файла в бакете
  const key = `exports/shoes-export_${nowStamp()}.csv`; // папка exports внутри бакета

  // 8) Загрузка в приватный бакет 'exports'
  const upload = await supabase.storage
    .from('exports')
    .upload(key, buf, { contentType: 'text/csv', upsert: false });

  if (upload.error) {
    console.error('Upload error:', upload.error);
    process.exit(1);
  }

  console.log('✅ Файл загружен в Storage:', key);

  // 9) (Опционально) подпишем ссылку на 7 дней — удобно проверить вручную
  const signed = await supabase.storage.from('exports').createSignedUrl(key, 60 * 60 * 24 * 7);
  if (signed.error) {
    console.warn('Не удалось создать подписанную ссылку:', signed.error.message);
  } else {
    console.log('Временная ссылка (7 дней):', signed.data.signedUrl);
  }
})();
