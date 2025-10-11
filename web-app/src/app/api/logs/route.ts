import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdminAuth, createServiceClient } from '@/lib/auth-helpers';

export async function GET(req: NextRequest) {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(req);
  if ('error' in authResult) return authResult.error;

  const { response: res } = authResult;
  const supabase = createServiceClient(req, res);

  // Get query params
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '50');

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('approval_logs')
    .select('*', { count: 'exact' })
    .order('approved_at', { ascending: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400, headers: res.headers });
  }

  return NextResponse.json(
    { logs: data ?? [], total: count ?? 0, page, pageSize },
    { headers: res.headers }
  );
}
