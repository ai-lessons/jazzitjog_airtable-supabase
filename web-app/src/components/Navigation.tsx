'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function Navigation() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      setIsAdmin(session?.user?.user_metadata?.role === 'admin');
      setLoading(false);
    };

    checkAdmin();

    // Listen for auth changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(session?.user?.user_metadata?.role === 'admin');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return null; // Or a skeleton loader
  }

  return (
    <>
      <Link href="/search" className="text-sm opacity-80 hover:opacity-100">
        Search
      </Link>
      {isAdmin && (
        <>
          <Link href="/staging" className="text-sm opacity-80 hover:opacity-100">
            Pending Entries
          </Link>
          <Link href="/logs" className="text-sm opacity-80 hover:opacity-100">
            Activity Log
          </Link>
        </>
      )}
    </>
  );
}
