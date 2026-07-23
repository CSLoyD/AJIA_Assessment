# Collaborative Document Editor - Design Spec

Date: 2026-07-23
Status: Approved

## 1. Purpose

Ship a small, coherent slice of a Google-Docs-like collaborative document editor:
create/edit/rename documents with rich text, import a text/markdown file into a
new document, share a document with another user, and persist all of it. Built
under a tight timebox, so scope is deliberately narrow and depth is prioritized
over breadth. See [instructions.md](../instructions.md) for the stakeholder
constraints this design must satisfy.

## 2. Architecture

Three services, run together via Docker Compose locally:

- `frontend` - Next.js (App Router) + TypeScript. Client-only: it calls the
  backend's REST API and does not use Next's own API routes or server actions.
  Chosen over React+Vite per stakeholder preference.
- `backend` - Express + TypeScript. REST API, owns all business logic
  (authorization, sharing, document CRUD, file import).
- `postgres` - Postgres 16, accessed via Prisma ORM from the backend.

```
Next.js (frontend) --HTTP/JSON--> Express (backend) --Prisma--> Postgres
```

Hosted deployment (free, no cost to reviewers):

- Frontend -> Vercel (native Next.js support, no cold starts, zero-config).
- Backend -> Render free Web Service (Node). Free tier sleeps after
  inactivity; first request after idle may take ~30s. Documented in the
  README so reviewers aren't surprised.
- Database -> Supabase free Postgres (persistent, no time-limited trial,
  unlike Render's free Postgres which expires after 90 days).

Local development uses Docker Compose exclusively and does not depend on any
of the hosted services.

## 3. Data model (Prisma schema)

```
User
  id          String  @id @default(cuid())
  name        String  @unique

Document
  id          String   @id @default(cuid())
  title       String
  content     Json          // TipTap/ProseMirror document JSON
  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

DocumentShare
  id          String   @id @default(cuid())
  documentId  String
  userId      String
  document    Document @relation(fields: [documentId], references: [id])
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())

  @@unique([documentId, userId])
```

`User` rows are seeded at migration time (Alice, Bob, Carol) - no signup flow.

## 4. Auth (mocked, not real security)

A login screen lists the seeded users. Picking one sets an httpOnly cookie
identifying the current user; no password. Every backend route reads this
cookie and resolves the current user before doing anything else. This is
called out explicitly in the README as a stand-in for real authentication,
appropriate for a scoped product exercise but not production-ready.

Authorization rule, enforced on every document read/write:
a user may access a document if `document.ownerId === currentUser.id` OR a
`DocumentShare` row exists for `(documentId, currentUser.id)`. Anyone else
gets 404 (not 403, to avoid confirming a document's existence to users who
have no relationship to it).

## 5. Document editing

Editor: TipTap (ProseMirror-based), using StarterKit plus the Underline
extension, restricted to:

- Bold, italic, underline
- Headings (H1-H3) and paragraph
- Bullet list, ordered list

Toolbar exposes exactly these operations - no more. Title is a separate
inline-editable text field above the editor (PATCH `/documents/:id`,
independent of content saves). Content autosaves on a debounce (~1s after
the last edit) via PUT `/documents/:id`, with a small saved/saving indicator
so the save state is never ambiguous to the user.

Documents remain available after refresh because content is persisted as
JSON in Postgres and reloaded on document open - no client-only state.

## 6. File upload / import

An "Import" action on the dashboard accepts a single `.txt` or `.md` file
(client-side and server-side extension + MIME check, size-capped at 2MB).
`.md` is parsed to HTML via `marked`, then converted to TipTap JSON via
`generateJSON`; `.txt` is wrapped as plain paragraphs (one per line group).
The result becomes a new document, titled from the filename (extension
stripped), owned by the importing user, and the user is taken straight into
the editor for it.

Any other file type is rejected with a clear inline error before upload
completes. This restriction is stated in both the UI (next to the import
control) and the README - `.docx` is explicitly out of scope, since a
correct DOCX parser is a meaningfully larger dependency than the timebox
justifies for the value it adds here.

## 7. Sharing

From a document the current user owns, a "Share" control lists the other
seeded users (excluding the owner and anyone already shared with) and grants
access by creating a `DocumentShare` row. Access is single-tier - anyone
shared with can view and edit; there is no separate viewer/editor role. This
is a deliberate scope cut, not an oversight, and is called out in the
architecture note. Revoking a share (deleting the `DocumentShare` row) is
included since it is a small addition on top of the same CRUD path.

The dashboard has two sections: "My Documents" (`ownerId === currentUser`)
and "Shared with Me" (has a matching `DocumentShare`). Shared documents show
the owner's name so the distinction between owned and shared is visible at a
glance, not just structural.

## 8. Testing

Backend unit tests with Vitest, covering the logic most likely to have real
bugs and least likely to be caught just by clicking through the UI:

- Authorization: owner access, shared access, unauthorized access (3 cases).
- Markdown/txt import conversion: produces valid TipTap JSON for a
  representative input of each type.
- One Supertest integration test exercising a real endpoint end-to-end
  (e.g. create document -> fetch it back) against a test database.

This is intentionally not exhaustive coverage across every endpoint - depth
on the logic that's easy to get subtly wrong, rather than shallow coverage
everywhere.

## 9. Docker Compose & local setup

`docker-compose.yml` at the repo root defines `postgres` (named volume for
persistence across restarts), `backend` (runs `prisma migrate deploy` plus
the seed script on boot, then starts the API), and `frontend`. `.env.example`
documents every required variable; no secrets are committed. Root
`README.md` covers: prerequisites, `docker compose up` instructions, seeded
user list, supported import file types, how to run tests, and the live
deployed URL once available.

## 10. Explicit scope cuts (architecture note material)

Out of scope, by deliberate choice under a tight timebox:

- Real authentication (passwords, sessions, signup) - seeded user picker only.
- Granular sharing roles (viewer vs editor) - single access tier only.
- Real-time collaborative editing (live cursors, concurrent-edit merging).
- Version history / revision log.
- `.docx` import.

Stretch, attempted only after the core above is fully working and tested:
Markdown export of a document (server-side, reusing the import path in
reverse) and PDF export via the browser's print stylesheet rather than a
server-side PDF-rendering library, to avoid a heavy new dependency for a
timeboxed exercise.

## 11. Open risks / things to watch during implementation

- Render free tier cold start (~30s) on first request after idle - mitigated
  by documenting it, not by paying for a warm instance.
- TipTap JSON -> HTML/markdown conversion for export (stretch) needs to
  round-trip cleanly enough for the formatting subset in scope (bold,
  italic, underline, headings, lists) - no need to handle arbitrary
  ProseMirror nodes since the toolbar never produces them.
