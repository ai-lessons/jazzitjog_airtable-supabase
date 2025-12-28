# Code Improvement Analysis for `resolver.ts`

## Issues Identified in the Highlighted Section

### 1. **Duplicate Filter Logic (DRY Violation)**

**Location:** Lines 438-445 in `main()` function

```typescript
// In fetchBatchWithRetry (line 408):
let orFilter = 'specs_json->>mode.eq.ambiguous_multi,specs_json->>resolution_failed_reason.not.is.null';
if (forceLlm) {
  orFilter += ',specs_json->>mode.eq.llm_gate_skipped';
}

// In main() (line 438):
let orFilter =
  'specs_json->>mode.eq.ambiguous_multi,specs_json->>resolution_failed_reason.not.is.null';

if (forceLlm) {
  orFilter += ',specs_json->>mode.eq.llm_gate_skipped';
}

if (isDebug) {
  logger.debug({ batch: batchNumber, orFilter }, 'Using .or() filter for ambiguous_multi fetch');
}
```

**Problem:** The `orFilter` is constructed in **two places**:
1. Inside `fetchBatchWithRetry()` (correctly includes `forceLlm` logic)
2. Inside `main()` (does NOT include `forceLlm` logic, only used for debug logging)

**Impact:** The debug log shows an **incorrect/incomplete filter** that doesn't match what's actually being used in the query. This creates confusion during debugging.

---

### 2. **Unused Variable in Debug Block**

The `orFilter` variable in `main()` is only used for debug logging but doesn't reflect the actual query filter being executed.

---

### 3. **Redundant `selectString` Declaration**

The `selectString` is declared in both `fetchBatchWithRetry()` and `main()`, but only the one in `fetchBatchWithRetry()` is actually used.

---

## Recommended Refactorings

### **Solution 1: Extract Filter Builder Function (Best Practice)**

Create a pure function to build the filter, ensuring consistency:

```typescript
// Add this helper function near the top with other helpers
function buildOrFilter(includeForceLlm: boolean): string {
  let filter = 'specs_json->>mode.eq.ambiguous_multi,specs_json->>resolution_failed_reason.not.is.null';
  
  if (includeForceLlm) {
    filter += ',specs_json->>mode.eq.llm_gate_skipped';
  }
  
  return filter;
}

// Update fetchBatchWithRetry:
async function fetchBatchWithRetry(cursor: number, batchNumber: number): Promise<any> {
  const orFilter = buildOrFilter(forceLlm);
  const selectString = 'ID, "Article link", "Title", specs_json';

  const fetchOperation = async () => {
    const { data, error } = await supabase
      .from('JazzItJog_db')
      .select(selectString)
      .or(orFilter)
      .order('ID', { ascending: true })
      .gt('ID', cursor)
      .limit(resolverBatchSize);

    if (error) {
      const err = new Error(`Supabase query error: ${error.message}`);
      (err as any).code = error.code;
      (err as any).details = error.details;
      (err as any).hint = error.hint;
      throw err;
    }
    return { data, error: null };
  };

  return withRetry(fetchOperation, 5, 500, 15000);
}

// Update main():
async function main() {
  let cursor = 0;
  let batchNumber = 0;
  let totalProcessed = 0;

  while (true) {
    if (resolverLimit > 0 && totalProcessed >= resolverLimit) {
      logger.info({
        step: 'limit_reached',
        resolver_limit: resolverLimit,
        total_processed: totalProcessed
      }, 'Resolver limit reached, stopping early');
      break;
    }

    batchNumber++;
    
    if (isDebug) {
      const orFilter = buildOrFilter(forceLlm);
      const selectString = 'ID, "Article link", "Title", specs_json';
      logger.debug({ 
        batch: batchNumber, 
        orFilter,
        selectString,
        forceLlm,
        llmGateEnabled 
      }, 'Fetching batch with filter');
    }

    let data;
    try {
      const result = await fetchBatchWithRetry(cursor, batchNumber);
      data = result.data;
    } catch (err: any) {
      logger.error({
        error: err.message,
        errorName: err.name,
        errorCode: err.code,
        errorCause: err.cause,
        batch: batchNumber,
        step: 'supabase_fetch_failed_after_retries'
      }, 'Failed to fetch batch after all retries');
      break;
    }

    if (!data || data.length === 0) {
      logger.info({ step: 'no_more_rows', batch: batchNumber - 1, total_processed: totalProcessed }, 'No more ambiguous_multi rows to process');
      break;
    }

    logger.info({ step: 'batch_start', batch: batchNumber, batch_size: data.length }, `Processing batch ${batchNumber} with ${data.length} rows`);

    for (const row of data) {
      await processRow(row);
      cursor = row.ID;
      totalProcessed++;
    }
  }

  logger.info({ step: 'resolver_complete', total_processed: totalProcessed }, 'Ambiguous specs resolver completed');
}
```

