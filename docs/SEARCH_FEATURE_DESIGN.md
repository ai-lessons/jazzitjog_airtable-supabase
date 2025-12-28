# Search & Discovery Feature Design

**Project:** Sneaker Pipeline - New Web App  
**Feature:** Search & Discovery  
**Version:** 1.0 (MVP)  
**Last Updated:** 2025-12-10  
**Status:** Design Document

---

## 1. Introduction & Goals

### Purpose
The Search & Discovery feature is the **primary entry point** for users to explore the sneaker database in the new-web application. It provides a fast, intuitive interface for finding running shoes based on text queries and structured filters.

### Design Principles
- **Supabase-Only**: All data comes from `public.v_shoes_latest` view (no Airtable dependencies)
- **Two-Layer Architecture**: Structured search (Level 1) + optional AI-assisted search (Level 2)
- **Unified Data Model**: Both layers share the same `SearchParams` and query engine
- **Transparency**: AI suggestions are visible and editable by users
- **Progressive Enhancement**: v1 ships with structured search; AI layer can be added incrementally

### v1 MVP Scope
- Text search across brand and model fields
- Basic filters: Brand, Surface Type, Carbon Plate (optional)
- Simple pagination (20-30 results per page)
- Loading and empty states
- Server-side rendering with Next.js Server Components

---

## 2. v1 Search UX (Structured Search)

### URL & Navigation
- **Primary URL**: `/search`
- **Alternative**: `/` (home page redirects to `/search`)
- **Deep linking**: `/search?q=nike+pegasus&brand=nike&surface=road` (shareable URLs)

### UI Components

#### Search Input
- **Location**: Top of page, prominent placement
- **Type**: Text input with search icon
- **Placeholder**: "Search for running shoes... (e.g., 'Nike Pegasus', 'trail shoes', 'carbon plate')"
- **Behavior**: Search on Enter key or button click (v1 uses form submission, not real-time)
- **Clear button**: Reset search and filters
- **Accessibility**: ARIA labels, keyboard navigation

#### Filter Panel (v1: Minimal)
**v1 Filters**:
- **Brand** (dropdown)
  - Options: All Brands, Nike, Adidas, Hoka, Asics, New Balance, Saucony, Brooks, etc.
  - Populated dynamically from database
  
- **Surface Type** (radio buttons)
  - Options: All, Road, Trail
  
- **Carbon Plate** (checkbox, optional for v1)
  - "Only show shoes with carbon plate"

**Layout**: 
- Desktop: Sidebar on left (collapsible)
- Mobile: Collapsible panel at top

**Future Filters (v2+)**:
- Primary Use (dropdown: Daily Trainer, Tempo, Race, Recovery, etc.)
- Drop range (slider: 0-12mm)
- Weight range (slider: 150-350g)
- Price range (slider: $50-$300)
- Cushioning Level (radio: Firm, Balanced, Max)
- Stability (radio: Neutral, Stability)
- Gender (radio: Men, Women, Unisex)
- Release Year (dropdown)

#### Results Display

**Layout**: Grid of cards
- Desktop: 2-3 columns
- Tablet: 2 columns
- Mobile: 1 column

**Result Card (v1)**:
Each card displays:
- **Brand + Model** (e.g., "Nike Pegasus 40") - prominent heading
- **Primary Use** (e.g., "Daily Trainer") - subtitle
- **Surface Type** badge (Road/Trail)
- **Key Metrics** (4-5 specs):
  - Drop: 10mm
  - Weight: 280g
  - Price: $140
  - Carbon Plate: ✓ or ✗ (icon)
- **Click action**: Navigate to `/shoes/[id]` detail page (future)

**Empty State**:
- Message: "No shoes found matching your search."
- Suggestions: "Try different keywords or adjust your filters."
- Optional: Show popular searches or recent additions

**Loading State**:
- Skeleton cards matching result card layout
- OR: Simple spinner with "Searching..." message

