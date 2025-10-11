'use client';

import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useEffect, useState } from 'react';
import Search from '@/components/Search';

export default function Home() {
  const supabase = supabaseBrowser;
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Подхватываем сессию из браузера после magic link
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) { try { const r = await fetch('/api/debug-user', { cache: 'no-store' }); const j = await r.json(); if (j?.authenticated && j?.user?.email) { setUserEmail(j.user.email); setUserId(j.user.id); return; } } catch {} }
      if (!mounted) return;
      setUserEmail(user?.email ?? null);
      setUserId(user?.id ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) { try { const r = await fetch('/api/debug-user', { cache: 'no-store' }); const j = await r.json(); if (j?.authenticated && j?.user?.email) { setUserEmail(j.user.email); setUserId(j.user.id); return; } } catch {} }
      setUserEmail(user?.email ?? null);
      setUserId(user?.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <h2 className="font-semibold mb-2">Session</h2>
        {userEmail ? (
          <div className="text-sm">
            Signed in as <b>{userEmail}</b>
            {userId && <div className="text-gray-500 mt-1">User ID: {userId}</div>}
            <div className="mt-2">
              <a className="underline" href="/api/auth/signout">Sign out</a>
            </div>
          </div>
        ) : (
          <div className="text-sm">
            Not signed in. Go to <Link className="underline" href="/login">/login</Link>.
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <h2 className="font-semibold mb-3">Search</h2>
        <Search />
      </div>
    </div>
  );
}

