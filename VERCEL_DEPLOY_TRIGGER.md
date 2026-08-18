# Vercel deployment trigger

This file intentionally exists to trigger a fresh Vercel Production deployment from the connected `main` branch.

Latest change: targeted Supabase future-JWT recovery now refreshes the persisted session and retries the safe profile/data read with a fresh access token, with cache-busted loading in production.