#### Pagination
- Show 20-30 results per page
- "Previous" / "Next" buttons
- Page numbers (1, 2, 3, ..., with ellipsis for long lists)
- Total count: "Showing 1-20 of 156 results"
- URL updates on page change: `?page=2`

#### Sort Options (Optional for v1)
**Defer to v2** unless time permits:
- Relevance (default)
- Price: Low to High
- Price: High to Low
- Weight: Light to Heavy
- Newest First

### User Flow Example
1. User navigates to `/search`
2. User types "carbon plate trail" in search box
3. User selects "Trail" from Surface Type filter
4. User clicks Search button
5. Results load: 12 trail shoes with carbon plates
6. User clicks on "Hoka Tecton X2" card
7. User navigates to `/shoes/[id]` detail page (future feature)

---

## 3. Data Model

### SearchParams (Unified Input Type)

```typescript
// new-web/lib/search/types.ts

export type SearchParams = {
  // v1 fields (implemented in MVP)
  query?: string;              // Free text search
  brand?: string;              // Exact brand match
  surface?: string;            // "road" | "trail" | "all"
  hasCarbonPlate?: boolean;    // Optional: filter by carbon plate
  
  // Pagination
  page?: number;               // Default: 1
  limit?: number;              // Default: 24
  
  // v2+ fields (reserved for future)
  primaryUse?: string;         // "daily" | "tempo" | "race" | "recovery" | "trail"
  dropRange?: [number, number]; // [min, max] in mm
  weightRange?: [number, number]; // [min, max] in grams
  priceRange?: [number, number]; // [min, max] in USD
  cushioningLevel?: string;    // "firm" | "balanced" | "max"
  stability?: string;          // "neutral" | "stability"
  gender?: string;             // "men" | "women" | "unisex"
  releaseYear?: number;        // Year filter
  
  // Sorting (v2+)
  sortBy?: string;             // "relevance" | "price_asc" | "price_desc" | "weight_asc" | "newest"
};
```

### SearchResult (Output Type)

```typescript
export type SearchResult = {
  id: string;                    // UUID for detail page link
  brand_name: string;            // "Nike"
  model: string;                 // "Pegasus 40"
  primary_use: string | null;    // "Daily Trainer"
  surface_type: string | null;   // "road" | "trail"
  drop: number | null;           // 10 (mm)
  weight: number | null;         // 280 (grams)
  price: number | null;          // 140 (USD)
  carbon_plate: boolean | null;  // true/false
  waterproof: boolean | null;    // true/false
  cushioning_type: string | null; // "firm" | "balanced" | "max"
  
  // v2+ fields (optional)
  // stability: string | null;
  // gender: string | null;
  // release_year: number | null;
  // thumbnail_url: string | null;
  // match_score: number | null;  // For AI-assisted search
  // match_reason: string | null; // For AI-assisted search
};

export type SearchResponse = {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
};
```

### Database Mapping

`SearchParams` fields map to `v_shoes_latest` columns:

| SearchParams Field | Database Column | Filter Type |
|-------------------|-----------------|-------------|
| `query` | `brand_name`, `model` | `.ilike()` (OR) |
| `brand` | `brand_name` | `.eq()` |
| `surface` | `surface_type` | `.eq()` |
| `hasCarbonPlate` | `carbon_plate` | `.eq()` |
| `primaryUse` | `primary_use` | `.eq()` |
| `dropRange` | `drop` | `.gte()`, `.lte()` |
| `weightRange` | `weight` | `.gte()`, `.lte()` |
| `priceRange` | `price` | `.gte()`, `.lte()` |
| `cushioningLevel` | `cushioning_type` | `.eq()` |

---

## 4. Data Access Strategy

### Current Backend State

**Available**:
- ✅ Table: `public.shoe_results` (all shoe data)
- ✅ View: `public.v_shoes_latest` (distinct latest by brand/model)
- ✅ Supabase client: `src/integrations/supabase/client.ts`
- ✅ Logger: `src/core/logger.ts`
- ✅ Utilities: `src/core/utils.ts` (normStr, toNum, etc.)

