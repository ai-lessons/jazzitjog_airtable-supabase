'use client';


import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";

// --- Types ---
type Shoe = {
  id: string;
  brand_name: string;
  model: string;
  primary_use: "daily trainer" | "racing" | "tempo" | "trail running" | "recovery";
  surface_type: "road" | "trail" | "track";
  carbon_plate: boolean;
  waterproof: boolean;
  heel_height: number; // mm
  forefoot_height: number; // mm
  drop: number; // mm
  weight: number; // g
  price: number; // USD
  date: string; // YYYY-MM-DD
};

// --- Demo dataset (deterministic, small but varied) ---
const BRANDS = [
  "ASICS",
  "Nike",
  "Hoka",
  "Saucony",
  "New Balance",
  "Brooks",
  "Altra",
  "On",
  "Salomon",
  "Mizuno",
];
const MODELS = [
  "Mach X",
  "Kinvara",
  "GT-2000",
  "Endorphin Speed",
  "Pegasus",
  "Clouddancer",
  "Cascadia",
  "SuperComp",
  "Racer Pro",
  "Aero Glide",
];
const USES: Shoe["primary_use"][] = [
  "daily trainer",
  "racing",
  "tempo",
  "trail running",
  "recovery",
];
const SURFACES: Shoe["surface_type"][] = ["road", "trail", "track"];

