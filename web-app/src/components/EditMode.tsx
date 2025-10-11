'use client';

import { useState, useEffect } from 'react';

type EditableItem = {
  id: string;
  brand_name: string | null;
  model: string | null;
  primary_use: string | null;
  surface_type: string | null;
  heel_height: number | null;
  forefoot_height: number | null;
  drop: number | null;
  weight: number | null;
  price: number | null;
  carbon_plate: boolean | null;
  waterproof: boolean | null;
  cushioning_type: string | null;
  foot_width: string | null;
  upper_breathability: string | null;
  source_link: string | null;
};

type EditModeProps = {
  item: EditableItem;
  onSave: (updatedItem: EditableItem) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onCancel: () => void;
};

export function EditMode({ item, onSave, onDelete, onCancel }: EditModeProps) {
  const [formData, setFormData] = useState<EditableItem>(item);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageContent, setPageContent] = useState<{ title: string; content: string } | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setFormData(item);
  }, [item]);

  // Fetch page content
  useEffect(() => {
    if (!formData.source_link) {
      setPageContent(null);
      setContentLoading(false);
      setContentError(null);
      return;
    }

    const fetchContent = async () => {
      setContentLoading(true);
      setContentError(null);

      try {
        const response = await fetch(`/api/proxy?url=${encodeURIComponent(formData.source_link)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch content');
        }

        setPageContent({ title: data.title, content: data.content });
      } catch (err) {
        setContentError(err instanceof Error ? err.message : 'Failed to load page content');
      } finally {
        setContentLoading(false);
      }
    };

    fetchContent();
  }, [formData.source_link]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof EditableItem, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate forefoot if heel and drop are both present
      if (field === 'heel_height' || field === 'drop') {
        const heel = field === 'heel_height' ? value : prev.heel_height;
        const drop = field === 'drop' ? value : prev.drop;

        if (heel !== null && heel !== undefined && drop !== null && drop !== undefined) {
          updated.forefoot_height = Number(heel) - Number(drop);
        }
      }

      // Auto-calculate drop if heel and forefoot are both present
      if (field === 'heel_height' || field === 'forefoot_height') {
        const heel = field === 'heel_height' ? value : prev.heel_height;
        const forefoot = field === 'forefoot_height' ? value : prev.forefoot_height;

        if (heel !== null && heel !== undefined && forefoot !== null && forefoot !== undefined) {
          updated.drop = Number(heel) - Number(forefoot);
        }
      }

      return updated;
    });
  };

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);

    try {
      await onDelete(formData.id);
      setShowDeleteConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Top Section - Edit Form (auto-adjusting height) */}
      <div className="min-h-fit max-h-[60vh] border-b bg-gray-50 overflow-y-auto flex-shrink-0">
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Edit Shoe Details</h2>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                disabled={saving || deleting}
              >
                Delete
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition"
                disabled={saving || deleting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                disabled={saving || deleting}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {/* Brand */}
            <div>
              <label className="block text-xs font-medium mb-1">Brand</label>
              <input
                type="text"
                value={formData.brand_name || ''}
                onChange={(e) => updateField('brand_name', e.target.value || null)}
                className="w-full border rounded px-2 py-1 text-xs h-7"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-medium mb-1">Model</label>
              <input
                type="text"
                value={formData.model || ''}
                onChange={(e) => updateField('model', e.target.value || null)}
                className="w-full border rounded px-2 py-1 text-xs h-7"
              />
            </div>

            {/* Use */}
            <div>
              <label className="block text-xs font-medium mb-1">Use</label>
              <select
                value={formData.primary_use || ''}
                onChange={(e) => updateField('primary_use', e.target.value || null)}
                className="w-full border rounded px-2 py-1 text-xs h-7"
              >
                <option value="">—</option>
                <option value="daily trainer">Daily Trainer</option>
                <option value="racing">Racing</option>
                <option value="tempo">Tempo</option>
                <option value="trail running">Trail Running</option>
                <option value="recovery">Recovery</option>
              </select>
            </div>

            {/* Surface */}
            <div>
              <label className="block text-xs font-medium mb-1">Surface</label>
              <select
                value={formData.surface_type || ''}
                onChange={(e) => updateField('surface_type', e.target.value || null)}
                className="w-full border rounded px-2 py-1 text-xs h-7"
              >
                <option value="">—</option>
                <option value="road">Road</option>
                <option value="trail">Trail</option>
                <option value="track">Track</option>
              </select>
            </div>

            {/* Heel Height */}
            <div>
              <label className="block text-xs font-medium mb-1">Heel (mm)</label>
              <input
                type="number"
                value={formData.heel_height ?? ''}
                onChange={(e) => updateField('heel_height', e.target.value ? Number(e.target.value) : null)}
                className="w-full border rounded px-2 py-1 text-xs h-7"
                step="0.1"
                title="Auto-calculates Drop when Forefoot is set"
              />
            </div>

            {/* Forefoot Height */}
            <div>
              <label className="block text-xs font-medium mb-1">
                Forefoot (mm)
                {formData.heel_height !== null && formData.drop !== null && (
                  <span className="ml-1 text-blue-600">★</span>
                )}
              </label>
              <input
                type="number"
                value={formData.forefoot_height ?? ''}
                onChange={(e) => updateField('forefoot_height', e.target.value ? Number(e.target.value) : null)}
                className={`w-full border rounded px-2 py-1 text-xs h-7 ${
                  formData.heel_height !== null && formData.drop !== null
                    ? 'bg-blue-50 border-blue-300'
                    : ''
                }`}
                step="0.1"
                title="Auto-calculated from Heel - Drop"
              />
            </div>

            {/* Drop */}
            <div>
              <label className="block text-xs font-medium mb-1">
                Drop (mm)
                {formData.heel_height !== null && formData.forefoot_height !== null && (
                  <span className="ml-1 text-blue-600">★</span>
                )}
              </label>
              <input
                type="number"
                value={formData.drop ?? ''}
                onChange={(e) => updateField('drop', e.target.value ? Number(e.target.value) : null)}
                className={`w-full border rounded px-2 py-1 text-xs h-7 ${
                  formData.heel_height !== null && formData.forefoot_height !== null
                    ? 'bg-blue-50 border-blue-300'
                    : ''
                }`}
                step="0.1"
                title="Auto-calculated from Heel - Forefoot, or enter to calculate Forefoot"
              />
            </div>

            {/* Weight */}
            <div>
              <label className="block text-xs font-medium mb-1">Weight (g)</label>
              <input
                type="number"
                value={formData.weight ?? ''}
                onChange={(e) => updateField('weight', e.target.value ? Number(e.target.value) : null)}
                className="w-full border rounded px-2 py-1 text-xs h-7"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-medium mb-1">Price ($)</label>
              <input
                type="number"
                value={formData.price ?? ''}
                onChange={(e) => updateField('price', e.target.value ? Number(e.target.value) : null)}
                className="w-full border rounded px-2 py-1 text-xs h-7"
              />
            </div>

            {/* Carbon Plate */}
            <div>
              <label className="block text-xs font-medium mb-1">Carbon Plate</label>
              <select
                value={formData.carbon_plate === null ? '' : String(formData.carbon_plate)}
                onChange={(e) => updateField('carbon_plate', e.target.value === '' ? null : e.target.value === 'true')}
                className="w-full border rounded px-2 py-1 text-xs h-7"
              >
                <option value="">—</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Waterproof */}
            <div>
              <label className="block text-xs font-medium mb-1">Waterproof</label>
              <select
                value={formData.waterproof === null ? '' : String(formData.waterproof)}
                onChange={(e) => updateField('waterproof', e.target.value === '' ? null : e.target.value === 'true')}
                className="w-full border rounded px-2 py-1 text-xs h-7"
              >
                <option value="">—</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>

            {/* Cushioning */}
            <div>
              <label className="block text-xs font-medium mb-1">Cushioning</label>
              <select
                value={formData.cushioning_type || ''}
                onChange={(e) => updateField('cushioning_type', e.target.value || null)}
                className="w-full border rounded px-2 py-1 text-xs h-7"
              >
                <option value="">—</option>
                <option value="firm">Firm</option>
                <option value="balanced">Balanced</option>
                <option value="max">Max</option>
              </select>
            </div>

            {/* Width */}
            <div>
              <label className="block text-xs font-medium mb-1">Width</label>
              <select
                value={formData.foot_width || ''}
                onChange={(e) => updateField('foot_width', e.target.value || null)}
                className="w-full border rounded px-2 py-1 text-xs h-7"
              >
                <option value="">—</option>
                <option value="narrow">Narrow</option>
                <option value="standard">Standard</option>
                <option value="wide">Wide</option>
              </select>
            </div>

            {/* Breathability */}
            <div>
              <label className="block text-xs font-medium mb-1">Breathability</label>
              <select
                value={formData.upper_breathability || ''}
                onChange={(e) => updateField('upper_breathability', e.target.value || null)}
                className="w-full border rounded px-2 py-1 text-xs h-7"
              >
                <option value="">—</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Link */}
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Source Link</label>
              <input
                type="url"
                value={formData.source_link || ''}
                onChange={(e) => {
                  updateField('source_link', e.target.value || null);
                }}
                className="w-full border rounded px-2 py-1 text-xs h-7"
                placeholder="https://..."
              />
            </div>
          </div>
        </form>
      </div>

      {/* Bottom Section - Text Content Preview (flexible height) */}
      <div className="flex-1 bg-gray-100 relative overflow-hidden">
        {!formData.source_link ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg">No source link provided</p>
              <p className="text-sm mt-2">Add a URL in the Link field above to preview</p>
            </div>
          </div>
        ) : contentLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
              <p className="text-sm text-gray-600">Loading content...</p>
            </div>
          </div>
        ) : contentError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-xl p-6">
              <div className="mb-4 text-yellow-600">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">Failed to Load Content</p>
              <p className="text-sm text-gray-600 mb-4">{contentError}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>URL:</strong> <span className="font-mono text-xs break-all">{formData.source_link}</span>
                </p>
              </div>
              <a
                href={formData.source_link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium inline-block"
              >
                Open in New Tab
              </a>
            </div>
          </div>
        ) : pageContent ? (
          <div className="h-full overflow-y-auto p-6 bg-white">
            <div className="max-w-4xl mx-auto">
              {/* Header with title and link */}
              <div className="mb-6 pb-4 border-b">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{pageContent.title}</h2>
                <a
                  href={formData.source_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                  <span>{formData.source_link}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              {/* Content */}
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                  {pageContent.content}
                </pre>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Shoe Record</h3>
                  <p className="text-sm text-gray-600 mt-1">This action cannot be undone</p>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-700">
                  <strong>Brand:</strong> {formData.brand_name || '—'}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Model:</strong> {formData.model || '—'}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
