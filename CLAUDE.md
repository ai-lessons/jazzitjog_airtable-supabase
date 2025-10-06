# Claude Code Working Instructions

**Project:** ChatOpenAI Integration Assistant  
**Purpose:** Complete guide for efficient development  
**Last Updated:** 2025-09-30

---

## 🎯 READ FIRST (Priority Order)

1. **PROJECT_ARCHITECTURE.md** - 🎯 SINGLE SOURCE OF TRUTH for backlog
2. **supabase/docs/DATABASE_CHANGELOG.md** - current DB structure  
3. **README.md** - project overview

---

## 🚫 NEVER DO

- Create new tables without analyzing existing schema
- Duplicate OpenAI API calls (especially in polling)
- Update DB structure without migration script
- Skip Cyrillic→Latin transliteration for OpenAI API
- Ignore RLS policies in Supabase
- Start coding without reading PROJECT_ARCHITECTURE.md
- Complete sprint without updating documentation

---

## ✅ ALWAYS DO

- Read PROJECT_ARCHITECTURE.md before architectural changes
- Test migrations in dev environment
- Update TypeScript types after DB changes
- Ask user confirmation before major changes
- Use existing patterns (see below)
- Document changes in DATABASE_CHANGELOG.md
- Update all 4 key files at sprint completion

---

## 🏗️ Core Architecture

### Critical Decisions
- **Files:** OpenAI Files API (NOT Supabase Storage)
- **State:** Zustand (NOT Redux/Context)
- **Database:** PostgreSQL via Supabase, JSONB for file metadata
- **Polling:** Reuse lastRunCheck to avoid duplicate API calls

### OpenAI Integration
- **ALWAYS transliterate names:** Cyrillic→Latin for OpenAI API
- **System prompt:** base_prompt + file_instruction
- **File flow:** Upload to OpenAI → Save metadata to DB → Update assistant

### Database
- **Primary Keys:** UUID only
- **File metadata:** JSONB arrays with GIN indexes
- **Constraints:** Max 20 files per personality
- **Migrations:** `node apply-migration.mjs`, no BEGIN/COMMIT with rpc

---

## 🔧 Essential Code Patterns

### 1. OpenAI Service Method
```typescript
async newMethod(param: string): Promise<ResultType> {
  if (!this.client) throw new Error('OpenAI client not initialized');
  
  try {
    const result = await this.client.someAPI({
      name: transliterate(param), // ALWAYS transliterate!
    });
    return result;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`Failed: ${error}`);
  }
}
```

### 2. Zustand Store Action
```typescript
newAction: async (param: string) => {
  const { openaiService } = get();
  try {
    set({ loading: true, error: null });
    
    // 1. Update DB
    const { data, error } = await supabase
      .from('table_name')
      .update({ field: param })
      .select()
      .single();
    if (error) throw error;
    
    // 2. Sync OpenAI if needed
    await openaiService.syncMethod(data.id);
    
    // 3. Update state
    set({ data: data, loading: false });
  } catch (error) {
    set({ loading: false, error: error.message });
  }
}
```

### 3. Database Migration
```javascript
async function migrate() {
  // Separate calls, no transactions!
  const { error: error1 } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE personalities ADD COLUMN IF NOT EXISTS field TEXT;'
  });
  if (error1) throw error1;
  
  const { error: error2 } = await supabase.rpc('exec_sql', {
    sql: 'CREATE INDEX IF NOT EXISTS idx_field ON personalities(field);'
  });
  if (error2) throw error2;
}
```

### 4. TypeScript Type Update
```typescript
export interface Database {
  public: {
    Tables: {
      personalities: {
        Row: {
          id: string;
          name: string;
          new_field: string | null; // Match DB nullability
        };
        Insert: {
          id?: string;
          new_field?: string; // Optional
        };
        Update: {
          new_field?: string; // Optional
        };
      };
    };
  };
}
```

### 5. Polling Optimization
```typescript
sendMessage: async (message: string) => {
  const { lastRunCheck, openaiService } = get();
  
  const run = await openaiService.createRun(threadId, assistantId);
  
  let runStatus = run.status;
  while (runStatus !== 'completed' && runStatus !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // ✅ Reuse lastRunCheck if same run
    const checkResult = lastRunCheck?.id === run.id 
      ? lastRunCheck 
      : await openaiService.checkRun(threadId, run.id);
    
    runStatus = checkResult.status;
    set({ lastRunCheck: checkResult });
  }
}
```

### 6. React Component with Zustand
```typescript
export function MyComponent() {
  // ✅ Selective subscriptions - only re-render when these change
  const items = useStore(state => state.items);
  const loading = useStore(state => state.loading);
  
  // ❌ Don't do this - subscribes to everything
  // const everything = useStore();
  
  return (
    <div>
      {loading && <Spinner />}
      {items.map(item => <Item key={item.id} {...item} />)}
    </div>
  );
}
```

---

## 🐛 Top Issues & Quick Fixes

### 1. Duplicate OpenAI API Calls
**Symptom:** Multiple "Run status" logs, rate limit errors  
**Cause:** Not reusing lastRunCheck in polling  
**Fix:** Use pattern #5 above in `src/store/useStore.ts:sendMessage()`

### 2. Cyrillic Names Rejected
**Symptom:** "Invalid name parameter" from OpenAI  
**Cause:** Missing transliteration  
**Fix:** ALWAYS use `transliterate(name)` in `src/lib/openai.ts` methods  
**Test:** `transliterate('Тестовый')` → `"Testovyy"`