**Not Available**:
- ❌ Custom `search_sneakers()` RPC function (referenced in `src/integrations/supabase/rpc.ts` but doesn't exist in database)

### v1 Query Strategy: Direct Supabase Queries

**Approach**: Query `v_shoes_latest` view directly using Supabase client

**Implementation**:
```typescript
// new-web/lib/search/data.ts
import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/core/logger';
import type { SearchParams, SearchResponse } from './types';

export async function fetchSearchResults(
  params: SearchParams
): Promise<SearchResponse> {
  const startTime = Date.now();
  const supabase = createServerClient();
  
  // Build query
  let query = supabase
    .from('v_shoes_latest')
    .select('id, brand_name, model, primary_use, surface_type, drop, weight, price, carbon_plate, waterproof, cushioning_type', { count: 'exact' });
  
  // Text search (ILIKE on brand_name OR model)
  if (params.query) {
    query = query.or(`brand_name.ilike.%${params.query}%,model.ilike.%${params.query}%`);
  }
  
  // Brand filter
  if (params.brand && params.brand !== 'all') {
    query = query.eq('brand_name', params.brand);
  }
  
  // Surface type filter
  if (params.surface && params.surface !== 'all') {
    query = query.eq('surface_type', params.surface);
  }
  
  // Carbon plate filter
  if (params.hasCarbonPlate !== undefined) {
    query = query.eq('carbon_plate', params.hasCarbonPlate);
  }
  
  // Pagination
  const page = params.page || 1;
  const limit = params.limit || 24;
  const start = (page - 1) * limit;
  const end = start + limit - 1;
  query = query.range(start, end);
  
  // Execute query
  const { data, error, count } = await query;
  
  if (error) {
    logger.error('Search query failed', { error, params });
    throw error;
  }
  
  // Log analytics
  logger.info('Search query executed', {
    params,
    resultCount: data?.length || 0,
    totalCount: count || 0,
    duration: Date.now() - startTime,
  });
  
  return {
    results: data || [],
    total: count || 0,
    page,
    limit,
  };
}
```

**Pros**:
- Simple to implement
- No migration needed
- Leverages Supabase's built-in query builder
- Good enough for v1 with small-to-medium datasets

**Cons**:
- Simple ILIKE search may not rank results well
- May need optimization for large datasets (100k+ shoes)

**Future Enhancement (v2+)**:
- Create custom `search_sneakers()` RPC function in Supabase
- Use PostgreSQL full-text search (`tsvector`, `tsquery`) for better relevance ranking
- Add indexes on commonly filtered columns

### API Architecture: Server Components

**v1 Approach**: Use Next.js Server Components (no API route needed)

```typescript
// app/search/page.tsx
import { fetchSearchResults } from '@/lib/search/data';
import SearchUI from '@/components/search/SearchUI';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const params = {
    query: searchParams.q as string,
    brand: searchParams.brand as string,
    surface: searchParams.surface as string,
    hasCarbonPlate: searchParams.carbonPlate === 'true',
    page: parseInt(searchParams.page as string) || 1,
  };
  
  const response = await fetchSearchResults(params);
  
  return <SearchUI response={response} params={params} />;
}
```

**Pros**:
- Simplest approach
- Server-side rendering (SSR) for SEO
- No extra API route needed
- Automatic data fetching

**Cons**:
- Less flexible for client-side interactions
- Harder to add real-time search (debouncing)

**Future Option (v2+)**: Refactor to API route + client component if real-time search is needed

---

## 5. Two-Layer Search: Structured + AI-Assisted

The search experience is designed as a **two-layer system** built on the same underlying data model and database view.

### 5.1 Structured Search (Level 1) - Foundation

**What it is**:
- Users interact with **explicit filters** and inputs
- Direct mapping from UI controls to database queries
- Always available, works independently of AI

**How it works**:
1. User fills in search input and/or selects filters
2. Form submission updates URL query params
3. Server Component reads params and calls `fetchSearchResults()`
4. Direct Supabase query on `v_shoes_latest` with filters applied
5. Results rendered as cards

**Key property**:
- Structured search is the **source of truth** for how the system filters shoes
- All other search modes (including AI) build on top of this model

**Implementation**:
- v1 MVP implements this layer fully
- Uses the `SearchParams` type defined above
- Query logic in `new-web/lib/search/data.ts`

### 5.2 AI-Assisted Search (Level 2) - Enhancement

**What it is**:
- Optional, smarter layer on top of structured search
- User describes needs in natural language
- AI parses text → `SearchParams` → same query engine

**Example user input**:
> "I want lightweight shoes for tempo runs on road, under 150€, neutral, with good cushioning."

**How it works**:
1. **Parse natural language → SearchParams**
   - AI (via MCP + LLM) extracts:
     - `surface = "road"`
     - `primaryUse = "tempo"`
     - `weightRange = [0, 250]` (inferred from "lightweight")
     - `priceRange = [0, 150]`
     - `cushioningLevel = "balanced"` or `"max"` (from "good cushioning")
     - `stability = "neutral"`

2. **Populate structured filters UI**
   - System shows user what it understood:
     - Surface: Road ✓
     - Primary Use: Tempo
     - Weight: ≤ 250g
     - Price: ≤ €150
     - Cushioning: Balanced/Max
     - Stability: Neutral
   - User can **edit any filter** before running search
   - This keeps AI behavior **transparent and editable**

3. **Run same structured search pipeline**
   - Once `SearchParams` are constructed, use the **same `fetchSearchResults()`** function
   - No separate "AI-only" database logic
   - AI only helps fill and refine `SearchParams`

4. **Optional: Reranking and Recommendations**
   - In advanced mode, AI can:
     - Rerank results by semantic similarity to user's description
     - Add `match_score` and `match_reason` to each result
     - Suggest "near misses" when no perfect matches exist
   - Example:
     ```typescript
     {
       ...shoe,
       match_score: 0.92,
       match_reason: "Lightweight road shoe designed for tempo runs, slightly above target weight but excellent cushioning"
     }
     ```

### 5.3 Search Modes

#### Strict (Filter-Only) Mode
- AI is used **only** to parse text → `SearchParams`
- Final results are **purely determined** by structured filters
- No reranking or creative suggestions
- Ideal for reproducibility and predictability

#### Creative (Recommendation) Mode
- AI can slightly relax or expand filters if needed
- Highlights alternative options when ideal matches are scarce
- Behaviors:
  - If no exact matches, widen ranges (price/weight/drop)
  - Include adjacent primary uses (e.g., daily trainer vs tempo)
  - Rerank by "best match" to user's description
- UI clearly indicates when operating in creative mode

### 5.4 Implementation Notes

**v1 Status**: AI-assisted search is **not implemented** in v1 MVP
- v1 ships with structured search only
- AI layer can be added incrementally in v2+

**Future Implementation**:
- Create MCP server for search assistance
- Add AI prompt input to search page (optional toggle)
- Parse natural language → `SearchParams` using LLM
- Display inferred filters for user review
- Add match scoring and explanations (optional)

**Key Principle**:
Both layers share the same:
- Input: `SearchParams`
- Engine: `fetchSearchResults(params: SearchParams)`
- Output: `SearchResult[]`

This makes the system:
- Easier to test (same engine, different entry points)
- Easier to extend (new fields appear in structured search first, then AI learns to use them)
- More transparent and controllable

---

## 6. Use of Existing Modules

### Supabase Integration (`src/integrations/supabase/`)

**Reuse**:
- ✅ `client.ts` - Use `getSupabaseClient()` for server-side queries
- ✅ `types.ts` - Use `SupabaseClientType` for type safety

**Skip**:
- ⚠️ `rpc.ts` - Skip `searchSneakers()` wrapper for v1 (RPC doesn't exist in database)

**Usage**:
```typescript
// new-web/lib/supabase/server.ts (already exists)
import { getSupabaseClient } from '@/integrations/supabase/client';

export function createServerClient() {
  return getSupabaseClient({
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });
}
```

### Core Utilities (`src/core/`)

**Reuse**:
- ✅ `logger.ts` - Search analytics and debugging
- ✅ `utils.ts` - Data formatting (`normStr`, `toNum`, `round2`)
- ✅ `types.ts` - Reference for shoe data structure

**Usage**:
```typescript
// Logging
import { logger } from '@/core/logger';
logger.info('Search query executed', { params, resultCount, duration });

// Formatting
import { toNum } from '@/core/utils';
const displayWeight = toNum(shoe.weight) ? `${toNum(shoe.weight)}g` : 'N/A';
const displayPrice = toNum(shoe.price) ? `$${toNum(shoe.price)}` : 'N/A';
```

### ETL/Normalize (`src/etl/normalize/`)

**Not needed for v1 Search** - only used for data import/processing

---

## 7. Implementation Plan

### Search-1: Design (Complete)
✅ This document

### Search-2: Create Search Data Layer
**Goal**: Set up backend data access (no UI yet)

**Tasks**:
1. Create `new-web/lib/search/types.ts`
   - Define `SearchParams`, `SearchResult`, `SearchResponse` types
2. Create `new-web/lib/search/data.ts`
   - Implement `fetchSearchResults()` function
   - Query `v_shoes_latest` with filters
   - Add pagination
   - Add logging
3. Create test API route `app/api/search/test/route.ts`
   - Verify data access works
   - Test with mock params
4. Manual testing: `curl http://localhost:3000/api/search/test?q=nike&brand=Nike`

**Acceptance Criteria**:
- ✅ `fetchSearchResults()` returns valid data from Supabase
- ✅ Text search works (ILIKE on brand_name + model)
- ✅ Brand filter works
- ✅ Surface type filter works
- ✅ Pagination works
- ✅ Logging captures search queries

**Estimated Effort**: 2-3 hours

### Search-3: Build Search Page UI
**Goal**: Create `/search` page with search input, filters, and results

**Tasks**:
1. Create `app/search/page.tsx` (Server Component)
   - Read `searchParams` from URL
   - Call `fetchSearchResults()`
   - Pass results to UI components
2. Create `components/search/SearchBar.tsx`
   - Text input with search icon
   - Form submission updates URL
   - Clear button
3. Create `components/search/FilterPanel.tsx`
   - Brand dropdown
   - Surface type radio buttons
   - Carbon plate checkbox (optional)
4. Create `components/search/ResultCard.tsx`
   - Display shoe data
   - Link to `/shoes/[id]`
   - Tailwind styling
5. Create `components/search/ResultsGrid.tsx`
   - Grid layout (responsive)
   - Map over results
6. Create `components/search/EmptyState.tsx`
   - Show when no results
7. Wire up components in `app/search/page.tsx`

**Acceptance Criteria**:
- ✅ `/search` page renders
- ✅ Search bar updates URL and shows results
- ✅ Filters update URL and show filtered results
- ✅ Results display in grid
- ✅ Empty state shows when no results
- ✅ Basic Tailwind styling

**Estimated Effort**: 4-6 hours

### Search-4: Add Pagination, Loading States, and Polish
**Goal**: Complete v1 with pagination, loading, error handling

**Tasks**:
1. Create `components/search/Pagination.tsx`
   - Previous/Next buttons
   - Page numbers
   - Total count display
2. Add loading state to `app/search/page.tsx`
   - Use React Suspense
   - Show skeleton cards
3. Create `components/search/LoadingState.tsx`
   - Skeleton cards
4. Add error handling
   - Catch Supabase errors
   - Show error message in UI
   - Log errors
5. Add search analytics
   - Log every query
   - Track: query, filters, result count, response time
6. Polish UI
   - Spacing, typography, colors
   - Hover states
   - Mobile responsiveness
   - Accessibility (ARIA labels, keyboard nav)
7. Test edge cases
   - Empty query
   - No results
   - Long query
   - Special characters
   - Invalid page numbers

**Acceptance Criteria**:
- ✅ Pagination works
- ✅ Loading state shows while fetching
- ✅ Error state shows if query fails
- ✅ Search analytics logged
- ✅ UI is polished and responsive
- ✅ Accessibility complete
- ✅ Edge cases handled

**Estimated Effort**: 3-4 hours

### Search-5 (Optional): Add Sort Options
**Goal**: Allow sorting by price, weight, etc.

**Tasks**:
1. Add `sortBy` to `SearchParams`
2. Update `fetchSearchResults()` to apply `.order()`
3. Create `components/search/SortDropdown.tsx`
4. Wire up to URL params

**Acceptance Criteria**:
- ✅ Sort dropdown updates URL
- ✅ Results sorted correctly

**Estimated Effort**: 1-2 hours

**Decision**: Defer to v2 if time is limited

---

## 8. Success Criteria (v1 MVP)

### Functional Requirements
- ✅ Users can search by text query (brand, model)
- ✅ Users can filter by brand and surface type
- ✅ Results display key specs (drop, weight, price, carbon plate)
- ✅ Pagination works (20-30 results per page)
- ✅ Empty state shows when no results
- ✅ Loading state shows while fetching

### Non-Functional Requirements
- ✅ Search response time < 500ms (typical queries)
- ✅ UI is responsive (mobile, tablet, desktop)
- ✅ Accessibility: keyboard navigation, ARIA labels
- ✅ Logging: all queries logged for analytics
- ✅ Error handling: graceful degradation

### Out of Scope (Defer to v2+)
- ❌ Real-time search (as-you-type)
- ❌ Advanced filters (price range, drop range, etc.)
- ❌ Sort options
- ❌ Full-text search with relevance ranking
- ❌ AI-assisted search
- ❌ Shoe detail pages (`/shoes/[id]`)
- ❌ Thumbnails/images
- ❌ Saved searches / favorites
- ❌ Export results (CSV, JSON)

---

## 9. Future Extensions (v2+)

### Advanced Filters
- Primary Use (Daily, Tempo, Race, Recovery, Trail)
- Drop range slider (0-12mm)
- Weight range slider (150-350g)
- Price range slider ($50-$300)
- Cushioning Level (Firm, Balanced, Max)
- Stability (Neutral, Stability)
- Gender (Men, Women, Unisex)
- Release Year

### Sort Options
- Relevance (default)
- Price: Low to High / High to Low
- Weight: Light to Heavy / Heavy to Light
- Drop: Low to High / High to Low
- Newest First

### AI-Assisted Search
- Natural language input
- Parse text → `SearchParams`
- Display inferred filters (editable)
- Optional reranking and match scoring
- Strict vs Creative modes

### Performance Optimizations
- Custom `search_sneakers()` RPC function
- PostgreSQL full-text search (`tsvector`, `tsquery`)
- Indexes on commonly filtered columns
- Query result caching

### UX Enhancements
- Real-time search (debounced)
- Infinite scroll option
- Saved searches
- Favorites / wishlist
- Export results (CSV, JSON)
- Comparison tool (side-by-side)

---

## 10. Assumptions & Open Questions

### Assumptions
1. **Data Quality**: `v_shoes_latest` has reasonably clean data
2. **Dataset Size**: < 10,000 shoes; direct queries are fast enough
3. **User Behavior**: Most users use simple text search + 1-2 filters
4. **No Authentication**: v1 Search is public (no login required)

### Open Questions
1. **Search Relevance**: Will simple ILIKE search rank results well enough?
2. **Performance**: Will direct queries scale to 100k+ shoes?
3. **Filter Priority**: Which filters are most important to users?
4. **Mobile UX**: Does filter panel work well on mobile?

### Next Steps After Search Feature
- **Detail-1**: Design shoe detail page (`/shoes/[id]`)
- **Admin-1**: Design admin dashboard and data management tools
- **Auth-1**: Design authentication and authorization

---

**End of Search Feature Design Document**