function seededRandom(seed: number) {
  // simple LCG for stable demo data
  let s = seed % 2147483647;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

function makeDemoData(count = 120): Shoe[] {
  const rand = seededRandom(42);
  const arr: Shoe[] = [];
  for (let i = 0; i < count; i++) {
    const brand = BRANDS[Math.floor(rand() * BRANDS.length)];
    const model = MODELS[Math.floor(rand() * MODELS.length)];
    const use = USES[Math.floor(rand() * USES.length)];
    const surface = SURFACES[Math.floor(rand() * SURFACES.length)];
    const carbon = rand() > 0.7;
    const water = rand() > 0.8;
    const heel = Math.floor(26 + rand() * 16); // 26..42
    const drop = Math.floor(4 + rand() * 8); // 4..12
    const fore = heel - drop;
    const weight = Math.floor(180 + rand() * 160); // 180..340g
    const price = Math.floor(90 + rand() * 170); // 90..260
    const day = Math.floor(1 + rand() * 28);
    const month = Math.floor(1 + rand() * 9); // 1..9
    const date = `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    arr.push({
      id: `${i}`,
      brand_name: brand,
      model,
      primary_use: use,
      surface_type: surface,
      carbon_plate: carbon,
      waterproof: water,
      heel_height: heel,
      forefoot_height: fore,
      drop,
      weight,
      price,
      date,
    });
  }
  return arr;
}

// --- Pretty controls ---
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

// --- Main component ---
export default function ShoesSearchDemo() {
  const [data] = useState<Shoe[]>(() => makeDemoData());

  // Filters
  const [q, setQ] = useState("");
  const [surfaces, setSurfaces] = useState<Set<Shoe["surface_type"]>>(new Set());
  const [uses, setUses] = useState<Set<Shoe["primary_use"]>>(new Set());
  const [plate, setPlate] = useState<"any" | "with" | "without">("any");
  const [waterproof, setWaterproof] = useState<"any" | "yes" | "no">("any");
  const [price, setPrice] = useState<[number, number]>([90, 260]);
  const [weight, setWeight] = useState<[number, number]>([180, 340]);
  const [drop, setDrop] = useState<[number, number]>([0, 14]);
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);

  const toggleSet = useCallback(<T,>(
    s: Set<T>,
    setFn: (n: Set<T>) => void,
    val: T
  ) => {
    const next = new Set(s);
    next.has(val) ? next.delete(val) : next.add(val);
    setFn(next);
  }, []);

  const columnHelper = createColumnHelper<Shoe>();
  const columns = useMemo(
  () => [
    columnHelper.accessor("brand_name", {
      header: () => "Brand",
      cell: (ctx) => ctx.getValue(),
    }),
    columnHelper.accessor("model", {
      header: () => "Model",
      cell: (ctx) => ctx.getValue(),
    }),
    columnHelper.accessor("primary_use", {
      header: () => "Use",
      cell: (ctx) => ctx.getValue(),
    }),
    columnHelper.accessor("surface_type", {
      header: () => "Surface",
      cell: (ctx) => ctx.getValue(),
    }),
    columnHelper.accessor("carbon_plate", {
      header: () => "Plate",
      cell: (ctx) => (ctx.getValue() ? "Yes" : "No"),
      // ✅ передаём columnId
      sortingFn: (a, b, columnId) =>
        Number(a.getValue(columnId) as boolean) - Number(b.getValue(columnId) as boolean),
    }),
    columnHelper.accessor("waterproof", {
      header: () => "Waterproof",
      cell: (ctx) => (ctx.getValue() ? "Yes" : "No"),
      // ✅ передаём columnId
      sortingFn: (a, b, columnId) =>
        Number(a.getValue(columnId) as boolean) - Number(b.getValue(columnId) as boolean),
    }),
    columnHelper.accessor("heel_height", {
      header: () => "Heel",
      cell: (ctx) => `${ctx.getValue()} mm`,
    }),
    columnHelper.accessor("forefoot_height", {
      header: () => "Forefoot",
      cell: (ctx) => `${ctx.getValue()} mm`,
    }),
    columnHelper.accessor("drop", {
      header: () => "Drop",
      cell: (ctx) => `${ctx.getValue()} mm`,
    }),
    columnHelper.accessor("weight", {
      header: () => "Weight",
      cell: (ctx) => `${ctx.getValue()} g`,
    }),
    columnHelper.accessor("price", {
      header: () => "Price",
      cell: (ctx) => `$${ctx.getValue()}`,
    }),
    columnHelper.accessor("date", {
      header: () => "Date",
      cell: (ctx) => ctx.getValue(),
    }),
  ],
  [columnHelper]
);

  // Filtered data
  const filtered = useMemo(() => {
    const qx = q.trim().toLowerCase();
    return data.filter((r) => {
      if (qx) {
        const hay = `${r.brand_name} ${r.model}`.toLowerCase();
        if (!hay.includes(qx)) return false;
      }
      if (surfaces.size && !surfaces.has(r.surface_type)) return false;
      if (uses.size && !uses.has(r.primary_use)) return false;
      if (plate !== "any" && (plate === "with") !== r.carbon_plate) return false;
      if (waterproof !== "any" && (waterproof === "yes") !== r.waterproof) return false;
      if (r.price < price[0] || r.price > price[1]) return false;
      if (r.weight < weight[0] || r.weight > weight[1]) return false;
      if (r.drop < drop[0] || r.drop > drop[1]) return false;
      return true;
    });
  }, [data, q, surfaces, uses, plate, waterproof, price, weight, drop]);

  // TanStack Table
  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="min-h-dvh bg-white text-gray-900">
      <div className="mx-auto max-w-7xl p-4 grid grid-cols-12 gap-4">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-3 space-y-6">
          <div className="p-4 border rounded-2xl shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Search</h2>
            <input
              placeholder="brand or model..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
            />
          </div>

          <div className="p-4 border rounded-2xl shadow-sm">
            <h3 className="font-medium mb-2">Surface</h3>
            <div className="flex flex-wrap gap-2">
              {SURFACES.map((s) => (
                <ToggleChip
                  key={s}
                  checked={surfaces.has(s)}
                  onChange={() => toggleSet(surfaces, setSurfaces, s)}
                >
                  {s}
                </ToggleChip>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded-2xl shadow-sm">
            <h3 className="font-medium mb-2">Primary use</h3>
            <div className="flex flex-wrap gap-2">
              {USES.map((u) => (
                <ToggleChip
                  key={u}
                  checked={uses.has(u)}
                  onChange={() => toggleSet(uses, setUses, u)}
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
                {(["any", "with", "without"] as const).map((v) => (
                  <ToggleChip key={v} checked={plate === v} onChange={() => setPlate(v)}>
                    {v}
                  </ToggleChip>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Waterproof</h3>
              <div className="flex gap-2 flex-wrap">
                {(["any", "yes", "no"] as const).map((v) => (
                  <ToggleChip key={v} checked={waterproof === v} onChange={() => setWaterproof(v)}>
                    {v}
                  </ToggleChip>
                ))}
              </div>
            </div>
          </div>

          <RangeBlock label="Price" unit="$" min={90} max={260} value={price} onChange={setPrice} />
          <RangeBlock label="Weight" unit="g" min={180} max={340} value={weight} onChange={setWeight} />
          <RangeBlock label="Drop" unit="mm" min={0} max={14} value={drop} onChange={setDrop} />

          <div className="flex gap-2">
            <button
              className="flex-1 border rounded-xl px-3 py-2"
              onClick={() => {
                setQ("");
                setSurfaces(new Set());
                setUses(new Set());
                setPlate("any");
                setWaterproof("any");
                setPrice([90, 260]);
                setWeight([180, 340]);
                setDrop([0, 14]);
              }}
            >
              Reset
            </button>
          </div>
        </aside>

        {/* Results */}
        <section className="col-span-12 md:col-span-9 lg:col-span-9 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Results</h2>
            <div className="text-sm text-gray-500">{rows.length} items</div>
          </div>

          <div className="border rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((h) => {
                        const sortable = h.column.getCanSort();
                        const dir = h.column.getIsSorted();
                        return (
                          <th
                            key={h.id}
                            className="text-left px-3 py-2 border-b select-none"
                          >
                            <button
                              className={`inline-flex items-center gap-1 ${sortable ? "cursor-pointer" : "cursor-default"}`}
                              onClick={sortable ? h.column.getToggleSortingHandler() : undefined}
                              title={sortable ? "Sort" : undefined}
                            >
                              {flexRender(h.column.columnDef.header, h.getContext())}
                              {dir === "asc" && <span>▲</span>}
                              {dir === "desc" && <span>▼</span>}
                            </button>
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
              </table>
            </div>

            {/* Virtualized rows */}
            <div style={{ height: 520 }}>
              <Virtuoso
                totalCount={rows.length}
                itemContent={(index) => {
                  const row = rows[index];
                  return (
                    <div className="contents">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <tbody>
                            <tr className="border-b hover:bg-gray-50">
                              {row.getVisibleCells().map((cell) => (
                                <td key={cell.id} className="px-3 py-2">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function RangeBlock({
  label,
  unit,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}) {
  const [a, b] = value;
  return (
    <div className="p-4 border rounded-2xl shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">{label}</h3>
        <div className="text-sm text-gray-600">
          {a}
          {unit} – {b}
          {unit}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 items-center">
        <input
          type="range"
          min={min}
          max={max}
          value={a}
          onChange={(e) => onChange([Number(e.target.value), b])}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={b}
          onChange={(e) => onChange([a, Number(e.target.value)])}
        />
      </div>
    </div>
  );
}
