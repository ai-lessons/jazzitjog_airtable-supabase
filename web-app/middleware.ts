// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // читаем все куки из запроса
        getAll() {
          return req.cookies.getAll();
        },
        // записываем все куки в ответ (чтобы могли обновляться токены)
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            });
          });
        },
      },
    }
  );

  // подтягиваем/освежаем сессию (важно!)
  await supabase.auth.getSession();

  return res;
}

export const config = {
  // применяем ко всем путям, включая /api (кроме статики)
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

