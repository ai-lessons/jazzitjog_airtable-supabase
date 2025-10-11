'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ApprovalLog } from '@/lib/supabase-staging';

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<ApprovalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/logs?page=${page}&pageSize=${pageSize}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        if (res.status === 403) {
          setError('Access denied: Admin privileges required');
          return;
        }
        throw new Error('Failed to load logs');
      }

      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [page, router]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-dvh bg-white text-gray-900 p-4">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Activity Log</h1>
          <p className="text-sm text-gray-600 mt-1">History of approved staging items</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-sm text-gray-600 mt-4">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="border rounded-2xl p-12 text-center text-gray-500">
            <p className="text-lg">No activity yet</p>
            <p className="text-sm mt-2">Approval logs will appear here</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-xl p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-lg">
                        {log.total_approved} items approved
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(log.approved_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Total in production</div>
                      <div className="text-2xl font-bold text-green-600">
                        {log.total_in_shoe_results}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">Brand Breakdown:</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {Object.entries(log.brand_counts).map(([brand, count]) => (
                        <div key={brand} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{brand}</span>
                          <span className="font-semibold text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 justify-between mt-6">
              <div className="text-sm text-gray-600">
                {total} total log entries
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="border rounded px-3 py-1 disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Prev
                </button>
                <span className="text-sm">{page} / {totalPages}</span>
                <button
                  className="border rounded px-3 py-1 disabled:opacity-50"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
