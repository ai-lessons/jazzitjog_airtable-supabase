import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Fallback mock data if database is not accessible
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

function makeMockData(count = 120) {
  const rand = seededRandom(42);
  const BRANDS = ["ASICS", "Nike", "Hoka", "Saucony", "New Balance", "Brooks", "Altra", "On", "Salomon", "Mizuno"];
  const MODELS = ["Mach X", "Kinvara", "GT-2000", "Endorphin Speed", "Pegasus", "Clouddancer", "Cascadia", "SuperComp", "Racer Pro", "Aero Glide"];
  const USES = ["daily trainer", "racing", "tempo", "trail running", "recovery"];
  const SURFACES = ["road", "trail", "track"];
  const CUSHIONING = ["balanced", "max", "firm"];
  const WIDTHS = ["standard", "narrow", "wide"];
  const BREATHABILITY = ["high", "medium", "low"];

  const arr = [];
  for (let i = 0; i < count; i++) {
    const brand = BRANDS[Math.floor(rand() * BRANDS.length)];
    const model = MODELS[Math.floor(rand() * MODELS.length)];
    const use = USES[Math.floor(rand() * USES.length)];
    const surface = SURFACES[Math.floor(rand() * SURFACES.length)];
    const carbon = rand() > 0.7;
    const water = rand() > 0.8;
    const cushioning = CUSHIONING[Math.floor(rand() * CUSHIONING.length)];
    const width = WIDTHS[Math.floor(rand() * WIDTHS.length)];
    const breathability = BREATHABILITY[Math.floor(rand() * BREATHABILITY.length)];
    const heel = Math.floor(26 + rand() * 16); // 26..42
    const drop = Math.floor(4 + rand() * 8); // 4..12
    const fore = heel - drop;
    const weight = Math.floor(180 + rand() * 160); // 180..340g
    const price = Math.floor(90 + rand() * 170); // 90..260
    const day = Math.floor(1 + rand() * 28);
    const month = Math.floor(1 + rand() * 9); // 1..9
    const date = `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    arr.push({
      id: `${i}`,
      brand_name: brand,
      model,
      primary_use: use,
      surface_type: surface,
      carbon_plate: carbon,
      waterproof: water,
      heel_height: heel,
      forefoot_height: fore,
      drop,
      weight,
      price,
      date,
      source_link: `https://example.com/shoe/${i}`,
      cushioning_type: cushioning,
      foot_width: width,
      upper_breathability: breathability,
    });
  }
  return arr;
}

