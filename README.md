# HomiCare

HomiCare is a React, TypeScript, and Vite application for discovering household services, managing bookings, and supporting service providers. Supabase provides authentication, data storage, and backend services; the `backend` workspace contains the API service.

## Project layout

```text
src/
  App.tsx                 Application shell and page composition
  context/                Shared application and authentication state
  features/               Feature entry points used by the application shell
    auth/
    bookings/
    community/
    messaging/
    operations/
    profile/
    providers/
    workspaces/
  lib/                    Supabase, backend, and shared utility modules
  types/                  Shared TypeScript types
  *.tsx                   Existing feature implementations
supabase/
  migrations/             Ordered, forward-only database migrations
backend/                  API workspace
```

Feature entry points under `src/features/` expose the existing page implementations and provide a stable import boundary for `App.tsx`. The implementations remain at their existing paths while they are migrated incrementally; avoid moving them without updating their imports and validating the app.

## Local development

Install dependencies with `npm install`, then start the frontend and backend together:

```bash
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run lint
npm run build
```

Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_BACKEND_URL` in `.env` for local development. Do not commit credentials.

## Member discovery, connections, and APK builds

Member discovery and member-to-member text messaging use the same Supabase project as sign-in. Apply `supabase/migrations/20261017230000_homicare_member_discovery_messaging.sql` to that exact project before releasing the updated client. It adds a privacy-filtered member directory, connection-request RPCs, row-level security for messages, Realtime publication, and connected-member call signaling.

New sign-ups are asked whether signed-in HomiCare members may discover their profile. Existing accounts remain governed by their current setting; users must choose **HomiCare Users** or **Public** in Profile Settings to appear in People. Phone and neighborhood remain hidden unless separately enabled. Private profiles stay out of discovery. Provider service listings remain a separate directory and still require provider approval.

On Windows PowerShell, from the repository root:

```powershell
npm.cmd run typecheck
npm.cmd run build:android
Push-Location android
.\gradlew.bat assembleRelease
Pop-Location
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the production Supabase project before building; those values are embedded in the APK. Install and test the generated `android\app\build\outputs\apk\release\app-release.apk` on two separate phones using different accounts. Confirm that each profile is discoverable, a connection request can be accepted, messages arrive in both directions, and microphone/camera permissions are granted for calls. The current WebRTC client uses STUN only; dependable calls across restrictive mobile networks also need a TURN relay with short-lived credentials issued by a trusted server.

The checked-in `backend/` workspace is Next.js; this repository does not contain Django source or a Django endpoint configuration. The new member directory, connection, messaging, and signaling flows use the existing Supabase client directly and do not assume a Django API URL.

## Supabase migrations

Migrations live in `supabase/migrations/` and are applied in filename order. Log in and link the intended Supabase project before previewing or applying migrations:

```bash
npx supabase login
npx supabase projects list
npx supabase link --project-ref PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

Confirm that the linked project is active and that the dry-run targets the intended project before applying changes. A schema migration push does not copy or merge data from another Supabase project.

Provider onboarding upserts the provider row by the signed-in account ID. Apply `20261018010000_provider_account_linking.sql` before releasing that onboarding change; it enforces one provider profile per account. If this migration reports duplicate provider rows for an account, resolve those records deliberately before retrying. Do not claim an unlinked legacy provider row by matching only a display name.
"# HomiCare-App-" 
