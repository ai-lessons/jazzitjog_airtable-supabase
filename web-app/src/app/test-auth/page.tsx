'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function TestAuthPage() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabaseBrowser.auth.getSession();
      console.log('Session check:', { session, error });
      setSession(session);
      setLoading(false);
    };

    checkSession();

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>

      {session ? (
        <div>
          <div className="bg-green-100 p-4 rounded mb-4">
            <h2 className="font-semibold text-green-800">✅ Authenticated</h2>
            <div className="mt-2 space-y-1 text-sm">
              <p><strong>Email:</strong> {session.user.email}</p>
              <p><strong>User ID:</strong> {session.user.id}</p>
              <p><strong>Role:</strong> {session.user.user_metadata?.role || 'none'}</p>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold mb-2">Full User Metadata:</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              {JSON.stringify(session.user.user_metadata, null, 2)}
            </pre>
          </div>

          <button
            onClick={() => supabaseBrowser.auth.signOut()}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="bg-red-100 p-4 rounded">
          <h2 className="font-semibold text-red-800">❌ Not Authenticated</h2>
          <p className="mt-2">
            <a href="/login" className="underline">Go to login</a>
          </p>
        </div>
      )}
    </div>
  );
}
