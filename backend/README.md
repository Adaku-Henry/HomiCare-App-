# HomiCare Backend

This Next.js service provides API routes for the existing Vite/React app and uses the same Supabase project. Requests use the caller's Supabase access token, so database row-level security remains active. Never put a Supabase service-role key in this backend's environment.

## Local setup

1. The backend reads the root `.env` values `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. For deployments, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the backend environment. `.env.example` lists those backend variables.
2. From the project root, run `npm install` once to install both npm workspaces.
3. From the project root, run `npm run dev` to start Vite and Next.js together. Vite proxies `/api` requests to port 3002 to avoid local port conflicts.
4. Apply the Supabase migrations in `../supabase/migrations` in timestamp order before using database routes.

The backend uses `.next-dev` for development and `.next` for production builds. This keeps `npm run build:backend` from replacing files that a running development server is using. Restart the development command after changing Next.js configuration.

## Routes

- `GET /api/health` reports whether the API process is running.
- `GET /api/services/categories` returns service categories.
- `GET /api/providers` returns public providers. Supports `q`, `categoryId`, `location`, `minRating`, `minExperience`, `maxPrice`, `verifiedOnly`, `availableOnly`, `businessOnly`, `sortBy`, and `limit` query parameters. Distance sorting falls back to recommended because the current provider schema has no customer coordinates.
- `GET /api/profiles/me` returns the signed-in user's private profile.
- `PATCH /api/profiles/me` updates allowed profile fields for the signed-in user.
- `GET /api/bookings` returns bookings visible to the signed-in user through RLS.
- `POST /api/bookings` creates a booking for the signed-in user.

Authenticated routes require `Authorization: Bearer <supabase-access-token>`.

In production, configure the hosting platform to route `/api/*` to this Next.js service, or set `VITE_BACKEND_URL` in the frontend to the backend's HTTPS origin and enable that origin in Supabase/hosting CORS configuration.