'use client';

import { useState } from 'react';
import { AiSearchResponse, AiSearchResult } from '@/lib/aiSearch/search';

export default function AISearchPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AiSearchResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          topModels: 10,
          evidencePerModel: 3,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${res.status}`);
      }

      const data: AiSearchResponse = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setQuery('');
    setError(null);
    setResponse(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">AI Search</h1>
      <p className="text-gray-600 mb-8">
        Search for running shoes using natural language. The AI will find relevant models and show evidence from articles.
      </p>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe your ideal running shoes..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={loading}
            className="border border-gray-300 px-4 py-3 rounded-xl hover:bg-gray-50 disabled:opacity-50"
          >
            Reset
          </button>
        </div>
        <div className="text-sm text-gray-500">
          Try queries like &ldquo;lightweight shoes for road running&rdquo; or &ldquo;waterproof trail shoes with carbon plate&rdquo;
        </div>
      </form>

      {error && (
        <div className="mb-8 p-4 border border-red-300 bg-red-50 rounded-xl">
          <h3 className="font-semibold text-red-800 mb-1">Error</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {response && (
        <div>
          <div className="mb-6 p-4 border border-gray-200 rounded-xl bg-gray-50">
            <h3 className="font-semibold mb-2">Search Details</h3>
            <div className="text-sm text-gray-600">
              <p>
                <span className="font-medium">Query:</span> {response.query}
                {response.query_lang && (
                  <span className="ml-3 px-2 py-0.5 bg-gray-200 rounded text-xs">
                    Detected language: {response.query_lang}
                  </span>
                )}
              </p>
              {response.retrieval_queries && (
                <p className="mt-2">
                  <span className="font-medium">Retrieval queries:</span>{' '}
                  {response.retrieval_queries.map((q, i) => (
                    <span key={i} className="ml-2 px-2 py-0.5 bg-blue-100 rounded text-xs">
                      {q.lang}: {q.text}
                      {q.used_translation && ' (translated)'}
                    </span>
                  ))}
                </p>
              )}
              <p className="mt-2">
                <span className="font-medium">Provider:</span> {response.provider}
                <span className="ml-4">
                  <span className="font-medium">Results:</span> {response.results.length}
                </span>
              </p>
            </div>
          </div>

          <FilteredResults response={response} />
        </div>
      )}
    </div>
  );
}

function FilteredResults({ response }: { response: AiSearchResponse }) {
  // Compute distinct sources from evidence (deduplicate by source_link)
  const computeDistinctSources = (evidence: AiSearchResult['evidence']): number => {
    const uniqueSources = new Set<string>();
    evidence.forEach((item) => {
      if (item.source_link) {
        uniqueSources.add(item.source_link);
      }
    });
    return uniqueSources.size;
  };

  // Filter results with >=2 distinct sources
  const filteredResults = response.results.filter((result) => {
    const distinctSources = computeDistinctSources(result.evidence);
    return distinctSources >= 2;
  });

  const hiddenCount = response.results.length - filteredResults.length;

  if (response.results.length === 0) {
    return (
      <div className="text-center py-10 border border-gray-200 rounded-xl">
        <p className="text-gray-500">No results found for your query.</p>
      </div>
    );
  }

  return (
    <>
      {hiddenCount > 0 && (
        <div className="mb-6 p-4 border border-yellow-300 bg-yellow-50 rounded-xl">
          <p className="text-yellow-800 text-sm">
            <span className="font-medium">Note:</span> Some models were hidden because they have less than 2 evidence sources.
            <span className="ml-2 font-medium">
              (shown {filteredResults.length} / hidden {hiddenCount})
            </span>
          </p>
        </div>
      )}

      {filteredResults.length === 0 ? (
        <div className="text-center py-10 border border-gray-200 rounded-xl">
          <p className="text-gray-500">
            No results with sufficient evidence. Try a different query.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredResults.map((result) => (
            <ResultCard key={result.id_model} result={result} />
          ))}
        </div>
      )}
    </>
  );
}

function ResultCard({ result }: { result: AiSearchResult }) {
  const { id_model, brand_canon, model_canon, best_dist, matched_chunks, distinct_sources, evidence } = result;

  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">
            {brand_canon} {model_canon}
          </h3>
          <p className="text-gray-600 text-sm">ID: {id_model}</p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <div className="flex gap-4">
            <span title="Best distance (lower is better)">Distance: {best_dist.toFixed(4)}</span>
            <span title="Matched chunks">Chunks: {matched_chunks}</span>
            <span title="Distinct sources">Sources: {distinct_sources}</span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="font-semibold mb-2">Evidence:</h4>
        {evidence.length === 0 ? (
          <p className="text-gray-500 text-sm">No evidence available.</p>
        ) : (
          <ul className="space-y-3">
            {evidence.slice(0, 3).map((item, idx) => (
              <li key={idx} className="border-l-4 border-gray-300 pl-3 py-1">
                <div className="text-sm">
                  <p className="text-gray-800">{item.preview}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <a
                      href={item.source_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline text-xs"
                    >
                      View source
                    </a>
                    <span className="text-gray-500 text-xs">Distance: {item.dist.toFixed(4)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="text-xs text-gray-400">
        {evidence.length > 3 && (
          <p>... and {evidence.length - 3} more evidence item(s)</p>
        )}
      </div>
    </div>
  );
}
