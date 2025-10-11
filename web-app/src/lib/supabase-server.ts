// src/lib/supabase-server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Создаёт серверный клиент Supabase для Server Components (Next 15).
 * cookies() в Next 15 — async, поэтому обязательно await.
 * set/remove оставляем заглушками — в RSC они не используются.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies(); // Promise<ReadonlyRequestCookies>

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() { /* no-op in RSC */ },
        remove() { /* no-op in RSC */ },
      },
    }
  );
}
