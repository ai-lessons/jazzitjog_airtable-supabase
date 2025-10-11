import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          // для debug не важно что-то писать в ответ, но реализуем корректно
          // (если нужно — можно вернуть NextResponse и проставить Set-Cookie)
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  return NextResponse.json({
    user_id: user?.id ?? null,
    email: user?.email ?? null,
    error: error?.message ?? null,
  });
}
