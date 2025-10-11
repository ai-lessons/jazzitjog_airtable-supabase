'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RangeSlider } from '@/components/RangeSlider';
import { TableSkeleton } from '@/components/TableSkeleton';
import { EmptyState, ErrorState } from '@/components/EmptyState';
import { Badge, UseBadge, SurfaceBadge } from '@/components/Badge';
import { ShoeCard } from '@/components/ShoeCard';
import { ViewToggle } from '@/components/ViewToggle';
import { BrandFilter } from '@/components/BrandFilter';
import { PresetSelector } from '@/components/PresetSelector';
import { useFilterPersistence, FilterState } from '@/hooks/useFilterPersistence';
import { useBrandHistory } from '@/hooks/useBrandHistory';
import { EditMode } from '@/components/EditMode';

type Item = {
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
  date: string | null;
  source_link: string | null;
  cushioning_type: string | null;
  foot_width: string | null;
  upper_breathability: string | null;
};

function ToggleChip({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`px-3 py-1 rounded-full border transition ${
        checked ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}

// RangeBlock moved to RangeSlider component

export default function SearchPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const { history: brandHistory, addToHistory } = useBrandHistory();

  // View mode (table/cards)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Edit mode states
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // All brands from database
  const [allBrands, setAllBrands] = useState<Array<{ name: string; count: number }>>([]);

  // локальные состояния с дефолтами из URL
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [surface, setSurface] = useState<Set<string>>(new Set(sp.get('surface')?.split(',').filter(Boolean) ?? []));
  const [useVal, setUseVal] = useState<Set<string>>(new Set(sp.get('use')?.split(',').filter(Boolean) ?? []));
  const [cushioning, setCushioning] = useState<Set<string>>(new Set(sp.get('cushioning')?.split(',').filter(Boolean) ?? []));
  const [width, setWidth] = useState<Set<string>>(new Set(sp.get('width')?.split(',').filter(Boolean) ?? []));
  const [breathability, setBreathability] = useState<Set<string>>(new Set(sp.get('breathability')?.split(',').filter(Boolean) ?? []));
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set(sp.get('brands')?.split(',').filter(Boolean) ?? []));
  const [plate, setPlate] = useState(sp.get('plate') ?? 'any');
  const [waterproof, setWaterproof] = useState(sp.get('waterproof') ?? 'any');
  const [priceRange, setPriceRange] = useState<[number, number]>([
    Number(sp.get('priceMin')) || 50,
    Number(sp.get('priceMax')) || 1000
  ]);
  const [weightRange, setWeightRange] = useState<[number, number]>([
    Number(sp.get('weightMin')) || 100,
    Number(sp.get('weightMax')) || 500
  ]);
  const [dropRange, setDropRange] = useState<[number, number]>([
    Number(sp.get('dropMin')) || 0,
    Number(sp.get('dropMax')) || 20
  ]);
  const [sort, setSort] = useState(sp.get('sort') ?? 'price_asc');
  const [page, setPage] = useState(Number(sp.get('page') ?? 1));
  const pageSize = 50;

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (surface.size) p.set('surface', Array.from(surface).join(','));
    if (useVal.size) p.set('use', Array.from(useVal).join(','));
    if (cushioning.size) p.set('cushioning', Array.from(cushioning).join(','));
    if (width.size) p.set('width', Array.from(width).join(','));
    if (breathability.size) p.set('breathability', Array.from(breathability).join(','));
    if (selectedBrands.size) p.set('brands', Array.from(selectedBrands).join(','));
    if (plate !== 'any') p.set('plate', plate);
    if (waterproof !== 'any') p.set('waterproof', waterproof);
    if (priceRange[0] !== 50) p.set('priceMin', String(priceRange[0]));
    if (priceRange[1] !== 1000) p.set('priceMax', String(priceRange[1]));
    if (weightRange[0] !== 100) p.set('weightMin', String(weightRange[0]));
    if (weightRange[1] !== 500) p.set('weightMax', String(weightRange[1]));
    if (dropRange[0] !== 0) p.set('dropMin', String(dropRange[0]));
    if (dropRange[1] !== 20) p.set('dropMax', String(dropRange[1]));
    p.set('sort', sort);
    p.set('page', String(page));
    p.set('pageSize', String(pageSize));
    return p.toString();
  }, [q, surface, useVal, cushioning, width, breathability, selectedBrands, plate, waterproof, priceRange, weightRange, dropRange, sort, page]);

  // Filter persistence
  const currentFilters: FilterState = {
    q,
    surface: Array.from(surface),
    use: Array.from(useVal),
    cushioning: Array.from(cushioning),
    width: Array.from(width),
    breathability: Array.from(breathability),
    brands: Array.from(selectedBrands),
    plate,
    waterproof,
    priceRange,
    weightRange,
    dropRange,
    sort,
  };

  const { loadSavedFilters } = useFilterPersistence(currentFilters);

  // Load saved filters on mount
  useEffect(() => {
    const saved = loadSavedFilters();
    if (saved && !sp.toString()) { // Only load if no URL params
      if (saved.q) setQ(saved.q);
      if (saved.surface) setSurface(new Set(saved.surface));
      if (saved.use) setUseVal(new Set(saved.use));
      if (saved.cushioning) setCushioning(new Set(saved.cushioning));
      if (saved.width) setWidth(new Set(saved.width));
      if (saved.breathability) setBreathability(new Set(saved.breathability));
      if (saved.brands) setSelectedBrands(new Set(saved.brands));
      if (saved.plate) setPlate(saved.plate);
      if (saved.waterproof) setWaterproof(saved.waterproof);
      if (saved.priceRange) setPriceRange(saved.priceRange);
      if (saved.weightRange) setWeightRange(saved.weightRange);
      if (saved.dropRange) setDropRange(saved.dropRange);
      if (saved.sort) setSort(saved.sort);
    }
  }, []); // Run once on mount

  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleSet = useCallback(<T,>(
    s: Set<T>,
    setFn: (n: Set<T>) => void,
    val: T
  ) => {
    const next = new Set(s);
    next.has(val) ? next.delete(val) : next.add(val);
    setFn(next);
  }, []);

  // Fetch all brands on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/brands', {
          cache: 'no-store',
          credentials: 'include'
        });
        const json = await res.json();
        if (res.ok && json.brands) {
          setAllBrands(json.brands);
        }
      } catch (err) {
        console.error('Failed to fetch brands:', err);
      }
    })();
  }, []);

  // Load preset handler
  const handleLoadPreset = useCallback((preset: Partial<FilterState> | null) => {
    // Reset all filters first
    setQ('');
    setSurface(new Set());
    setUseVal(new Set());
    setCushioning(new Set());
    setWidth(new Set());
    setBreathability(new Set());
    setSelectedBrands(new Set());
    setPlate('any');
    setWaterproof('any');
    setPriceRange([50, 1000]);
    setWeightRange([100, 500]);
    setDropRange([0, 20]);
    setSort('price_asc');

    // If preset is null, just reset (user selected "Select a preset...")
    if (!preset) {
      setPage(1);
      return;
    }

    // Then apply preset values
    if (preset.q) setQ(preset.q);
    if (preset.surface) setSurface(new Set(preset.surface));
    if (preset.use) setUseVal(new Set(preset.use));
    if (preset.cushioning) setCushioning(new Set(preset.cushioning));
    if (preset.width) setWidth(new Set(preset.width));
    if (preset.breathability) setBreathability(new Set(preset.breathability));
    if (preset.brands) setSelectedBrands(new Set(preset.brands));
    if (preset.plate) setPlate(preset.plate);
    if (preset.waterproof) setWaterproof(preset.waterproof);
    if (preset.priceRange) setPriceRange(preset.priceRange);
    if (preset.weightRange) setWeightRange(preset.weightRange);
    if (preset.dropRange) setDropRange(preset.dropRange);
    if (preset.sort) setSort(preset.sort);
    setPage(1);
  }, []);

  useEffect(() => {
    router.replace('/search?' + queryString, { scroll: false });
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/search?' + queryString, {
          cache: 'no-store',
          credentials: 'include'
        });
        const json = await res.json();

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setError('Please log in to access shoe data.');
            router.push('/login');
            return;
          }
          setError(json.error || 'Failed to fetch data');
          return;
        }

        setItems(json.items ?? []);
        setTotal(json.total ?? 0);
      } catch (err) {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [queryString, router]);

  // Edit mode handlers
  const handleRowClick = (itemId: string) => {
    setSelectedRowId(itemId);
  };

  const handleRowDoubleClick = (itemId: string) => {
    if (selectedRowId === itemId) {
      setEditingRowId(itemId);
    }
  };

  const handleSaveEdit = async (updatedItem: Item) => {
    try {
      const res = await fetch(`/api/shoes/${updatedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem),
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save');
      }

      // Update local state
      setItems(prev => prev.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      ));

      // Exit edit mode
      setEditingRowId(null);
      setSelectedRowId(null);
    } catch (err) {
      throw err; // Re-throw to be handled by EditMode component
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/shoes/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete');
      }

      // Remove from local state
      setItems(prev => prev.filter(item => item.id !== itemId));

      // Exit edit mode
      setEditingRowId(null);
      setSelectedRowId(null);
    } catch (err) {
      throw err; // Re-throw to be handled by EditMode component
    }
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
  };

  // Get editing item
  const editingItem = editingRowId ? items.find(item => item.id === editingRowId) : null;

  // If in edit mode, show EditMode component
  if (editingItem) {
    return (
      <EditMode
        item={editingItem}
        onSave={handleSaveEdit}
        onDelete={handleDeleteItem}
        onCancel={handleCancelEdit}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-white text-gray-900">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar */}
        <aside className="w-full lg:w-80 flex-shrink-0 space-y-6">
          <button
            className="w-full border rounded-xl px-3 py-2 hover:bg-gray-50 transition"
            onClick={() => {
              setQ("");
              setSurface(new Set());
              setUseVal(new Set());
              setCushioning(new Set());
              setWidth(new Set());
              setBreathability(new Set());
              setSelectedBrands(new Set());
              setPlate("any");
              setWaterproof("any");
              setPriceRange([50, 1000]);
              setWeightRange([100, 500]);
              setDropRange([0, 20]);
              setSort('price_asc');
              setPage(1);
            }}
          >
            Reset all filters
          </button>

          <div className="p-4 border rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Search</h2>
            <input
              placeholder="brand or model..."
              value={q}
              onChange={(e) => {setPage(1); setQ(e.target.value)}}
              className="w-full border rounded-xl px-3 py-2"
            />
          </div>

          <PresetSelector onLoadPreset={handleLoadPreset} />

          <BrandFilter
            brands={allBrands}
            selectedBrands={selectedBrands}
            recentBrands={brandHistory}
            onChange={(brands) => {setPage(1); setSelectedBrands(brands)}}
            onBrandClick={addToHistory}
          />

          <div className="p-4 border rounded-2xl shadow-sm">
            <h3 className="font-medium mb-2">Surface</h3>
            <div className="flex flex-wrap gap-2">
              {['road', 'trail', 'track'].map((s) => (
                <ToggleChip
                  key={s}
                  checked={surface.has(s)}
                  onChange={() => {setPage(1); toggleSet(surface, setSurface, s)}}
                >
                  {s}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-2xl shadow-sm">
            <h3 className="font-medium mb-2">Primary use</h3>
            <div className="flex flex-wrap gap-2">
              {['daily trainer', 'racing', 'tempo', 'trail running', 'recovery'].map((u) => (
                <ToggleChip
                  key={u}
                  checked={useVal.has(u)}
                  onChange={() => {setPage(1); toggleSet(useVal, setUseVal, u)}}
                >
                  {u}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-2xl shadow-sm grid grid-cols-2 gap-3">
            <div>
              <h3 className="font-medium mb-2">Plate</h3>
              <div className="flex gap-2 flex-wrap">
                {(['any', 'with', 'without'] as const).map((v) => (
                  <ToggleChip key={v} checked={plate === v} onChange={() => {setPage(1); setPlate(v)}}>
                    {v}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Waterproof</h3>
              <div className="flex gap-2 flex-wrap">
                {(['any', 'yes', 'no'] as const).map((v) => (
                  <ToggleChip key={v} checked={waterproof === v} onChange={() => {setPage(1); setWaterproof(v)}}>
                    {v}
                  </ToggleChip>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-2xl shadow-sm">
            <h3 className="font-medium mb-2">Cushioning</h3>
            <div className="flex flex-wrap gap-2">
              {['balanced', 'max', 'firm'].map((c) => (
                <ToggleChip
                  key={c}
                  checked={cushioning.has(c)}
                  onChange={() => {setPage(1); toggleSet(cushioning, setCushioning, c)}}
                >
                  {c}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-2xl shadow-sm">
            <h3 className="font-medium mb-2">Width</h3>
            <div className="flex flex-wrap gap-2">
              {['standard', 'narrow', 'wide'].map((w) => (
                <ToggleChip
                  key={w}
                  checked={width.has(w)}
                  onChange={() => {setPage(1); toggleSet(width, setWidth, w)}}
                >
                  {w}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-2xl shadow-sm">
            <h3 className="font-medium mb-2">Breathability</h3>
            <div className="flex flex-wrap gap-2">
              {['high', 'medium', 'low'].map((b) => (
                <ToggleChip
                  key={b}
                  checked={breathability.has(b)}
                  onChange={() => {setPage(1); toggleSet(breathability, setBreathability, b)}}
                >
                  {b}
                </ToggleChip>
              ))}
            </div>
          </div>

          <RangeSlider
            label="Price"
            unit="$"
            min={50}
            max={1000}
            value={priceRange}
            onChange={(v) => {setPage(1); setPriceRange(v)}}
          />
          <RangeSlider
            label="Weight"
            unit="g"
            min={100}
            max={500}
            value={weightRange}
            onChange={(v) => {setPage(1); setWeightRange(v)}}
          />
          <RangeSlider
            label="Drop"
            unit="mm"
            min={0}
            max={20}
            value={dropRange}
            onChange={(v) => {setPage(1); setDropRange(v)}}
          />

          <div className="p-4 border rounded-2xl shadow-sm">
            <h3 className="font-medium mb-2">Sort</h3>
            <select
              value={sort}
              onChange={(e) => {setPage(1); setSort(e.target.value)}}
              className="w-full border rounded-xl px-3 py-2"
            >
              <option value="price_asc">Price (low to high)</option>
              <option value="price_desc">Price (high to low)</option>
              <option value="weight_asc">Weight (light to heavy)</option>
              <option value="weight_desc">Weight (heavy to light)</option>
              <option value="drop_asc">Drop (low to high)</option>
              <option value="drop_desc">Drop (high to low)</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              className="flex-1 border rounded-xl px-3 py-2 hover:bg-gray-50 transition"
              onClick={() => {
                setQ("");
                setSurface(new Set());
                setUseVal(new Set());
                setCushioning(new Set());
                setWidth(new Set());
                setBreathability(new Set());
                setSelectedBrands(new Set());
                setPlate("any");
                setWaterproof("any");
                setPriceRange([50, 1000]);
                setWeightRange([100, 500]);
                setDropRange([0, 20]);
                setSort('price_asc');
                setPage(1);
              }}
            >
              Reset all filters
            </button>
          </div>
        </aside>

        {/* Results */}
        <section className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-semibold">Results</h2>
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <ViewToggle mode={viewMode} onChange={setViewMode} />
              <div>{loading ? 'Loading…' : `${total} results`}</div>
              <a
                href={'/api/search?'+queryString+'&csv=1'}
                className="underline hover:text-gray-600"
                target="_blank"
                rel="noreferrer"
              >
                Export CSV
              </a>
            </div>
          </div>

          {loading ? (
            <div className="border rounded-2xl overflow-hidden p-4">
              <TableSkeleton rows={10} />
            </div>
          ) : error ? (
            <div className="border rounded-2xl overflow-hidden">
              <ErrorState
                error={error}
                onRetry={() => window.location.reload()}
              />
            </div>
          ) : items.length === 0 ? (
            <div className="border rounded-2xl overflow-hidden">
              <EmptyState
                onReset={() => {
                  setQ("");
                  setSurface(new Set());
                  setUseVal(new Set());
                  setCushioning(new Set());
                  setWidth(new Set());
                  setBreathability(new Set());
                  setSelectedBrands(new Set());
                  setPlate("any");
                  setWaterproof("any");
                  setPriceRange([50, 1000]);
                  setWeightRange([100, 500]);
                  setDropRange([0, 20]);
                  setSort('price_asc');
                  setPage(1);
                }}
                activeFiltersCount={
                  (q ? 1 : 0) +
                  surface.size +
                  useVal.size +
                  cushioning.size +
                  width.size +
                  breathability.size +
                  selectedBrands.size +
                  (plate !== 'any' ? 1 : 0) +
                  (waterproof !== 'any' ? 1 : 0)
                }
              />
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map(item => (
                <ShoeCard key={item.id} {...item} />
              ))}
            </div>
          ) : (
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
                      <th className="px-3 py-3 min-w-[60px] hidden lg:table-cell">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(r => (
                      <tr
                        key={r.id}
                        className={`border-t transition cursor-pointer ${
                          selectedRowId === r.id
                            ? 'bg-blue-100 hover:bg-blue-200'
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

                            // Show if at least one value exists
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
                        <td className="px-3 py-3 hidden lg:table-cell">
                          {r.source_link ? (
                            <a
                              className="text-blue-600 hover:text-blue-800 underline text-xs"
                              href={r.source_link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Пагинация */}
          <div className="flex items-center gap-2 justify-end">
            <button className="border rounded px-3 py-1 disabled:opacity-50" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
            <span className="text-sm">{page} / {totalPages}</span>
            <button className="border rounded px-3 py-1 disabled:opacity-50" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        </section>
      </div>
    </div>
  );
}
