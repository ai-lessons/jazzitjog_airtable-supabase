'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Row = {
  id: string;
  brand_name: string | null;
  model: string | null;
  primary_use: string | null;
  surface_type: string | null;
  price: number | null;
  date: string | null;
};

export default function Search() {
  const supabase = supabaseBrowser;
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // простая «задержка» перед запросом
  const debouncedQ = useMemo(() => q.trim(), [q]);
  useEffect(() => {
    const t = setTimeout(async () => {
      setErr(null);
      setLoading(true);
      try {
        let query = supabase
          .from('shoes_search')
          .select('id,brand_name,model,primary_use,surface_type,price,date')
          .order('date', { ascending: false })
          .limit(50);

        if (debouncedQ) {
          // полнотекстовый поиск: websearch-интерпретация (asics gt-2000 → ищет «asics» И «gt-2000»)
          query = query.textSearch('search_tsv', debouncedQ, { type: 'websearch' });
        }

        const { data, error } = await query;
        if (error) throw error;
        setRows(data as Row[]);
      } catch (e: any) {
        setErr(e.message ?? String(e));
        setRows([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [debouncedQ, supabase]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск: asics gt-2000, hoka mach, trail..."
          className="w-full border rounded-lg px-3 py-2"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            className="px-3 py-2 border rounded-lg"
            title="Очистить"
          >
            ✕
          </button>
        )}
      </div>

      {loading && <div className="text-sm text-gray-500">Ищем…</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="py-1 pr-2">Brand</th>
            <th className="py-1 pr-2">Model</th>
            <th className="py-1 pr-2">Use</th>
            <th className="py-1 pr-2">Surface</th>
            <th className="py-1 pr-2">Price</th>
            <th className="py-1 pr-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r) => (
            <tr key={r.id} className="border-t">
              <td className="py-1 pr-2">{r.brand_name ?? ''}</td>
              <td className="py-1 pr-2">{r.model ?? ''}</td>
              <td className="py-1 pr-2">{r.primary_use ?? ''}</td>
              <td className="py-1 pr-2">{r.surface_type ?? ''}</td>
              <td className="py-1 pr-2">{typeof r.price === 'number' ? `$${r.price}` : ''}</td>
              <td className="py-1 pr-2">{r.date ?? ''}</td>
            </tr>
          ))}
          {rows !== null && rows.length === 0 && !loading && (
            <tr><td colSpan={6} className="py-2 text-gray-500">Ничего не найдено</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