function handleMockData(q: any) {
  const allData = makeMockData(120);

  // Применяем фильтры
  let filtered = allData.filter((item) => {
    if (q.q) {
      const searchText = q.q.toLowerCase();
      const itemText = `${item.brand_name} ${item.model}`.toLowerCase();
      if (!itemText.includes(searchText)) return false;
    }

    if (q.brands?.length && !q.brands.includes(item.brand_name)) return false;
    if (q.surface?.length && !q.surface.includes(item.surface_type)) return false;
    if (q.use?.length && !q.use.includes(item.primary_use)) return false;

    if (q.plate !== 'any') {
      if (q.plate === 'with' && !item.carbon_plate) return false;
      if (q.plate === 'without' && item.carbon_plate) return false;
    }

    if (q.waterproof !== 'any') {
      if (q.waterproof === 'yes' && !item.waterproof) return false;
      if (q.waterproof === 'no' && item.waterproof) return false;
    }

    if (q.cushioning?.length && !q.cushioning.includes(item.cushioning_type)) return false;
    if (q.width?.length && !q.width.includes(item.foot_width)) return false;
    if (q.breathability?.length && !q.breathability.includes(item.upper_breathability)) return false;

    if (item.price < q.priceMin || item.price > q.priceMax) return false;
    if (item.weight < q.weightMin || item.weight > q.weightMax) return false;
    if (item.drop < q.dropMin || item.drop > q.dropMax) return false;

    return true;
  });

  // Сортировка
  const sortMap: Record<string, (a: any, b: any) => number> = {
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    weight_asc: (a, b) => a.weight - b.weight,
    weight_desc: (a, b) => b.weight - a.weight,
    drop_asc: (a, b) => a.drop - b.drop,
    drop_desc: (a, b) => b.drop - a.drop,
  };

  if (sortMap[q.sort]) {
    filtered.sort(sortMap[q.sort]);
  }

  // Пагинация
  const total = filtered.length;
  const from = (q.page - 1) * q.pageSize;
  const to = from + q.pageSize;
  const data = filtered.slice(from, to);

  if (q.csv) {
    const header = ['brand','model','use','surface','heel','forefoot','drop','weight','price','plate','waterproof','date','source'];
    const rows = data.map(r => [
      r.brand_name, r.model, r.primary_use, r.surface_type,
      r.heel_height, r.forefoot_height, r.drop, r.weight,
      r.price, r.carbon_plate ? 'yes' : 'no', r.waterproof ? 'yes' : 'no',
      r.date, r.source_link,
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(v => String(v).replace(/"/g,'""')).map(v => `"${v}"`).join(','))
      .join('\n');

    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="shoes_export.csv"',
      },
    });
  }

  return NextResponse.json({
    total,
    page: q.page,
    pageSize: q.pageSize,
    items: data
  });
}

const Query = z.object({
  q: z.string().trim().optional(),
  surface: z.array(z.enum(['road','trail','track']))
           .or(z.string().transform(s => (s ? s.split(',') : []))).optional(),
  use: z.array(z.string())
       .or(z.string().transform(s => (s ? s.split(',') : []))).optional(),
  brands: z.array(z.string())
          .or(z.string().transform(s => (s ? s.split(',').filter(Boolean) : []))).optional(),
  plate: z.enum(['any','with','without']).default('any'),
  waterproof: z.enum(['any','yes','no']).default('any'),
  cushioning: z.array(z.string())
               .or(z.string().transform(s => (s ? s.split(',') : []))).optional(),
  width: z.array(z.string())
         .or(z.string().transform(s => (s ? s.split(',') : []))).optional(),
  breathability: z.array(z.string())
                 .or(z.string().transform(s => (s ? s.split(',') : []))).optional(),
  priceMin: z.coerce.number().min(50).default(50),
  priceMax: z.coerce.number().max(1000).default(1000),
  weightMin: z.coerce.number().min(100).default(100),
  weightMax: z.coerce.number().max(500).default(500),
  dropMin: z.coerce.number().min(0).default(0),
  dropMax: z.coerce.number().max(20).default(20),
  sort: z.enum(['price_asc','price_desc','weight_asc','weight_desc','drop_asc','drop_desc']).default('price_asc'),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(200).default(50),
  csv: z.coerce.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const q = parsed.data;

  // ответ, в который сложим Set-Cookie при необходимости
  const res = new NextResponse();

  // Validate environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error('[API Search] Missing environment variables:', {
      hasUrl: !!process.env.SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_KEY
    });
    return NextResponse.json(
      { error: 'Server configuration error. Missing database credentials.' },
      { status: 500 }
    );
  }

  // Use service role client to bypass RLS
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  let qb = supabase
    .from('shoe_results')
    .select(
      'id,brand_name,model,primary_use,surface_type,heel_height,forefoot_height,drop,weight,price,carbon_plate,waterproof,date,source_link,cushioning_type,foot_width,upper_breathability',
      { count: 'exact' }
    );

  if (q.q) {
    // Простой поиск по brand_name и model
    qb = qb.or(`brand_name.ilike.%${q.q}%,model.ilike.%${q.q}%`);
  }
  if (q.brands?.length) {
    // Case-insensitive exact match by brand (supports mixed casing in DB)
    const ors = q.brands.map(b => `brand_name.ilike.${b}`).join(',');
    qb = qb.or(ors);
  }
  if (q.surface?.length) qb = qb.in('surface_type', q.surface);
  if (q.use?.length) qb = qb.in('primary_use', q.use);
  if (q.plate !== 'any') qb = qb.eq('carbon_plate', q.plate === 'with');
  if (q.waterproof !== 'any') qb = qb.eq('waterproof', q.waterproof === 'yes');
  if (q.cushioning?.length) qb = qb.in('cushioning_type', q.cushioning);
  if (q.width?.length) qb = qb.in('foot_width', q.width);
  if (q.breathability?.length) qb = qb.in('upper_breathability', q.breathability);

  // Применяем фильтры только если пользователь изменил значения от дефолтных
  // Price - фильтруем только если значения отличаются от дефолтных [50, 1000]
  if (q.priceMin !== 50 || q.priceMax !== 1000) {
    qb = qb.not('price', 'is', null).gte('price', q.priceMin).lte('price', q.priceMax);
  }

  // Weight - фильтруем только если значения отличаются от дефолтных [100, 500]
  if (q.weightMin !== 100 || q.weightMax !== 500) {
    qb = qb.not('weight', 'is', null).gte('weight', q.weightMin).lte('weight', q.weightMax);
  }

  // Drop - фильтруем только если значения отличаются от дефолтных [0, 20]
  if (q.dropMin !== 0 || q.dropMax !== 20) {
    qb = qb.not('drop', 'is', null).gte('drop', q.dropMin).lte('drop', q.dropMax);
  }

  const sortMap: Record<string, [string, boolean]> = {
    price_asc: ['price', true], price_desc: ['price', false],
    weight_asc: ['weight', true], weight_desc: ['weight', false],
    drop_asc: ['drop', true], drop_desc: ['drop', false],
  };
  const [col, asc] = sortMap[q.sort];
  qb = qb.order(col as any, { ascending: asc, nullsFirst: asc });

  const from = (q.page - 1) * q.pageSize;
  const to = from + q.pageSize - 1;
  qb = qb.range(from, to);

  const { data, error, count } = await qb;

  // Service role должен иметь полный доступ, если есть ошибка - логируем её
  if (error) {
    console.error('[API Search] Database error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });

    if (error.message.includes('permission denied')) {
      return NextResponse.json(
        { error: 'Database access error. Please check configuration.' },
        { status: 500, headers: res.headers }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 400, headers: res.headers });
  }

  if (q.csv) {
    const header = ['brand','model','use','surface','heel','forefoot','drop','weight','price','plate','waterproof','cushioning','width','breathability','date','source'];
    const rows = (data ?? []).map(r => [
      r.brand_name ?? '', r.model ?? '', r.primary_use ?? '', r.surface_type ?? '',
      r.heel_height ?? '', r.forefoot_height ?? '', r.drop ?? '', r.weight ?? '',
      r.price ?? '', r.carbon_plate ? 'yes' : 'no', r.waterproof ? 'yes' : 'no',
      r.cushioning_type ?? '', r.foot_width ?? '', r.upper_breathability ?? '',
      r.date ?? '', r.source_link ?? '',
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(v => String(v).replace(/"/g,'""')).map(v => `"${v}"`).join(','))
      .join('\n');

    return new NextResponse(csv, {
      headers: {
        ...Object.fromEntries(res.headers),
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="shoes_export.csv"',
      },
    });
  }

  return NextResponse.json(
    { total: count ?? 0, page: q.page, pageSize: q.pageSize, items: data ?? [] },
    { headers: res.headers }
  );
}
