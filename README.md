# Docs — Collaborative Document Editor

A scoped, working slice of a Google-Docs-like editor: create/rename/edit rich-text
documents, import a `.txt` or `.md` file as a new document, share a document with
another user, and persist everything.

## Stack

TypeScript throughout. Next.js (App Router, client-only) frontend, Express REST API
backend, Postgres via Prisma, TipTap for rich text.

## Supported file types

Import accepts **only `.txt` and `.md`** files, capped at 2MB. `.docx` and other
formats are not supported and are rejected with an error. Import preserves
block-level structure (headings, paragraphs, bulleted/numbered lists); inline
emphasis such as `**bold**` inside an imported file is not parsed.

## Run locally with Docker Compose

Requires Docker.

```bash
docker compose up --build
```

Then open `http://localhost:3000`. The backend runs its database migrations and
seeds three demo users (Alice, Bob, Carol) automatically on startup.

## Seeded users

There is no password login. Pick a user (Alice, Bob, or Carol) on the login screen
to continue as them — this stands in for real authentication for the scope of this
exercise.

## Run backend tests

```bash
cd backend
npm install
docker run --rm -d --name docs-postgres -e POSTGRES_USER=docs -e POSTGRES_PASSWORD=docs -e POSTGRES_DB=docs -p 5432:5432 postgres:16-alpine
cp .env.example .env
npx prisma migrate deploy
npm test
```

## Run without Docker (local dev with hot reload)

Requires a local Postgres. Start one if you don't already have one running:

```bash
docker run --rm -d --name docs-postgres -e POSTGRES_USER=docs -e POSTGRES_PASSWORD=docs -e POSTGRES_DB=docs -p 5432:5432 postgres:16-alpine
```

```bash
# terminal 1
cd backend && npm install && cp .env.example .env && npx prisma migrate dev && npm run prisma:seed && npm run dev

# terminal 2
cd frontend && npm install && cp .env.example .env.local && npm run dev
```

## Deployed version

- Frontend: <fill in Vercel URL after deploying>
- Backend: <fill in Render URL after deploying>

To deploy: push this repo to GitHub, create a free Supabase project for Postgres
and copy its connection string, deploy `backend/` to Render using `render.yaml`
(set `DATABASE_URL` to the Supabase connection string and `FRONTEND_ORIGIN` to the
Vercel URL once known), then deploy `frontend/` to Vercel with `NEXT_PUBLIC_API_URL`
set to the Render backend URL. Render's free tier sleeps after inactivity, so the
first request after idle may take up to ~30 seconds.
