'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function DebugContent() {
  const searchParams = useSearchParams();

  const allParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    allParams[key] = value;
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Auth Debug - URL Parameters</h1>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-semibold mb-2">All URL Parameters:</h2>
        {Object.keys(allParams).length > 0 ? (
          <pre className="text-xs overflow-auto">
            {JSON.stringify(allParams, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-500">No parameters found</p>
        )}
      </div>

      <div className="mt-4 bg-blue-100 p-4 rounded">
        <h2 className="font-semibold mb-2">Full URL:</h2>
        <code className="text-xs break-all">{window.location.href}</code>
      </div>

      <div className="mt-4">
        <p className="text-sm">
          Copy the Magic Link from your email and replace <code>/auth/callback</code> with <code>/auth/debug</code> to see what parameters are being sent.
        </p>
      </div>
    </div>
  );
}

export default function AuthDebugPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DebugContent />
    </Suspense>
  );
}
