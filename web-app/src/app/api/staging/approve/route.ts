import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdminAuth, createServiceClient } from '@/lib/auth-helpers';

// Test GET handler
export async function GET(req: NextRequest) {
  console.log('GET /api/staging/approve called');
  return NextResponse.json({ message: 'Approve endpoint is working' });
}

function generateModelKey(brand: string | null, model: string | null): string | null {
  if (!brand || !model) return null;
  const norm = (s: string) => s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  const b = norm(brand);
  const m = norm(model);
  if (!b || !m) return null;
  return `${b} ${m}`;
}

export async function POST(req: NextRequest) {
  console.log('=== Approve POST handler called ===');

  // Verify admin authentication
  console.log('Verifying admin auth...');
  const authResult = await verifyAdminAuth(req);
  if ('error' in authResult) {
    console.error('Auth failed');
    return authResult.error;
  }

  console.log('Auth successful, user:', authResult.session.user.email);
  const { session, response: res } = authResult;
  const supabase = createServiceClient(req, res);

  try {
    const body = await req.json();
    const { itemIds } = body; // Array of staging item IDs to approve

    console.log('Approve request received:', { itemIds });

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      console.error('Invalid itemIds:', itemIds);
      return NextResponse.json({ error: 'Invalid itemIds' }, { status: 400, headers: res.headers });
    }

    // 1. Fetch items to approve
    const { data: stagingItems, error: fetchError } = await supabase
      .from('staging_table')
      .select('*')
      .in('id', itemIds);

    console.log('Fetched staging items:', { count: stagingItems?.length, error: fetchError });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: `Fetch failed: ${fetchError.message}` }, { status: 500, headers: res.headers });
    }

    if (!stagingItems || stagingItems.length === 0) {
      console.error('No items found for IDs:', itemIds);
      return NextResponse.json({ error: 'Items not found' }, { status: 404, headers: res.headers });
    }

    // 2. Prepare items for shoe_results (keep airtable_id for duplicate prevention)
    function normalizeDate(input: any): string | null {
      if (!input) return null;
      const s = String(input).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const ts = Date.parse(s);
      if (isNaN(ts)) return null;
      const d = new Date(ts);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    const shoeItems = stagingItems.map(item => {
      const { id, created_at, is_edited, is_running_shoe, ...shoeData } = item as any;
      // Ensure model_key exists for shoe_results
      const model_key = generateModelKey(shoeData.brand_name ?? null, shoeData.model ?? null);
      const date = normalizeDate(shoeData.date ?? null);
      return { ...shoeData, model_key, date };
    });

    console.log('Prepared shoe items:', { count: shoeItems.length, firstItem: shoeItems[0] });

    // 3. Insert into shoe_results
    const { error: insertError } = await supabase
      .from('shoe_results')
      .insert(shoeItems);

    if (insertError) {
      console.error('Insert error:', insertError);

      // Check if it's a duplicate error
      if (insertError.code === '23505' && insertError.message?.includes('shoe_results_airtable_brand_model_key')) {
        return NextResponse.json({
          error: 'Duplicate entries detected: These items have already been approved from the same Airtable record. Please check shoe_results table.'
        }, { status: 409, headers: res.headers });
      }

      return NextResponse.json({ error: `Insert failed: ${insertError.message}` }, { status: 500, headers: res.headers });
    }

    console.log('Successfully inserted items into shoe_results');

    // 4. Delete from staging_table
    const { error: deleteError } = await supabase
      .from('staging_table')
      .delete()
      .in('id', itemIds);

    if (deleteError) {
      console.error('Failed to delete from staging:', deleteError);
      // Continue anyway, items are already in shoe_results
    }

    // 5. Calculate brand counts
    const brandCounts: Record<string, number> = {};
    stagingItems.forEach(item => {
      if (item.brand_name) {
        brandCounts[item.brand_name] = (brandCounts[item.brand_name] || 0) + 1;
      }
    });

    // 6. Get total count in shoe_results
    const { count: totalCount } = await supabase
      .from('shoe_results')
      .select('*', { count: 'exact', head: true });

    // 7. Log approval
    const { error: logError } = await supabase
      .from('approval_logs')
      .insert({
        approved_by: session.user.id,
        total_approved: stagingItems.length,
        brand_counts: brandCounts,
        total_in_shoe_results: totalCount ?? 0,
        metadata: { item_ids: itemIds },
      });

    if (logError) {
      console.error('Failed to log approval:', logError);
    }

    // 8. Send email notification
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notify-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalApproved: stagingItems.length,
          brandCounts,
          totalInShoeResults: totalCount ?? 0,
        }),
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(
      {
        success: true,
        approved: stagingItems.length,
        brandCounts,
        totalInShoeResults: totalCount ?? 0,
      },
      { headers: res.headers }
    );
  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: res.headers }
    );
  }
}
