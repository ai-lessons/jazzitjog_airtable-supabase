export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-2">
          <div className="h-12 bg-gray-200 rounded w-[120px]" />
          <div className="h-12 bg-gray-200 rounded w-[160px]" />
          <div className="h-12 bg-gray-200 rounded w-[120px]" />
          <div className="h-12 bg-gray-200 rounded w-[80px]" />
          <div className="h-12 bg-gray-200 rounded w-[140px]" />
          <div className="h-12 bg-gray-200 rounded w-[80px]" />
          <div className="h-12 bg-gray-200 rounded w-[80px]" />
          <div className="h-12 bg-gray-200 rounded flex-1" />
        </div>
      ))}
    </div>
  );
}
