# Authentication Fix - Magic Link

## Problem
Magic link authentication was stuck at "Processing authentication..." screen.

## Root Causes
1. **Wrong redirect URL**: Login form was redirecting to `/auth/confirm` instead of `/auth/callback`
2. **Type check bug**: Auth confirm page was only accepting `type=magiclink`, but Supabase can send other types
3. **Missing retry limit**: Could retry infinitely if tokens weren't found

## Changes Made

### 1. Fixed Login Redirect URL
**File:** `src/app/login/page.tsx`
- Changed: `emailRedirectTo: '/auth/confirm'`
- To: `emailRedirectTo: '/auth/callback'`

### 2. Improved Auth Confirm Handler
**File:** `src/app/auth/confirm/page.tsx`
- Removed strict `type !== 'magiclink'` check (now accepts any type)
- Added retry limit (max 10 attempts)
- Added error handling for URL error parameters
- Added better logging

### 3. Verified Callback Route
**File:** `src/app/auth/callback/route.ts`
- Already correctly handles both PKCE flow and magic link flow
- Properly sets cookies and redirects

## Supabase Dashboard Configuration

### Required Redirect URLs
Add these URLs to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:

**For Development:**
```
http://localhost:3000/auth/callback
http://localhost:3000/auth/confirm
```

**For Production:**
```
https://your-domain.com/auth/callback
https://your-domain.com/auth/confirm
```

### Steps to Configure:
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/auth/url-configuration
2. Add both `/auth/callback` and `/auth/confirm` URLs
3. Click "Save"

## Testing

### Test Flow:
1. Go to `/login`
2. Enter email and click "Send magic link"
3. Check email for magic link
4. Click the link
5. Should redirect to `/auth/callback` → process auth → redirect to `/`

### Debug Tools:
- Check console logs in browser DevTools
- Use `/auth/debug` page to inspect URL parameters
- Check server logs for `[AUTH CALLBACK]` messages

## Expected Behavior

1. **User clicks magic link** → Goes to `/auth/callback?token_hash=...&type=magiclink`
2. **Callback route processes auth** → Sets session cookies
3. **Redirects to homepage** → User is authenticated

## Alternative: Client-Side Auth (Current Setup)

If Supabase sends tokens in URL hash instead of query params:
- Magic link → `/auth/confirm#access_token=...&refresh_token=...`
- Client-side JS extracts tokens from hash
- Calls `supabase.auth.setSession()` with tokens

Both methods are supported by the current implementation.

## Troubleshooting

### Issue: Still stuck at "Processing authentication..."
**Check:**
1. Browser console for errors
2. Supabase redirect URLs configuration
3. Email link format (should have `token_hash` or `access_token`)

### Issue: "Authentication timed out"
**Cause:** No tokens found in URL after 10 retries
**Fix:**
- Verify redirect URL in Supabase matches `/auth/callback`
- Check that magic link wasn't already used
- Request new magic link

### Issue: "Invalid link" error
**Cause:** Missing required parameters
**Fix:**
- Magic link might be expired (links expire after 1 hour)
- Request new magic link

## Environment Variables

Ensure these are set in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Future Improvements

1. Add loading state with progress indicator
2. Add "Resend magic link" button on confirm page
3. Show more helpful error messages
4. Add email verification status check
