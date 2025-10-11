export function EmptyState({
  onReset,
  activeFiltersCount,
}: {
  onReset: () => void;
  activeFiltersCount: number;
}) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-6xl mb-4">👟</div>
      <h3 className="text-lg font-semibold mb-2 text-gray-900">
        No shoes found
      </h3>
      <p className="text-gray-500 mb-4">
        Try adjusting your filters or search terms
      </p>
      {activeFiltersCount > 0 && (
        <>
          <button
            onClick={onReset}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
          >
            Reset all filters
          </button>
          <div className="mt-4 text-sm text-gray-400">
            {activeFiltersCount} active filter{activeFiltersCount !== 1 ? 's' : ''}
          </div>
        </>
      )}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-6xl mb-4">⚠️</div>
      <h3 className="text-lg font-semibold mb-2 text-gray-900">
        Something went wrong
      </h3>
      <p className="text-gray-500 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
      >
        Try again
      </button>
    </div>
  );
}