---

### **Solution 2: Return Filter from fetchBatchWithRetry (Alternative)**

If you want to keep the filter construction inside `fetchBatchWithRetry`, return it for logging:

```typescript
async function fetchBatchWithRetry(cursor: number, batchNumber: number): Promise<{ data: any; orFilter: string }> {
  const orFilter = buildOrFilter(forceLlm);
  const selectString = 'ID, "Article link", "Title", specs_json';

  const fetchOperation = async () => {
    const { data, error } = await supabase
      .from('JazzItJog_db')
      .select(selectString)
      .or(orFilter)
      .order('ID', { ascending: true })
      .gt('ID', cursor)
      .limit(resolverBatchSize);

    if (error) {
      const err = new Error(`Supabase query error: ${error.message}`);
      (err as any).code = error.code;
      (err as any).details = error.details;
      (err as any).hint = error.hint;
      throw err;
    }
    return { data, error: null };
  };

  const result = await withRetry(fetchOperation, 5, 500, 15000);
  return { data: result.data, orFilter };
}

// In main():
const result = await fetchBatchWithRetry(cursor, batchNumber);
data = result.data;

if (isDebug) {
  logger.debug({ 
    batch: batchNumber, 
    orFilter: result.orFilter 
  }, 'Fetched batch with filter');
}
```

---

## Additional Improvements

### **3. Type Safety for Row Data**

Define an interface for the row structure:

```typescript
interface ArticleRow {
  ID: number;
  'Article link': string;
  Title: string;
  specs_json: any; // Could be further typed with Zod
}

async function processRow(row: ArticleRow): Promise<void> {
  // ... existing code
}
```

### **4. Extract Magic Strings to Constants**

```typescript
const QUERY_FIELDS = 'ID, "Article link", "Title", specs_json' as const;
const TABLE_NAME = 'JazzItJog_db' as const;

const FILTER_CONDITIONS = {
  AMBIGUOUS_MULTI: 'specs_json->>mode.eq.ambiguous_multi',
  RESOLUTION_FAILED: 'specs_json->>resolution_failed_reason.not.is.null',
  LLM_GATE_SKIPPED: 'specs_json->>mode.eq.llm_gate_skipped',
} as const;

function buildOrFilter(includeForceLlm: boolean): string {
  let filter = `${FILTER_CONDITIONS.AMBIGUOUS_MULTI},${FILTER_CONDITIONS.RESOLUTION_FAILED}`;
  
  if (includeForceLlm) {
    filter += `,${FILTER_CONDITIONS.LLM_GATE_SKIPPED}`;
  }
  
  return filter;
}
```

### **5. Improve Debug Logging Consistency**

```typescript
if (isDebug) {
  logger.debug({ 
    batch: batchNumber, 
    orFilter: buildOrFilter(forceLlm),
    selectString: QUERY_FIELDS,
    config: {
      forceLlm,
      llmGateEnabled,
      resolverBatchSize,
      resolverLimit,
    }
  }, 'Fetching batch with configuration');
}
```

### **6. Consider Using Query Builder Pattern**

For more complex queries, consider a builder:

```typescript
class ResolverQueryBuilder {
  private filters: string[] = [];
  
  addAmbiguousMulti(): this {
    this.filters.push(FILTER_CONDITIONS.AMBIGUOUS_MULTI);
    return this;
  }
  
  addResolutionFailed(): this {
    this.filters.push(FILTER_CONDITIONS.RESOLUTION_FAILED);
    return this;
  }
  
  addLlmGateSkipped(): this {
    this.filters.push(FILTER_CONDITIONS.LLM_GATE_SKIPPED);
    return this;
  }
  
  build(): string {
    return this.filters.join(',');
  }
}

// Usage:
const queryBuilder = new ResolverQueryBuilder()
  .addAmbiguousMulti()
  .addResolutionFailed();

if (forceLlm) {
  queryBuilder.addLlmGateSkipped();
}

const orFilter = queryBuilder.build();
```

---

## Summary of Benefits

1. **DRY Principle**: Single source of truth for filter construction
2. **Consistency**: Debug logs accurately reflect actual queries
3. **Maintainability**: Changes to filter logic only need to happen in one place
4. **Type Safety**: Better TypeScript typing reduces runtime errors
5. **Testability**: Pure functions are easier to unit test
6. **Readability**: Named constants make intent clearer

---

## Priority Recommendations

**High Priority:**
- ✅ Extract `buildOrFilter()` function (Solution 1)
- ✅ Remove duplicate filter construction in `main()`

**Medium Priority:**
- ⚠️ Add type interfaces for row data
- ⚠️ Extract magic strings to constants

**Low Priority (Nice to Have):**
- 💡 Query builder pattern (only if complexity grows)
