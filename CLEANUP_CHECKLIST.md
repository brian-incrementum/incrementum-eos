# Scorecard RPC Loader - Post-Validation Cleanup Checklist

**⚠️ IMPORTANT: Only execute this cleanup after 24-48 hours of production validation with NO errors.**

## Pre-Cleanup Verification

Before starting cleanup, verify:
- [ ] `ENABLE_SCORECARD_RPC_LOADER=true` has been running in production for at least 24-48 hours
- [ ] No errors in production logs related to scorecard loading
- [ ] All scorecard pages load correctly (team scorecards, personal scorecards, various data sizes)
- [ ] Performance improvement has been measured and documented (should be ≥50% faster TTFB)
- [ ] All tests pass: `npm test`

## Cleanup Tasks

### 1. Remove Legacy Loader Logic from `lib/loaders/scorecard.ts`

**DELETE the following code blocks:**

#### A. Remove Import (line 5)
```typescript
import { loadScorecardAggregateViaRPC } from './scorecard-rpc'
```

#### B. Remove Feature Flag Logic and Update Function Signature (lines 40-65)
**FIND:**
```typescript
/**
 * Load the full scorecard aggregate used by the detail page, including:
 * - Scorecard record (ensuring it is active)
 * - Metrics with their recent entries
 * - Metric owner profiles
 * - Eligible employees for ownership reassignment
 *
 * Feature flag: ENABLE_SCORECARD_RPC_LOADER
 * - When true: Uses optimized RPC function (single database call)
 * - When false: Uses legacy multi-query loader (fallback)
 */
export async function loadScorecardAggregate({
  supabase,
  scorecardId,
  userId,
}: LoadScorecardAggregateOptions): Promise<ScorecardLoaderResult> {
  // Feature flag: Use RPC loader if enabled and userId is provided
  const useRpcLoader = process.env.ENABLE_SCORECARD_RPC_LOADER === 'true'

  if (useRpcLoader && userId) {
    console.log('[Scorecard Loader] Using RPC loader (optimized)')
    return loadScorecardAggregateViaRPC({ supabase, scorecardId, userId })
  }

  // Fallback to legacy multi-query loader
  console.log('[Scorecard Loader] Using legacy multi-query loader')
```

**REPLACE WITH:**
```typescript
/**
 * Load the full scorecard aggregate used by the detail page, including:
 * - Scorecard record (ensuring it is active)
 * - Metrics with their recent entries
 * - Metric owner profiles
 * - Eligible employees for ownership reassignment
 *
 * Uses optimized RPC function for single database call.
 */
export async function loadScorecardAggregate({
  supabase,
  scorecardId,
  userId,
}: LoadScorecardAggregateOptions): Promise<ScorecardLoaderResult> {
  return loadScorecardAggregateViaRPC({ supabase, scorecardId, userId })
}
```

#### C. Delete ALL Legacy Multi-Query Code (lines 66-325)
**DELETE FROM line 66 to the end of the `loadScorecardAggregate` function:**
- All the old scorecard fetching logic
- Metrics fetching
- Metric entries fetching
- Owner profiles fetching
- Entries grouping logic
- All the old return statement

**DELETE the following helper functions entirely:**
- `loadEmployeesForScorecard` (lines ~151-163)
- `loadTeamEmployees` (lines ~165-267)
- `loadAllEmployees` (lines ~270-325)

#### D. Update Interface (line 27)
The `userId` should remain required (not optional) since RPC needs it:
**Current:**
```typescript
interface LoadScorecardAggregateOptions {
  supabase: SupabaseClient<Database>
  scorecardId: string
  userId?: string
}
```
**Keep as is** (no change needed - userId is already being used)

---

### 2. Move RPC Loader to Main File (Consolidation)

**Option A: Keep separate files** (RECOMMENDED for maintainability)
- No changes needed
- `lib/loaders/scorecard-rpc.ts` contains the RPC implementation
- `lib/loaders/scorecard.ts` delegates to it

**Option B: Consolidate into single file** (optional, only if you prefer)
- Copy contents of `lib/loaders/scorecard-rpc.ts` into `lib/loaders/scorecard.ts`
- Delete `lib/loaders/scorecard-rpc.ts`
- Remove the import from step 1A above

**RECOMMENDATION: Choose Option A (keep files separate)** for better code organization.

---

### 3. Remove Environment Variable

**File: `.env.local`**

**DELETE:**
```
ENABLE_SCORECARD_RPC_LOADER=true
```

**DELETE from `.env.example` (if it exists):**
```
ENABLE_SCORECARD_RPC_LOADER=true
```

**DELETE from production environment variables** (Vercel/hosting platform):
- Remove `ENABLE_SCORECARD_RPC_LOADER` from environment configuration

---

### 4. Update TypeScript Interface Documentation

**File: `lib/loaders/scorecard.ts`**

**Update interface to require userId:**
```typescript
interface LoadScorecardAggregateOptions {
  supabase: SupabaseClient<Database>
  scorecardId: string
  userId: string  // Required for RPC permission validation
}
```

---

### 5. Delete This Checklist File

After all cleanup is complete and verified:
```bash
rm CLEANUP_CHECKLIST.md
```

---

## Post-Cleanup Verification

After completing all cleanup tasks:

1. **Run type checking:**
   ```bash
   npm run type-check
   # or
   npx tsc --noEmit
   ```

2. **Run tests:**
   ```bash
   npm test
   ```

3. **Run linting:**
   ```bash
   npm run lint
   ```

4. **Test locally:**
   ```bash
   npm run dev
   ```
   - Navigate to several scorecard pages
   - Check browser console for errors
   - Verify scorecards load correctly

5. **Commit changes:**
   ```bash
   git add .
   git commit -m "refactor: remove legacy scorecard loader after RPC validation"
   git push
   ```

6. **Monitor production:**
   - Watch for any errors in the first hour after deployment
   - Verify scorecard pages still load correctly

---

## Rollback Procedure (If Issues Arise)

If problems occur after cleanup:

1. **Immediate rollback via git:**
   ```bash
   git revert HEAD
   git push
   ```

2. **Check error logs** to diagnose the issue

3. **Fix and re-test** before attempting cleanup again

---

## Files Modified During Cleanup

- ✏️ `lib/loaders/scorecard.ts` (heavily modified)
- 🗑️ `lib/loaders/scorecard-rpc.ts` (optionally deleted if consolidating)
- 🗑️ `.env.local` (remove flag)
- 🗑️ `.env.example` (remove flag if exists)
- 🗑️ `CLEANUP_CHECKLIST.md` (delete after completion)

---

## Expected File Sizes After Cleanup

- `lib/loaders/scorecard.ts`: ~50-100 lines (down from ~326 lines)
- `lib/loaders/scorecard-rpc.ts`: ~90 lines (or deleted if consolidated)

---

## Success Criteria

- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Scorecard pages load in production
- ✅ No console errors or warnings
- ✅ Codebase is cleaner and more maintainable
- ✅ Performance improvements remain intact

---

**Last Updated:** 2025-01-04
**Created During:** Scorecard RPC Performance Optimization Implementation
