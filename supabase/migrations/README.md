# Supabase Migrations

This directory contains SQL migrations for the Sneaker Pipeline database.

How to apply
- Use the Supabase CLI, Postgres client, or your CI job to apply these SQL files in order.
- Migrations are additive and safe by default; avoid destructive changes.

Order (current)
1. create-staging-tables.sql
2. 002-fix-staging-table-columns.sql
3. 003-fix-staging-unique-constraint.sql
4. 004-add-is-edited-to-staging.sql
5. 005-make-article-id-nullable.sql
6. 006-remove-unique-constraint-shoe-results.sql
7. 007-add-airtable-id-to-shoe-results.sql
8. 008-migrate-record-id-to-airtable-id.sql

Notes
- Previous migrations lived under `web-app/migrations/*`. They have been relocated here for consistency.
- Keep `supabase/docs/DATABASE_CHANGELOG.md` updated when schema changes.
