'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { StagingItem } from '@/lib/supabase-staging';
import { Badge, UseBadge, SurfaceBadge } from '@/components/Badge';
import { EditMode } from '@/components/EditMode';
import { TableSkeleton } from '@/components/TableSkeleton';

export default function StagingPage() {
  const router = useRouter();
  const [items, setItems] = useState<StagingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [approving, setApproving] = useState(false);
  const [approvingSingleId, setApprovingSingleId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/staging?page=${page}&pageSize=${pageSize}`, {
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
        throw new Error('Failed to load staging items');
      }

      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [page, router]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const editedItems = items.filter(item => item.is_edited);

  const handleApproveAll = async () => {
    if (editedItems.length === 0) {
      alert('No items to approve. Please edit and save items first.');
      return;
    }

    if (!confirm(`Approve ${editedItems.length} items and move to production?`)) {
      return;
    }

    setApproving(true);

    try {
      const res = await fetch('/api/staging/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemIds: editedItems.map(item => item.id) }),
      });

      if (!res.ok) {
        throw new Error('Failed to approve items');
      }

      const result = await res.json();

      alert(`Success! Approved ${result.approved} items.\n\nTotal in production: ${result.totalInShoeResults}`);

      await loadItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to approve items');
    } finally {
      setApproving(false);
    }
  };

  const handleApproveSingle = async (itemId: string) => {
    if (!confirm('Approve this item and move to production?')) {
      return;
    }

    setApprovingSingleId(itemId);

    try {
      console.log('Approving single item:', itemId);
      const res = await fetch('/api/staging/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemIds: [itemId] }),
      });

      console.log('Approve response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Approve error response:', errorData);
        throw new Error(errorData.error || 'Failed to approve item');
      }

      const result = await res.json();
      console.log('Approve success:', result);

      await loadItems();
    } catch (err) {
      console.error('Approve exception:', err);
      alert(err instanceof Error ? err.message : 'Failed to approve item');
    } finally {
      setApprovingSingleId(null);
    }
  };

  const handleSaveEdit = async (updatedItem: any) => {
    try {
      const res = await fetch(`/api/staging/${updatedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to save');
      }

      const result = await res.json();

      // Update local state with the response (includes is_edited: true)
      setItems(prev => prev.map(item =>
        item.id === updatedItem.id ? { ...item, ...result.item } : item
      ));

      // Exit edit mode
      setEditingRowId(null);
      setSelectedRowId(null);
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/staging/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to delete');
      }

      setItems(prev => prev.filter(item => item.id !== itemId));

      setEditingRowId(null);
      setSelectedRowId(null);
    } catch (err) {
      throw err;
    }
  };

  const handleRowClick = (itemId: string) => {
    setSelectedRowId(itemId);
  };

  const handleRowDoubleClick = (itemId: string) => {
    if (selectedRowId === itemId) {
      setEditingRowId(itemId);
    }
  };

  const editingItem = editingRowId ? items.find(item => item.id === editingRowId) : null;

  if (editingItem) {
    return (
      <EditMode
        item={editingItem}
        onSave={handleSaveEdit}
        onDelete={handleDeleteItem}
        onCancel={() => setEditingRowId(null)}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-white text-gray-900 p-4">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Pending Entries</h1>
          <div className="flex gap-3">
            {editedItems.length > 0 && (
              <button
                onClick={handleApproveAll}
                disabled={approving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {approving ? 'Approving...' : `Approve ${editedItems.length} items`}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="border rounded-2xl overflow-hidden p-4">
            <TableSkeleton rows={10} />
          </div>
        ) : items.length === 0 ? (
          <div className="border rounded-2xl p-12 text-center text-gray-500">
            <p className="text-lg">No pending items</p>
            <p className="text-sm mt-2">New items will appear here after ETL processing</p>
          </div>
        ) : (
          <>
            <div className="border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <th className="px-3 py-3 min-w-[100px]">Brand</th>
                      <th className="px-3 py-3 min-w-[140px]">Model</th>
                      <th className="px-3 py-3 min-w-[120px]">Use</th>
                      <th className="px-3 py-3 min-w-[80px]">Surface</th>
                      <th className="px-3 py-3 min-w-[100px] hidden md:table-cell">Stack</th>
                      <th className="px-3 py-3 min-w-[70px] text-right">Weight</th>
                      <th className="px-3 py-3 min-w-[70px] text-right">Price</th>
                      <th className="px-3 py-3 min-w-[200px]">Features</th>
                      <th className="px-3 py-3 min-w-[80px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(r => (
                      <tr
                        key={r.id}
                        className={`border-t transition cursor-pointer ${
                          selectedRowId === r.id
                            ? 'bg-blue-100 hover:bg-blue-200'
                            : r.is_edited
                            ? 'bg-green-100 hover:bg-green-200'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleRowClick(r.id)}
                        onDoubleClick={() => handleRowDoubleClick(r.id)}
                      >
                        <td className="px-3 py-3 font-medium">{r.brand_name}</td>
                        <td className="px-3 py-3">{r.model}</td>
                        <td className="px-3 py-3">
                          {r.primary_use && <UseBadge use={r.primary_use} />}
                        </td>
                        <td className="px-3 py-3">
                          {r.surface_type && <SurfaceBadge surface={r.surface_type} />}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-600 hidden md:table-cell">
                          {(() => {
                            const heel = r.heel_height !== null ? r.heel_height : '—';
                            const forefoot = r.forefoot_height !== null ? r.forefoot_height : '—';
                            const drop = r.drop !== null ? r.drop : '—';

                            if (r.heel_height !== null || r.forefoot_height !== null || r.drop !== null) {
                              return `${heel}/${forefoot}/${drop}mm`;
                            }
                            return '—';
                          })()}
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-sm">
                          {r.weight ? `${r.weight}g` : '—'}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">
                          {typeof r.price === 'number' ? `$${r.price}` : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {r.carbon_plate && <Badge variant="carbon">⚡ Carbon</Badge>}
                            {r.waterproof && <Badge variant="waterproof">💧 WR</Badge>}
                            {r.cushioning_type && <Badge variant="cushioning" label="Cushion">{r.cushioning_type}</Badge>}
                            {r.foot_width && <Badge variant="width" label="Width">{r.foot_width}</Badge>}
                            {r.upper_breathability && <Badge variant="breathability" label="Breath">{r.upper_breathability}</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveSingle(r.id);
                            }}
                            disabled={approvingSingleId === r.id}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {approvingSingleId === r.id ? 'Approving...' : 'Approve'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-between mt-4">
              <div className="text-sm text-gray-600">
                {total} total items • {editedItems.length} ready to approve
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
