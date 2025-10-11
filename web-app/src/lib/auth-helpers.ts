import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

/**
 * Verify admin authentication for API routes
 * Returns session if authenticated as admin, otherwise throws/returns error response
 */
export async function verifyAdminAuth(req: NextRequest) {
  const res = new NextResponse();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { session }, error: authError } = await supabase.auth.getSession();

  if (authError || !session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const userRole = session.user.user_metadata?.role;
  if (userRole !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }) };
  }

  return { session, response: res };
}

/**
 * Create Supabase service role client (for admin operations)
 * Uses standard client (not SSR) to bypass RLS with service_role key
 */
export function createServiceClient(req: NextRequest, res: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Prefer service role key; fallback to legacy SUPABASE_KEY if present
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (!key) {
    console.error('[AUTH] Missing SUPABASE_SERVICE_ROLE_KEY for service client');
    throw new Error('Missing SUPABASE service role key');
  }

  // Use standard client for service role (bypasses RLS)
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
