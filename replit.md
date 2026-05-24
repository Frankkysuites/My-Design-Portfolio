# Designer Portfolio

A fully responsive portfolio website for a Graphics and Product Designer with a password-protected admin panel for uploading and managing projects live — no redeployment needed.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/portfolio run dev` — run the portfolio frontend (port 21113)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` — Object storage (auto-set)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite + Tailwind CSS
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Storage: Replit Object Storage (GCS-backed, equivalent to Vercel Blob)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/projects.ts` — DB schema for portfolio projects
- `artifacts/api-server/src/routes/projects.ts` — Project CRUD routes
- `artifacts/api-server/src/routes/admin.ts` — Admin login/logout/session routes
- `artifacts/api-server/src/routes/storage.ts` — Object storage upload + serving routes
- `artifacts/portfolio/src/pages/home.tsx` — Public portfolio page
- `artifacts/portfolio/src/pages/admin.tsx` — Password-protected admin panel

## Architecture decisions

- Object storage (Replit GCS) used for images — same concept as Vercel Blob but runs on Replit
- Presigned URL upload flow: client requests URL from server, then uploads file directly to GCS
- Admin auth via httpOnly session cookie with hardcoded password — simple and effective for a portfolio
- Project metadata stored in PostgreSQL; image paths stored as `objectPath` strings
- No Next.js — uses React+Vite frontend + Express backend (Replit-native stack)

## Product

- **Public portfolio page (`/`)**: Responsive 3-column project grid, category filter tabs (All / Graphics / Product Design), image lightbox modal with title/description/category, contact section with social links
- **Admin panel (`/admin`)**: Password-protected login, image upload form (JPG/PNG, max 5MB), project management list with delete buttons

## User preferences

- Admin password: `designer2025` (change in `artifacts/api-server/src/routes/admin.ts` → `ADMIN_PASSWORD` constant, or set `ADMIN_PASSWORD` env var)
- To change the designer name/email/social links: edit `artifacts/portfolio/src/pages/home.tsx` contact section

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI spec
- Always run `pnpm --filter @workspace/db run push` after changing the DB schema
- Object storage is provisioned once via `setupObjectStorage()` — the env vars are auto-set

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
