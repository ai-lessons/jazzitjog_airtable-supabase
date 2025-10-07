# Staging Pipeline Setup Guide

## Overview

The staging pipeline automatically checks Airtable every 72 hours for new shoe articles, processes them, and adds results to a staging table for admin review before moving to production.

## Architecture

```
Airtable (new articles)
    ↓
GitHub Action (every 72h)
    ↓
ETL Pipeline
    ↓
staging_table (review)
    ↓
Admin approval
    ↓
shoe_results (production)
```

## Setup Steps

### 1. Create Database Tables

Run the SQL migration in Supabase SQL Editor:

```bash
# The SQL file is located at:
web-app/migrations/create-staging-tables.sql
```

Or use the migration script:
```bash
cd web-app
node migrations/apply-staging-migration.mjs
```

This creates:
- `staging_table` - holds items pending review
- `approval_logs` - tracks approval history

### 2. Set Admin User Role

In Supabase Dashboard → Authentication → Users:

1. Find your user
2. Click "Edit user"
3. Under "User Metadata" add:
```json
{
  "role": "admin"
}
```

4. Save changes

### 3. Configure GitHub Secrets

In GitHub repository → Settings → Secrets and variables → Actions:

Add these secrets:
```
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_base_id
AIRTABLE_TABLE_NAME=Running Shoe Articles
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

### 4. (Optional) Setup Email Notifications

For email notifications when new items appear in staging:

1. Sign up for [Resend](https://resend.com)
2. Get API key
3. Add to `.env.local`:
```bash
RESEND_API_KEY=re_xxxxx
```

4. Update domain in `web-app/src/app/api/notify-approval/route.ts`:
```typescript
from: 'Sneaker Pipeline <noreply@yourdomain.com>'
```

### 5. Enable GitHub Action

The workflow is located at `.github/workflows/etl-staging.yml`

It runs automatically every 72 hours, or you can trigger manually:
- Go to Actions tab
- Select "ETL to Staging"
- Click "Run workflow"

## Usage

### Admin Workflow

1. **New items appear in staging**
   - GitHub Action runs ETL every 72 hours
   - New items from Airtable → staging_table
   - Email notification sent to a.altalt.t@gmail.com

2. **Review items**
   - Go to `/staging` page (visible only to admins)
   - Double-click rows to edit
   - Save changes (row turns green)
   - Or delete unwanted items

3. **Approve items**
   - **Single approve**: Click "Approve" button on each row
   - **Batch approve**: Click "Approve X items" button (top-right)
   - Approved items → moved to `shoe_results`
   - Deleted from `staging_table`
   - Logged in `approval_logs`

4. **View logs**
   - Go to `/logs` page
   - See approval history
   - Brand breakdowns
   - Total counts

### Manual ETL Run

```bash
# From project root
npm run etl:staging
```

## Features

### Staging Table
- ✅ Identical structure to shoe_results
- ✅ Only new Airtable records processed
- ✅ Duplicate prevention via airtable_id
- ✅ Admin-only access (RLS policies)

### UI Features
- ✅ Table view (same as Search page, no filters)
- ✅ Edit mode (double-click row)
- ✅ Green highlight for edited items
- ✅ Single-row approve
- ✅ Batch approve
- ✅ Pagination

### Logging
- ✅ Approval timestamp
- ✅ Brand counts
- ✅ Total in production
- ✅ Activity log page

## Troubleshooting

### "Access denied: Admin privileges required"

**Solution**: Check user metadata has `"role": "admin"`

### GitHub Action fails

**Solution**:
1. Check all secrets are configured
2. View workflow logs in Actions tab
3. Check Supabase service role key has permissions

### No email notifications

**Solution**:
1. Add `RESEND_API_KEY` to environment
2. Verify domain ownership in Resend
3. Check spam folder

### Items not appearing in staging

**Solution**:
1. Check Airtable has new records (not already processed)
2. Verify `airtable_id` field exists in Airtable
3. Run `npm run etl:staging` manually to debug

## Files Reference

### Backend
- `src/etl/run-staging.ts` - Staging ETL pipeline
- `src/etl/upsert/to_staging.ts` - Staging insert logic
- `web-app/src/app/api/staging/*` - Staging APIs
- `web-app/src/app/api/logs/*` - Logs API

### Frontend
- `web-app/src/app/staging/page.tsx` - Staging review page
- `web-app/src/app/logs/page.tsx` - Activity log page
- `web-app/src/components/Navigation.tsx` - Admin nav

### Database
- `web-app/migrations/create-staging-tables.sql` - Schema
- RLS policies ensure admin-only access

### CI/CD
- `.github/workflows/etl-staging.yml` - Automated ETL

## Environment Variables

### Required for ETL
```bash
AIRTABLE_API_KEY=
AIRTABLE_BASE_ID=
AIRTABLE_TABLE_NAME=
SUPABASE_URL=
SUPABASE_KEY=
OPENAI_API_KEY=
```

### Optional
```bash
RESEND_API_KEY=           # Email notifications
```

## Security

- ✅ RLS policies on staging_table (admin only)
- ✅ RLS policies on approval_logs (admin only)
- ✅ Service role bypasses RLS (for GitHub Actions)
- ✅ Frontend checks user metadata role
- ✅ API validates admin role on every request

## Testing

### Test locally:
```bash
# 1. Set environment variables in .env
# 2. Run staging ETL
npm run etl:staging

# 3. Check staging table in Supabase
# 4. Test UI at http://localhost:3000/staging
```

### Test GitHub Action:
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow" → "Run workflow"
4. Monitor execution
5. Check staging table for new items

---

## Summary

✅ **Automated**: Runs every 72 hours via GitHub Actions
✅ **Safe**: Review before production
✅ **Traceable**: Complete approval logging
✅ **Notified**: Email alerts for new items
✅ **Secure**: Admin-only access

For questions or issues, check logs in:
- GitHub Actions output
- Supabase logs
- `web-app/src/app/logs` page
