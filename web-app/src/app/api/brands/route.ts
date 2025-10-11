import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
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

  // Get all unique brands with counts
  const { data, error } = await supabase
    .from('shoe_results')
    .select('brand_name')
    .not('brand_name', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Count brands (case-insensitive, but preserve canonical form)
  const brandMap = new Map<string, { name: string; count: number }>();

  data?.forEach(item => {
    if (item.brand_name) {
      const lowerName = item.brand_name.toLowerCase();

      if (brandMap.has(lowerName)) {
        // Increment count
        const existing = brandMap.get(lowerName)!;
        existing.count++;
      } else {
        // Use the original name as canonical (first occurrence)
        brandMap.set(lowerName, { name: item.brand_name, count: 1 });
      }
    }
  });

  // Convert to array and sort alphabetically
  const brands = Array.from(brandMap.values())
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return NextResponse.json({ brands });
}
