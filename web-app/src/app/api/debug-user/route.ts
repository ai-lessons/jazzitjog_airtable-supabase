import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
  const res = new NextResponse();

  // Check cookies
  const allCookies = req.cookies.getAll();
  const supabaseCookies = allCookies.filter(c => c.name.includes('supabase'));

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

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session) {
    return NextResponse.json(
      {
        authenticated: false,
        error: error?.message || 'No session',
        debug: {
          totalCookies: allCookies.length,
          supabaseCookies: supabaseCookies.map(c => ({
            name: c.name,
            hasValue: !!c.value,
            valueLength: c.value?.length || 0
          })),
          env: {
            hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          }
        }
      },
      { headers: res.headers }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        metadata: session.user.user_metadata,
        role: session.user.user_metadata?.role,
      },
    },
    { headers: res.headers }
  );
}
