# Submission

## Included in this repository

- **Source code** — `backend/` (Express + TypeScript API) and `frontend/`
  (Next.js app)
- **`README.md`** — local setup and run instructions (Docker Compose as the
  primary path, plus a no-Docker dev path and backend test instructions)
- **`ARCHITECTURE.md`** — short architecture note: what was prioritized, what
  was deliberately cut, and why
- **`AI_WORKFLOW.md`** — how Claude Code was used to build this project,
  including the review process and the bugs it caught before they shipped
- **`docker-compose.yml`** — containerized local run (Postgres + backend +
  frontend)
- **`render.yaml`** — backend deployment config for Render
- **Automated tests** — 14 backend tests (Vitest + Supertest) covering access
  control (owner / shared / unauthorized), markdown/text import conversion, and
  document CRUD (create, fetch, save content, rename, share, revoke)

## Not yet included

- **Live deployment URL** — not yet deployed to a public URL. `README.md`
  ("Deployed version") documents the exact deployment path (Vercel + Render +
  Supabase, all free tier); this requires accounts the reviewer's environment
  didn't have access to.
- **Walkthrough video URL**
- **Screenshots / demo GIF** — optional per the brief since local setup is a
  single `docker compose up --build` command; not included unless requested.

## Test accounts

There is no password login. On the login screen, pick one of three seeded
users — **Alice**, **Bob**, or **Carol** — to continue as them. Any of the
three can be used to exercise the sharing flow against each other: log in as
one user, create or open a document, use "Share" to grant another user
access, then log in as that second user (a separate browser session, since
the demo auth is a single shared cookie) to confirm they can see and edit the
shared document, and that a third, non-shared user cannot.
