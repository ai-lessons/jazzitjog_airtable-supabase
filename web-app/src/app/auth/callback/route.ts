import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const code = requestUrl.searchParams.get('code');

  console.log('[AUTH CALLBACK] Params:', {
    hasCode: !!code,
    hasTokenHash: !!token_hash,
    type
  });

  const response = NextResponse.redirect(new URL('/', requestUrl.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          console.log('[AUTH CALLBACK] Setting cookies:', cookiesToSet.length);
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              // Ensure cookies are accepted on http in local dev
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            });
          });
        },
      },
    }
  );

  // Handle PKCE flow (new format with code)
  if (code) {
    console.log('[AUTH CALLBACK] Using PKCE flow');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.log('[AUTH CALLBACK] PKCE Error:', error.message);
      return NextResponse.redirect(new URL('/login?error=' + error.message, requestUrl.origin));
    }

    console.log('[AUTH CALLBACK] PKCE Success, user:', data.user?.email);
    return response;
  }

  // Handle magic link flow (old format with token_hash)
  if (token_hash && type) {
    console.log('[AUTH CALLBACK] Using magic link flow');
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });

    if (error) {
      console.log('[AUTH CALLBACK] Magic link Error:', error.message);
      return NextResponse.redirect(new URL('/login?error=' + error.message, requestUrl.origin));
    }

    console.log('[AUTH CALLBACK] Magic link Success, user:', data.user?.email);
    return response;
  }

  // No valid params
  console.log('[AUTH CALLBACK] No valid params, redirecting to login');
  return NextResponse.redirect(new URL('/login?error=invalid_link', requestUrl.origin));
}