### 3. Migration Fails
**Symptom:** Transaction deadlock, changes not applied  
**Cause:** Using BEGIN/COMMIT with rpc or multiple DDL in one call  
**Fix:** Use pattern #3 above - separate rpc calls, no transactions

### 4. TypeScript Type Errors
**Symptom:** Type mismatches after DB change  
**Cause:** Database interface not updated  
**Fix:** Update pattern #4 in `src/lib/supabase.ts` to match DB schema

### 5. File Upload Not Working
**Symptom:** File not appearing in assistant  
**Cause:** Wrong flow - using Supabase Storage instead of OpenAI  
**Fix:** Upload to OpenAI Files API → Save metadata to DB → Update assistant

---

## 🔄 Sprint Workflow

### Phase 1: Planning (5-10% time)
1. Understand request
2. Read PROJECT_ARCHITECTURE.md (what's done?)
3. Read DATABASE_CHANGELOG.md (current DB?)
4. Create TODO list
5. Get user confirmation

### Phase 2: Implementation (70-80% time)
1. Start bottom-up: DB → Types → Services → State → UI
2. Make incremental commits
3. Test as you go
4. Update TODO checklist

### Phase 3: Testing (10-15% time)
1. Manual testing (happy path + edge cases)
2. Run checks: `npm run type-check`, `npm run build`
3. Ask user to test
4. Fix issues before documenting

### Phase 4: Documentation (10-15% time) 🚨 NEVER SKIP!
1. Update PROJECT_ARCHITECTURE.md (status + components)
2. Update DATABASE_CHANGELOG.md (if DB changed)
3. Update CLAUDE.md (new patterns/issues)
4. Update README.md (version bump)

### Phase 5: Completion (5% time)
1. Create final commit (use template below)
2. Push changes
3. Ask user: "Ready to close sprint?"

---

## 📝 Sprint Commit Template

```bash
Sprint: [Feature brief]

- Implemented: [core functionality]
- Updated: PROJECT_ARCHITECTURE.md, DATABASE_CHANGELOG.md
- Fixed: [if any]
- Docs: updated project documentation

Tested:
✓ [test 1]
✓ [test 2]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🌳 Decision Tree: New Feature

```
User requests feature
├─ DB changes needed?
│  ├─ YES → Read DATABASE_CHANGELOG → Plan migration
│  └─ NO → Analyze code
├─ Touches OpenAI API?
│  ├─ YES → Check transliteration + polling
│  └─ NO → Continue
└─ Similar pattern exists?
   ├─ YES → Reuse pattern
   └─ NO → Propose solution for discussion
```

---

## 📟 Quick Commands

```bash
# Database
node apply-migration.mjs
npm run supabase:test

# Development
npm run dev
npm run build
npm run type-check

# Navigation
tree -L 2 -I 'node_modules|dist'
rg "search_term" --type ts

# Debugging
localStorage.getItem('openai_api_key')
useStore.getState()
```

---

## 🔍 Quick Diagnostics

### Database
```sql
-- Check structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'personalities';

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'personalities';
```

### State
```typescript
// Browser console
const state = useStore.getState();
console.log('State:', state);
```

### Network
```javascript
// Monitor OpenAI calls
let count = 0;
const orig = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('openai')) {
    console.log(`API call #${++count}:`, args[0]);
  }
  return orig.apply(this, args);
};
```

---

## 📋 Sprint Completion Checklist

**🚨 MANDATORY before closing sprint:**

- [ ] Feature works as specified
- [ ] Tests pass (manual + type-check + build)
- [ ] No console errors
- [ ] PROJECT_ARCHITECTURE.md updated
- [ ] DATABASE_CHANGELOG.md updated (if DB changed)
- [ ] CLAUDE.md updated (if new patterns/issues)
- [ ] README.md version bumped
- [ ] Final commit created
- [ ] User confirmed closure

---

## 🎯 Success Metrics

**Sprint is complete when:**
- ✅ All 4 documentation files updated
- ✅ Changes committed with proper message
- ✅ User confirmed closure

**Sprint is NOT complete when:**
- ❌ Documentation not updated
- ❌ No commit created
- ❌ User not asked for confirmation

---

## 📚 Naming Conventions

```typescript
// Files
my-component.tsx        // Kebab-case
MyComponent.tsx        // PascalCase for React

// Variables
const userName = '';   // camelCase
const MAX_SIZE = 20;   // SCREAMING_SNAKE for constants

// Database
user_profiles         // snake_case tables
created_at           // snake_case columns

// Functions
async fetchData()    // camelCase, verb prefix
function isValid()   // Boolean: is/has/can prefix
```

---

## 🔄 Quick Recovery

### Rollback Migration
```bash
node migrations/rollback_xxx.mjs
# Then update src/lib/supabase.ts types
```

### Reset State
```typescript
// Browser console
useStore.setState({ 
  personalities: [],
  selectedPersonality: null,
  error: null 
});
useStore.getState().loadPersonalities();
```

### Emergency Reset
```bash
git stash save "backup_$(date +%Y%m%d)"
git reset --hard <last_good_commit>
rm -rf node_modules && npm install
npm run dev
```

---

*Updated at each sprint completion*  
*Last updated: 2025-09-30*