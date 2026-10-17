# Vercel deployment guide

This project is split into two deployable apps:

1. Frontend app: the Vite + React site in the project root
2. Backend app: the Next.js API layer in the `backend/` folder

## 1) Deploy the backend

Import the `backend` folder as a separate Vercel project.

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (if needed by server actions or admin-only routes)

Your backend project root should be:

- `project/backend`

Vercel should detect this as a Next.js app automatically.

## 2) Deploy the frontend

Import the project root as a separate Vercel project.

Set these environment variables in the root project:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_BACKEND_URL=https://<your-backend-project>.vercel.app`

The root project should use:

- Framework: Vite
- Root directory: `project`
- Build command: `npm run build:frontend`
- Output directory: `dist`

## 3) Production API URL

The frontend is configured to use `VITE_BACKEND_URL` and defaults to `/api` for local development. For production, point it at the deployed backend URL. This is the value that should be used in Vercel environment settings.

## 4) Deploy command

If you have Vercel CLI access, run:

```bash
cd project
npx vercel --prod
```

For the backend project:

```bash
cd project/backend
npx vercel --prod
```

> The CLI is not available in this sandbox because the local environment blocks the Node installation path, so a live push cannot be completed from here. The app is prepared for deployment as soon as your Vercel account is authenticated on your machine.
