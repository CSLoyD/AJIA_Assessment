# Collaborative Document Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working full-stack collaborative document editor (create/edit/rename documents with rich text, import .txt/.md into a new document, share with another seeded user, persist everything) per [docs/specs/2026-07-23-collaborative-doc-editor-design.md](../specs/2026-07-23-collaborative-doc-editor-design.md).

**Architecture:** Next.js (client-only) frontend calling a separate Express + TypeScript REST API, which talks to Postgres through Prisma. Three Docker Compose services locally (`frontend`, `backend`, `postgres`); hosted as Vercel (frontend) + Render (backend) + Supabase (Postgres).

**Tech Stack:** TypeScript everywhere. Backend: Express, Prisma, Multer, Vitest, Supertest. Frontend: Next.js (App Router), TipTap (ProseMirror), plain `fetch`. No ORM/query builder beyond Prisma, no state-management library, no CSS framework — kept minimal per the timebox.

---

## File Structure

```
backend/
  src/
    app.ts                    # Express app wiring (middleware + routers)
    index.ts                  # server entry point
    db.ts                     # Prisma client singleton
    middleware/currentUser.ts # reads the demo-auth cookie, loads the user
    routes/auth.ts            # list users, login, logout, me
    routes/documents.ts       # document CRUD, import, sharing
    lib/authorize.ts          # pure access-check function (unit tested)
    lib/importDocument.ts     # markdown/txt -> ProseMirror JSON (unit tested)
  prisma/
    schema.prisma
    seed.ts
  tests/
    health.test.ts
    authorize.test.ts
    importDocument.test.ts
    documents.integration.test.ts
  package.json, tsconfig.json, vitest.config.ts, Dockerfile, .env.example

frontend/
  app/
    layout.tsx, globals.css
    page.tsx                  # login (pick a seeded user)
    dashboard/page.tsx        # My Documents / Shared with Me, create, import
    documents/[id]/page.tsx   # editor page: title, autosave, share gating
  components/
    Editor.tsx                # TipTap instance
    Toolbar.tsx                # formatting buttons
    ShareDialog.tsx            # grant/revoke access
  lib/
    api.ts                     # typed fetch client
    types.ts
  package.json, tsconfig.json, next.config.js, Dockerfile, .env.example

docker-compose.yml
render.yaml
README.md
docs/architecture-note.md
```

Each backend route file stays thin (HTTP concerns only); access-check and import-parsing logic live in `lib/` as pure functions so they're testable without a database or an HTTP server. Frontend pages own data-fetching and state; `Editor`/`Toolbar`/`ShareDialog` are presentational-plus-local-state components with no cross-component state sharing needed at this scope.

---

### Task 1: Backend scaffold and health check

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/index.ts`
- Test: `backend/tests/health.test.ts`

- [ ] **Step 1: Create the backend package manifest**

`backend/package.json`:
```json
{
  "name": "backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "prisma:seed": "tsx prisma/seed.ts"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.20.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.14.0",
    "@types/supertest": "^6.0.2",
    "prisma": "^5.20.0",
    "supertest": "^7.0.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd backend && npm install`
Expected: completes without errors; `backend/node_modules/` and `backend/package-lock.json` are created.

- [ ] **Step 3: Create the TypeScript config**

`backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create the Vitest config**

`backend/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 5: Write the failing health-check test**

`backend/tests/health.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'

describe('GET /health', () => {
  it('returns ok status', async () => {
    const response = await request(createApp()).get('/health')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })
})
```

- [ ] **Step 6: Run the test and confirm it fails**

Run: `cd backend && npm test`
Expected: FAIL — `Cannot find module '../src/app'` (file does not exist yet).

- [ ] **Step 7: Create the Express app**

`backend/src/app.ts`:
```ts
import express from 'express'

export function createApp() {
  const app = express()

  app.get('/health', (_req, res) => res.json({ status: 'ok' }))

  return app
}
```

- [ ] **Step 8: Create the server entry point**

`backend/src/index.ts`:
```ts
import { createApp } from './app'

const port = Number(process.env.PORT) || 4000
createApp().listen(port, () => {
  console.log(`Backend listening on port ${port}`)
})
```

- [ ] **Step 9: Run the test again and confirm it passes**

Run: `cd backend && npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 10: Commit**

```bash
git add backend/package.json backend/tsconfig.json backend/vitest.config.ts backend/src/app.ts backend/src/index.ts backend/tests/health.test.ts backend/package-lock.json
git commit -m "Add backend scaffold with health check endpoint"
```

---

### Task 2: Prisma schema, client, and seed data

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/src/db.ts`
- Create: `backend/prisma/seed.ts`
- Create: `backend/.env.example`

- [ ] **Step 1: Write the Prisma schema**

`backend/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             String          @id @default(cuid())
  name           String          @unique
  documents      Document[]
  documentShares DocumentShare[]
}

model Document {
  id        String          @id @default(cuid())
  title     String
  content   Json
  ownerId   String
  owner     User            @relation(fields: [ownerId], references: [id])
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
  shares    DocumentShare[]
}

model DocumentShare {
  id         String   @id @default(cuid())
  documentId String
  userId     String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@unique([documentId, userId])
}
```

- [ ] **Step 2: Create the environment file**

`backend/.env.example`:
```
DATABASE_URL=postgresql://docs:docs@localhost:5432/docs
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
NODE_ENV=development
```

Run: `cd backend && cp .env.example .env`
Expected: `backend/.env` created (gitignored, holds the real local value).

- [ ] **Step 3: Start a local Postgres for development**

Run: `docker run --rm -d --name docs-postgres -e POSTGRES_USER=docs -e POSTGRES_PASSWORD=docs -e POSTGRES_DB=docs -p 5432:5432 postgres:16-alpine`
Expected: container starts; `docker ps` shows `docs-postgres` as healthy/running within a few seconds.

- [ ] **Step 4: Generate the Prisma client and run the first migration**

Run: `cd backend && npx prisma migrate dev --name init`
Expected: prompts complete, creates `backend/prisma/migrations/<timestamp>_init/`, prints "Your database is now in sync with your schema."

- [ ] **Step 5: Create the Prisma client singleton**

`backend/src/db.ts`:
```ts
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
```

- [ ] **Step 6: Write the seed script**

`backend/prisma/seed.ts`:
```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const names = ['Alice', 'Bob', 'Carol']

  for (const name of names) {
    await prisma.user.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  console.log(`Seeded users: ${names.join(', ')}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
```

- [ ] **Step 7: Run the seed script**

Run: `cd backend && npm run prisma:seed`
Expected: prints `Seeded users: Alice, Bob, Carol`.

- [ ] **Step 8: Commit**

```bash
git add backend/prisma backend/src/db.ts backend/.env.example
git commit -m "Add Prisma schema, client, and seed script"
```

Note: `backend/prisma/migrations/` is generated output tied to the schema, not a secret — commit it. `backend/.env` is gitignored and stays local.

---

### Task 3: Demo auth (seeded-user login, no password)

**Files:**
- Create: `backend/src/middleware/currentUser.ts`
- Create: `backend/src/routes/auth.ts`
- Test: `backend/tests/auth.test.ts`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Create the current-user middleware**

`backend/src/middleware/currentUser.ts`:
```ts
import { NextFunction, Request, Response } from 'express'
import { prisma } from '../db'

export interface AuthedRequest extends Request {
  currentUser?: { id: string; name: string }
}

export async function currentUser(req: AuthedRequest, res: Response, next: NextFunction) {
  const userId = req.cookies?.userId
  if (!userId) {
    res.status(401).json({ error: 'Not logged in' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    res.status(401).json({ error: 'Unknown user' })
    return
  }

  req.currentUser = user
  next()
}
```

- [ ] **Step 2: Create the auth routes**

`backend/src/routes/auth.ts`:
```ts
import { Router } from 'express'
import { prisma } from '../db'
import { AuthedRequest, currentUser } from '../middleware/currentUser'

export const authRouter = Router()

authRouter.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } })
  res.json(users)
})

authRouter.post('/login', async (req, res) => {
  const { userId } = req.body as { userId?: string }
  if (!userId) {
    res.status(400).json({ error: 'userId is required' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  res.cookie('userId', user.id, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  })
  res.json(user)
})

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('userId')
  res.status(204).end()
})

authRouter.get('/me', currentUser, (req: AuthedRequest, res) => {
  res.json(req.currentUser)
})
```

- [ ] **Step 3: Wire auth into the app**

Modify `backend/src/app.ts` to the full new contents:
```ts
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { authRouter } from './routes/auth'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
      credentials: true,
    }),
  )
  app.use(cookieParser())
  app.use(express.json())

  app.get('/health', (_req, res) => res.json({ status: 'ok' }))
  app.use('/auth', authRouter)

  return app
}
```

- [ ] **Step 4: Write the failing auth test**

`backend/tests/auth.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { prisma } from '../src/db'

describe('auth flow', () => {
  const app = createApp()
  let userId: string

  beforeAll(async () => {
    const user = await prisma.user.upsert({
      where: { name: 'Auth Test User' },
      update: {},
      create: { name: 'Auth Test User' },
    })
    userId = user.id
  })

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } })
    await prisma.$disconnect()
  })

  it('rejects /auth/me without a login', async () => {
    await request(app).get('/auth/me').expect(401)
  })

  it('logs in and then returns the current user from /auth/me', async () => {
    const agent = request.agent(app)
    await agent.post('/auth/login').send({ userId }).expect(200)
    const response = await agent.get('/auth/me').expect(200)
    expect(response.body.id).toBe(userId)
  })
})
```

- [ ] **Step 5: Run the tests and confirm the new ones fail first, then pass**

Run: `cd backend && npm test`
Expected: with Steps 1-3 already applied, this should PASS on the first run (3 tests). If you write the test before the implementation, the expected failure is `ECONNREFUSED`-style errors on `/auth/me`/`/auth/login` returning 404 instead of 401/200.

- [ ] **Step 6: Commit**

```bash
git add backend/src/middleware/currentUser.ts backend/src/routes/auth.ts backend/src/app.ts backend/tests/auth.test.ts
git commit -m "Add seeded-user login flow"
```

---

### Task 4: Access-check logic (unit tested)

**Files:**
- Create: `backend/src/lib/authorize.ts`
- Test: `backend/tests/authorize.test.ts`

- [ ] **Step 1: Write the failing tests**

`backend/tests/authorize.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { canAccessDocument } from '../src/lib/authorize'

describe('canAccessDocument', () => {
  it('allows the owner', () => {
    expect(canAccessDocument({ ownerId: 'u1', sharedUserIds: [] }, 'u1')).toBe(true)
  })

  it('allows a user the document is shared with', () => {
    expect(canAccessDocument({ ownerId: 'u1', sharedUserIds: ['u2'] }, 'u2')).toBe(true)
  })

  it('denies a user with no relationship to the document', () => {
    expect(canAccessDocument({ ownerId: 'u1', sharedUserIds: ['u2'] }, 'u3')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `cd backend && npm test`
Expected: FAIL — `Cannot find module '../src/lib/authorize'`.

- [ ] **Step 3: Implement the function**

`backend/src/lib/authorize.ts`:
```ts
export interface DocumentAccessInfo {
  ownerId: string
  sharedUserIds: string[]
}

export function canAccessDocument(document: DocumentAccessInfo, userId: string): boolean {
  return document.ownerId === userId || document.sharedUserIds.includes(userId)
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `cd backend && npm test`
Expected: PASS — all tests including the 3 new ones.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/authorize.ts backend/tests/authorize.test.ts
git commit -m "Add document access-check logic with unit tests"
```

---

### Task 5: Document CRUD routes

**Files:**
- Create: `backend/src/routes/documents.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/tests/documents.integration.test.ts`

- [ ] **Step 1: Create the document routes (list/create/get/rename/update-content)**

`backend/src/routes/documents.ts`:
```ts
import { Router } from 'express'
import { prisma } from '../db'
import { AuthedRequest, currentUser } from '../middleware/currentUser'
import { canAccessDocument } from '../lib/authorize'

export const documentsRouter = Router()
documentsRouter.use(currentUser)

const emptyDocument = { type: 'doc', content: [{ type: 'paragraph' }] }

async function loadAccessibleDocument(id: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: { shares: true },
  })

  if (!document) return null

  const accessible = canAccessDocument(
    { ownerId: document.ownerId, sharedUserIds: document.shares.map((share) => share.userId) },
    userId,
  )

  return accessible ? document : null
}

documentsRouter.get('/', async (req: AuthedRequest, res) => {
  const userId = req.currentUser!.id

  const [owned, sharedLinks] = await Promise.all([
    prisma.document.findMany({ where: { ownerId: userId }, orderBy: { updatedAt: 'desc' } }),
    prisma.documentShare.findMany({
      where: { userId },
      include: { document: { include: { owner: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  res.json({
    owned,
    shared: sharedLinks.map((link) => ({ ...link.document, ownerName: link.document.owner.name })),
  })
})

documentsRouter.post('/', async (req: AuthedRequest, res) => {
  const { title } = req.body as { title?: string }

  const document = await prisma.document.create({
    data: {
      title: title?.trim() || 'Untitled document',
      content: emptyDocument,
      ownerId: req.currentUser!.id,
    },
  })

  res.status(201).json(document)
})

documentsRouter.get('/:id', async (req: AuthedRequest, res) => {
  const document = await loadAccessibleDocument(req.params.id, req.currentUser!.id)
  if (!document) {
    res.status(404).json({ error: 'Document not found' })
    return
  }
  res.json(document)
})

documentsRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const document = await loadAccessibleDocument(req.params.id, req.currentUser!.id)
  if (!document) {
    res.status(404).json({ error: 'Document not found' })
    return
  }

  const { title } = req.body as { title?: string }
  if (!title || !title.trim()) {
    res.status(400).json({ error: 'title is required' })
    return
  }

  const updated = await prisma.document.update({
    where: { id: document.id },
    data: { title: title.trim() },
  })

  res.json(updated)
})

documentsRouter.put('/:id', async (req: AuthedRequest, res) => {
  const document = await loadAccessibleDocument(req.params.id, req.currentUser!.id)
  if (!document) {
    res.status(404).json({ error: 'Document not found' })
    return
  }

  const { content } = req.body as { content?: unknown }
  if (!content) {
    res.status(400).json({ error: 'content is required' })
    return
  }

  const updated = await prisma.document.update({
    where: { id: document.id },
    data: { content },
  })

  res.json(updated)
})
```

- [ ] **Step 2: Wire the router into the app**

Modify `backend/src/app.ts` to the full new contents:
```ts
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { authRouter } from './routes/auth'
import { documentsRouter } from './routes/documents'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
      credentials: true,
    }),
  )
  app.use(cookieParser())
  app.use(express.json())

  app.get('/health', (_req, res) => res.json({ status: 'ok' }))
  app.use('/auth', authRouter)
  app.use('/documents', documentsRouter)

  return app
}
```

- [ ] **Step 3: Write the integration test (create, then fetch back)**

`backend/tests/documents.integration.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app'
import { prisma } from '../src/db'

describe('document creation and retrieval', () => {
  const app = createApp()
  const agent = request.agent(app)
  let userId: string

  beforeAll(async () => {
    const user = await prisma.user.upsert({
      where: { name: 'Integration Test User' },
      update: {},
      create: { name: 'Integration Test User' },
    })
    userId = user.id
    await agent.post('/auth/login').send({ userId }).expect(200)
  })

  afterAll(async () => {
    await prisma.document.deleteMany({ where: { ownerId: userId } })
    await prisma.user.delete({ where: { id: userId } })
    await prisma.$disconnect()
  })

  it('creates a document and fetches it back with the same title', async () => {
    const createResponse = await agent
      .post('/documents')
      .send({ title: 'Integration Test Doc' })
      .expect(201)

    const documentId = createResponse.body.id

    const getResponse = await agent.get(`/documents/${documentId}`).expect(200)

    expect(getResponse.body.title).toBe('Integration Test Doc')
    expect(getResponse.body.id).toBe(documentId)
  })

  it('returns 404 for a document that does not belong to and is not shared with the user', async () => {
    const otherUser = await prisma.user.upsert({
      where: { name: 'Other User' },
      update: {},
      create: { name: 'Other User' },
    })
    const otherDoc = await prisma.document.create({
      data: { title: 'Not yours', content: { type: 'doc', content: [] }, ownerId: otherUser.id },
    })

    await agent.get(`/documents/${otherDoc.id}`).expect(404)

    await prisma.document.delete({ where: { id: otherDoc.id } })
    await prisma.user.delete({ where: { id: otherUser.id } })
  })
})
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `cd backend && npm test`
Expected: PASS — all tests, including the 2 new ones (requires the Postgres container from Task 2 Step 3 to be running).

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/documents.ts backend/src/app.ts backend/tests/documents.integration.test.ts
git commit -m "Add document CRUD routes with owner/shared access checks"
```

---

### Task 6: Markdown/text import

**Files:**
- Create: `backend/src/lib/importDocument.ts`
- Test: `backend/tests/importDocument.test.ts`
- Modify: `backend/src/routes/documents.ts`

Only `.txt` and `.md` are supported. Import preserves block-level structure — headings,
paragraphs, bullet lists, numbered lists — matching exactly the formatting the editor's
toolbar can produce. Inline emphasis inside an imported file (e.g. `**bold**`) is not
parsed and appears as literal characters; this is a stated scope cut, not a bug, and is
called out in the README.

- [ ] **Step 1: Write the failing tests**

`backend/tests/importDocument.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import {
  markdownToDocumentJson,
  plainTextToDocumentJson,
  titleFromFilename,
} from '../src/lib/importDocument'

describe('markdownToDocumentJson', () => {
  it('converts headings, paragraphs, and lists into matching node types', () => {
    const markdown = '# Title\n\nSome text\n\n- one\n- two\n\n1. first\n2. second'
    const result = markdownToDocumentJson(markdown)

    expect(result.content[0]).toEqual({
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Title' }],
    })
    expect(result.content[1]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Some text' }],
    })
    expect(result.content[2].type).toBe('bulletList')
    expect(result.content[2].content).toHaveLength(2)
    expect(result.content[3].type).toBe('orderedList')
    expect(result.content[3].content).toHaveLength(2)
  })
})

describe('plainTextToDocumentJson', () => {
  it('wraps each line in its own paragraph', () => {
    const result = plainTextToDocumentJson('line one\nline two')
    expect(result.content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'line one' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'line two' }] },
    ])
  })
})

describe('titleFromFilename', () => {
  it('strips supported extensions', () => {
    expect(titleFromFilename('notes.md')).toBe('notes')
    expect(titleFromFilename('draft.txt')).toBe('draft')
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `cd backend && npm test`
Expected: FAIL — `Cannot find module '../src/lib/importDocument'`.

- [ ] **Step 3: Implement the converter**

`backend/src/lib/importDocument.ts`:
```ts
interface DocNode {
  type: string
  attrs?: Record<string, unknown>
  content?: DocNode[]
  text?: string
}

function paragraph(text: string): DocNode {
  return text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' }
}

function heading(level: number, text: string): DocNode {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] }
}

function listItem(text: string): DocNode {
  return { type: 'listItem', content: [paragraph(text)] }
}

export function markdownToDocumentJson(markdown: string): { type: 'doc'; content: DocNode[] } {
  const lines = markdown.split(/\r?\n/)
  const content: DocNode[] = []
  let currentList: { type: 'bulletList' | 'orderedList'; items: DocNode[] } | null = null

  function flushList() {
    if (currentList) {
      content.push({ type: currentList.type, content: currentList.items })
      currentList = null
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line === '') {
      flushList()
      continue
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/)
    if (headingMatch) {
      flushList()
      content.push(heading(headingMatch[1].length, headingMatch[2]))
      continue
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/)
    if (bulletMatch) {
      if (currentList?.type !== 'bulletList') {
        flushList()
        currentList = { type: 'bulletList', items: [] }
      }
      currentList.items.push(listItem(bulletMatch[1]))
      continue
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/)
    if (orderedMatch) {
      if (currentList?.type !== 'orderedList') {
        flushList()
        currentList = { type: 'orderedList', items: [] }
      }
      currentList.items.push(listItem(orderedMatch[1]))
      continue
    }

    flushList()
    content.push(paragraph(line))
  }

  flushList()

  return { type: 'doc', content: content.length > 0 ? content : [paragraph('')] }
}

export function plainTextToDocumentJson(text: string): { type: 'doc'; content: DocNode[] } {
  const paragraphs = text.split(/\r?\n/).map((line) => paragraph(line.trim()))
  return { type: 'doc', content: paragraphs.length > 0 ? paragraphs : [paragraph('')] }
}

export function titleFromFilename(filename: string): string {
  return filename.replace(/\.(md|txt)$/i, '').trim() || 'Untitled'
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `cd backend && npm test`
Expected: PASS — all tests, including the 3 new ones.

- [ ] **Step 5: Add the import route**

Modify `backend/src/routes/documents.ts`: add these imports at the top —

```ts
import multer from 'multer'
import {
  markdownToDocumentJson,
  plainTextToDocumentJson,
  titleFromFilename,
} from '../lib/importDocument'
```

— and add this route plus the `upload` setup, placed after the `documentsRouter.use(currentUser)` line and before `documentsRouter.get('/', ...)`:

```ts
const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } })

documentsRouter.post('/import', upload.single('file'), async (req: AuthedRequest, res) => {
  const file = req.file
  if (!file) {
    res.status(400).json({ error: 'No file provided' })
    return
  }

  const name = file.originalname.toLowerCase()
  const isMarkdown = name.endsWith('.md')
  const isText = name.endsWith('.txt')
  if (!isMarkdown && !isText) {
    res.status(400).json({ error: 'Only .txt and .md files are supported' })
    return
  }

  const text = file.buffer.toString('utf-8')
  const content = isMarkdown ? markdownToDocumentJson(text) : plainTextToDocumentJson(text)

  const document = await prisma.document.create({
    data: {
      title: titleFromFilename(file.originalname),
      content,
      ownerId: req.currentUser!.id,
    },
  })

  res.status(201).json(document)
})
```

- [ ] **Step 6: Manually verify the import route**

Run: `cd backend && npm run dev` (in one terminal), then in another:
```bash
printf '# Hello\n\n- a\n- b\n' > /tmp/sample.md
curl -i -c /tmp/cookies.txt -b /tmp/cookies.txt -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' -d "{\"userId\":\"$(curl -s http://localhost:4000/auth/users | node -pe 'JSON.parse(require("fs").readFileSync(0)).length ? JSON.parse(require("fs").readFileSync(0))[0].id : "" ' 2>/dev/null || true)\"}"
curl -i -c /tmp/cookies.txt -b /tmp/cookies.txt -F file=@/tmp/sample.md http://localhost:4000/documents/import
```
Expected: final response is `201 Created` with a JSON document whose `content.content[0].type` is `heading` and whose `content.content[1].type` is `bulletList`. (If the login one-liner is awkward in your shell, just log in via `GET /auth/users` to get an id, then `POST /auth/login` with that id directly — the point is confirming the import endpoint end to end.)

- [ ] **Step 7: Commit**

```bash
git add backend/src/lib/importDocument.ts backend/tests/importDocument.test.ts backend/src/routes/documents.ts
git commit -m "Add .txt/.md import that creates a new document"
```

---

### Task 7: Sharing routes

**Files:**
- Modify: `backend/src/routes/documents.ts`
- Modify: `backend/tests/documents.integration.test.ts`

- [ ] **Step 1: Add a failing integration test for the share/revoke flow**

Append to `backend/tests/documents.integration.test.ts` (inside the existing `describe` block, as a new `it`):

```ts
  it('lets the owner share a document and the recipient then access it', async () => {
    const recipient = await prisma.user.upsert({
      where: { name: 'Recipient User' },
      update: {},
      create: { name: 'Recipient User' },
    })

    const createResponse = await agent.post('/documents').send({ title: 'Shared Doc' }).expect(201)
    const documentId = createResponse.body.id

    await agent.post(`/documents/${documentId}/share`).send({ userId: recipient.id }).expect(201)

    const recipientAgent = request.agent(app)
    await recipientAgent.post('/auth/login').send({ userId: recipient.id }).expect(200)
    await recipientAgent.get(`/documents/${documentId}`).expect(200)

    await agent.delete(`/documents/${documentId}/share/${recipient.id}`).expect(204)
    await recipientAgent.get(`/documents/${documentId}`).expect(404)

    await prisma.document.delete({ where: { id: documentId } })
    await prisma.user.delete({ where: { id: recipient.id } })
  })
```

- [ ] **Step 2: Run the tests and confirm the new one fails**

Run: `cd backend && npm test`
Expected: FAIL — `POST /documents/:id/share` and `DELETE /documents/:id/share/:userId` don't exist yet (404 where 201/204 expected).

- [ ] **Step 3: Add the sharing routes**

Modify `backend/src/routes/documents.ts`: add these routes after the `PUT /:id` route and before the closing of the file:

```ts
documentsRouter.get('/:id/shareable-users', async (req: AuthedRequest, res) => {
  const document = await prisma.document.findUnique({
    where: { id: req.params.id },
    include: { shares: true },
  })

  if (!document || document.ownerId !== req.currentUser!.id) {
    res.status(404).json({ error: 'Document not found' })
    return
  }

  const excludedIds = new Set([document.ownerId, ...document.shares.map((share) => share.userId)])
  const users = await prisma.user.findMany({ where: { id: { notIn: [...excludedIds] } } })
  res.json(users)
})

documentsRouter.get('/:id/shares', async (req: AuthedRequest, res) => {
  const document = await prisma.document.findUnique({ where: { id: req.params.id } })
  if (!document || document.ownerId !== req.currentUser!.id) {
    res.status(404).json({ error: 'Document not found' })
    return
  }

  const shares = await prisma.documentShare.findMany({
    where: { documentId: document.id },
    include: { user: true },
  })

  res.json(shares.map((share) => ({ userId: share.userId, userName: share.user.name })))
})

documentsRouter.post('/:id/share', async (req: AuthedRequest, res) => {
  const document = await prisma.document.findUnique({ where: { id: req.params.id } })
  if (!document || document.ownerId !== req.currentUser!.id) {
    res.status(404).json({ error: 'Document not found' })
    return
  }

  const { userId } = req.body as { userId?: string }
  if (!userId) {
    res.status(400).json({ error: 'userId is required' })
    return
  }

  const share = await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: document.id, userId } },
    update: {},
    create: { documentId: document.id, userId },
  })

  res.status(201).json(share)
})

documentsRouter.delete('/:id/share/:userId', async (req: AuthedRequest, res) => {
  const document = await prisma.document.findUnique({ where: { id: req.params.id } })
  if (!document || document.ownerId !== req.currentUser!.id) {
    res.status(404).json({ error: 'Document not found' })
    return
  }

  await prisma.documentShare.deleteMany({
    where: { documentId: document.id, userId: req.params.userId },
  })

  res.status(204).end()
})
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `cd backend && npm test`
Expected: PASS — all tests, including the sharing flow.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/documents.ts backend/tests/documents.integration.test.ts
git commit -m "Add document sharing: grant, revoke, and shareable-users listing"
```

---

### Task 8: Backend Dockerfile

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Create the dockerignore**

`backend/.dockerignore`:
```
node_modules
dist
.env
```

- [ ] **Step 2: Create the Dockerfile**

`backend/Dockerfile`:
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/index.js"]
```

- [ ] **Step 3: Build the image standalone to verify it compiles**

Run: `cd backend && docker build -t docs-backend .`
Expected: build completes successfully, ending with the image tagged `docs-backend`. (It will not run correctly yet without a reachable `DATABASE_URL` — that's verified in Task 17.)

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "Add backend Dockerfile"
```

---

### Task 9: Frontend scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/next.config.js`
- Create: `frontend/app/layout.tsx`
- Create: `frontend/app/globals.css`
- Create: `frontend/lib/types.ts`
- Create: `frontend/lib/api.ts`
- Create: `frontend/.env.example`

- [ ] **Step 1: Create the frontend package manifest**

`frontend/package.json`:
```json
{
  "name": "frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tiptap/extension-underline": "^2.6.0",
    "@tiptap/react": "^2.6.0",
    "@tiptap/starter-kit": "^2.6.0",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd frontend && npm install`
Expected: completes without errors; `frontend/node_modules/` and `frontend/package-lock.json` are created.

- [ ] **Step 3: Create the TypeScript config**

`frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create the Next.js config**

`frontend/next.config.js`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
```

- [ ] **Step 5: Create the root layout and global styles**

`frontend/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Docs',
  description: 'Lightweight collaborative document editor',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

`frontend/app/globals.css`:
```css
* {
  box-sizing: border-box;
}

body {
  font-family: system-ui, sans-serif;
  margin: 0;
  padding: 2rem;
  color: #1a1a1a;
}

button {
  cursor: pointer;
}
```

- [ ] **Step 6: Create shared types**

`frontend/lib/types.ts`:
```ts
export interface User {
  id: string
  name: string
}

export interface Document {
  id: string
  title: string
  content: unknown
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface SharedDocument extends Document {
  ownerName: string
}

export interface Share {
  userId: string
  userName: string
}
```

- [ ] **Step 7: Create the API client**

`frontend/lib/api.ts`:
```ts
import type { Document, Share, SharedDocument, User } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(body.error ?? 'Request failed')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export const api = {
  listUsers: () => request<User[]>('/auth/users'),
  login: (userId: string) => request<User>('/auth/login', { method: 'POST', body: JSON.stringify({ userId }) }),
  me: () => request<User>('/auth/me'),
  listDocuments: () => request<{ owned: Document[]; shared: SharedDocument[] }>('/documents'),
  createDocument: (title: string) =>
    request<Document>('/documents', { method: 'POST', body: JSON.stringify({ title }) }),
  importDocument: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request<Document>('/documents/import', { method: 'POST', body: formData })
  },
  getDocument: (id: string) => request<Document>(`/documents/${id}`),
  renameDocument: (id: string, title: string) =>
    request<Document>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  saveDocumentContent: (id: string, content: unknown) =>
    request<Document>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  getShareableUsers: (id: string) => request<User[]>(`/documents/${id}/shareable-users`),
  getShares: (id: string) => request<Share[]>(`/documents/${id}/shares`),
  shareDocument: (id: string, userId: string) =>
    request(`/documents/${id}/share`, { method: 'POST', body: JSON.stringify({ userId }) }),
  revokeShare: (id: string, userId: string) =>
    request(`/documents/${id}/share/${userId}`, { method: 'DELETE' }),
}
```

- [ ] **Step 8: Create the environment file**

`frontend/.env.example`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Run: `cd frontend && cp .env.example .env.local`

- [ ] **Step 9: Verify the scaffold builds**

Run: `cd frontend && npm run typecheck`
Expected: no errors printed (the placeholder `app/page.tsx` doesn't exist yet, so this step is really just confirming `tsconfig`/deps are sane — if it complains about a missing page, that's expected and resolved in Task 10).

- [ ] **Step 10: Commit**

```bash
git add frontend/package.json frontend/tsconfig.json frontend/next.config.js frontend/app/layout.tsx frontend/app/globals.css frontend/lib/types.ts frontend/lib/api.ts frontend/.env.example frontend/package-lock.json
git commit -m "Add frontend scaffold with API client"
```

---

### Task 10: Login page

**Files:**
- Create: `frontend/app/page.tsx`

- [ ] **Step 1: Create the login page**

`frontend/app/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../lib/api'
import type { User } from '../lib/types'

export default function LoginPage() {
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    api
      .listUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users'))
  }, [])

  async function handleLogin(userId: string) {
    try {
      await api.login(userId)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <main>
      <h1>Docs</h1>
      <p>Pick a user to continue. This is a demo login with no password.</p>
      {error && <p role="alert">{error}</p>}
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <button onClick={() => handleLogin(user.id)}>{user.name}</button>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/page.tsx
git commit -m "Add login page with seeded-user picker"
```

---

### Task 11: Dashboard page

**Files:**
- Create: `frontend/app/dashboard/page.tsx`

- [ ] **Step 1: Create the dashboard page**

`frontend/app/dashboard/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '../../lib/api'
import type { Document, SharedDocument, User } from '../../lib/types'

export default function DashboardPage() {
  const [me, setMe] = useState<User | null>(null)
  const [owned, setOwned] = useState<Document[]>([])
  const [shared, setShared] = useState<SharedDocument[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    api
      .me()
      .then(setMe)
      .catch(() => router.push('/'))
  }, [router])

  useEffect(() => {
    if (!me) return
    api
      .listDocuments()
      .then((data) => {
        setOwned(data.owned)
        setShared(data.shared)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load documents'))
  }, [me])

  async function handleCreate() {
    const document = await api.createDocument('Untitled document')
    router.push(`/documents/${document.id}`)
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const document = await api.importDocument(file)
      router.push(`/documents/${document.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      event.target.value = ''
    }
  }

  if (!me) return null

  return (
    <main>
      <h1>Welcome, {me.name}</h1>
      {error && <p role="alert">{error}</p>}

      <button onClick={handleCreate}>New document</button>

      <label>
        Import .txt or .md
        <input type="file" accept=".txt,.md" onChange={handleImport} />
      </label>

      <section>
        <h2>My Documents</h2>
        <ul>
          {owned.map((doc) => (
            <li key={doc.id}>
              <Link href={`/documents/${doc.id}`}>{doc.title}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Shared with Me</h2>
        <ul>
          {shared.map((doc) => (
            <li key={doc.id}>
              <Link href={`/documents/${doc.id}`}>{doc.title}</Link> — shared by {doc.ownerName}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/dashboard/page.tsx
git commit -m "Add dashboard with owned/shared documents, create, and import"
```

---

### Task 12: Editor and toolbar components

**Files:**
- Create: `frontend/components/Toolbar.tsx`
- Create: `frontend/components/Editor.tsx`

- [ ] **Step 1: Create the toolbar**

`frontend/components/Toolbar.tsx`:
```tsx
'use client'

import type { Editor } from '@tiptap/react'

export default function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div role="toolbar">
      <button onClick={() => editor.chain().focus().toggleBold().run()} aria-pressed={editor.isActive('bold')}>
        Bold
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} aria-pressed={editor.isActive('italic')}>
        Italic
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        aria-pressed={editor.isActive('underline')}
      >
        Underline
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        aria-pressed={editor.isActive('heading', { level: 1 })}
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        aria-pressed={editor.isActive('heading', { level: 2 })}
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        aria-pressed={editor.isActive('heading', { level: 3 })}
      >
        H3
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        aria-pressed={editor.isActive('bulletList')}
      >
        Bulleted list
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        aria-pressed={editor.isActive('orderedList')}
      >
        Numbered list
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create the editor**

`frontend/components/Editor.tsx`:
```tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { useRef } from 'react'
import Toolbar from './Toolbar'

interface EditorProps {
  content: unknown
  onChange: (content: unknown) => void
}

export default function Editor({ content, onChange }: EditorProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: content as object,
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getJSON())
    },
  })

  if (!editor) return null

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
```

- [ ] **Step 3: Verify it builds**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/Toolbar.tsx frontend/components/Editor.tsx
git commit -m "Add TipTap editor and formatting toolbar"
```

---

### Task 13: Share dialog

**Files:**
- Create: `frontend/components/ShareDialog.tsx`

- [ ] **Step 1: Create the share dialog**

`frontend/components/ShareDialog.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Share, User } from '../lib/types'

export default function ShareDialog({ documentId }: { documentId: string }) {
  const [open, setOpen] = useState(false)
  const [candidates, setCandidates] = useState<User[]>([])
  const [shares, setShares] = useState<Share[]>([])
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const [users, currentShares] = await Promise.all([
      api.getShareableUsers(documentId),
      api.getShares(documentId),
    ])
    setCandidates(users)
    setShares(currentShares)
  }

  useEffect(() => {
    if (!open) return
    refresh().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load sharing info'))
  }, [open, documentId])

  async function handleShare(userId: string) {
    try {
      await api.shareDocument(documentId, userId)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share')
    }
  }

  async function handleRevoke(userId: string) {
    try {
      await api.revokeShare(documentId, userId)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke access')
    }
  }

  return (
    <div>
      <button onClick={() => setOpen((value) => !value)}>Share</button>
      {open && (
        <div>
          {error && <p role="alert">{error}</p>}
          <h3>Shared with</h3>
          <ul>
            {shares.map((share) => (
              <li key={share.userId}>
                {share.userName} <button onClick={() => handleRevoke(share.userId)}>Revoke</button>
              </li>
            ))}
            {shares.length === 0 && <li>Not shared with anyone yet</li>}
          </ul>
          <h3>Add someone</h3>
          <ul>
            {candidates.map((user) => (
              <li key={user.id}>
                {user.name} <button onClick={() => handleShare(user.id)}>Grant access</button>
              </li>
            ))}
            {candidates.length === 0 && <li>No one left to add</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/ShareDialog.tsx
git commit -m "Add share dialog for granting and revoking document access"
```

---

### Task 14: Document editor page

**Files:**
- Create: `frontend/app/documents/[id]/page.tsx`

- [ ] **Step 1: Create the document page**

`frontend/app/documents/[id]/page.tsx`:
```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Editor from '../../../components/Editor'
import ShareDialog from '../../../components/ShareDialog'
import { api } from '../../../lib/api'
import type { Document, User } from '../../../lib/types'

export default function DocumentPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [me, setMe] = useState<User | null>(null)
  const [document, setDocument] = useState<Document | null>(null)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    api.me().then(setMe).catch(() => router.push('/'))
  }, [router])

  useEffect(() => {
    api
      .getDocument(params.id)
      .then((doc) => {
        setDocument(doc)
        setTitle(doc.title)
      })
      .catch(() => router.push('/dashboard'))
  }, [params.id, router])

  function handleContentChange(content: unknown) {
    setStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await api.saveDocumentContent(params.id, content)
        setStatus('saved')
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Save failed')
      }
    }, 1000)
  }

  async function handleTitleBlur() {
    if (!document || title === document.title) return
    try {
      const updated = await api.renameDocument(params.id, title)
      setDocument(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed')
    }
  }

  if (!document || !me) return null

  return (
    <main>
      <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleTitleBlur} />
      <span>{status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : ''}</span>
      {error && <p role="alert">{error}</p>}

      {document.ownerId === me.id && <ShareDialog documentId={params.id} />}

      <Editor content={document.content} onChange={handleContentChange} />
    </main>
  )
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd frontend && npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/documents
git commit -m "Add document editor page with autosave, rename, and share gating"
```

---

### Task 15: Frontend Dockerfile

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/.dockerignore`

- [ ] **Step 1: Create the dockerignore**

`frontend/.dockerignore`:
```
node_modules
.next
.env.local
```

- [ ] **Step 2: Create the Dockerfile**

`frontend/Dockerfile`:
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

- [ ] **Step 3: Build the image standalone to verify it compiles**

Run: `cd frontend && docker build -t docs-frontend .`
Expected: build completes successfully, ending with the image tagged `docs-frontend`.

- [ ] **Step 4: Commit**

```bash
git add frontend/Dockerfile frontend/.dockerignore
git commit -m "Add frontend Dockerfile"
```

---

### Task 16: Docker Compose wiring

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create the compose file**

`docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: docs
      POSTGRES_PASSWORD: docs
      POSTGRES_DB: docs
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U docs"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://docs:docs@postgres:5432/docs
      PORT: 4000
      FRONTEND_ORIGIN: http://localhost:3000
      NODE_ENV: development
    ports:
      - "4000:4000"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_URL: http://localhost:4000
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

- [ ] **Step 2: Stop any manually-started containers from earlier tasks**

Run: `docker stop docs-postgres`
Expected: the ad-hoc Postgres container from Task 2 stops (compose will manage its own).

- [ ] **Step 3: Bring the full stack up**

Run: `docker compose up --build`
Expected: all three services start; backend logs show migrations applying, the seed running (`Seeded users: Alice, Bob, Carol`), and `Backend listening on port 4000`; frontend logs show it ready on port 3000.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "Add Docker Compose wiring for postgres, backend, and frontend"
```

---

### Task 17: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm the stack is up**

Run: `docker compose ps`
Expected: `postgres`, `backend`, `frontend` all show state `running`/`healthy`.

- [ ] **Step 2: Walk the golden path in a browser**

Open `http://localhost:3000`. Confirm:
- Login screen lists Alice, Bob, Carol.
- Logging in as Alice reaches the dashboard.
- "New document" creates a document and opens the editor.
- Typing text, then using Bold/Italic/Underline/H1/H2/H3/Bulleted list/Numbered list, changes the content visibly and the status indicator shows "Saving..." then "Saved".
- Editing the title field and clicking away renames the document.
- Refreshing the page reloads the same content and title (persistence).
- Back on the dashboard, the new document appears under "My Documents".

- [ ] **Step 3: Walk the sharing and import paths**

Still as Alice: click Share on the open document, grant access to Bob, confirm Bob now appears under "Shared with". Log out (clear cookies or use a private window), log in as Bob, confirm the document appears under "Shared with Me" with Alice's name shown, and that opening it does not show a Share control (owner-only gating). As Alice, revoke Bob's access and confirm Bob can no longer open the document (redirected to dashboard).

Then: from the dashboard, use "Import .txt or .md" with a small `.md` file containing a heading and a bullet list; confirm it creates a new document with matching structure and opens the editor on it.

- [ ] **Step 4: Confirm rejected file types are handled**

Attempt to import a `.png` or `.pdf` file via the same control (the `accept` attribute limits the file picker, but verify the backend also rejects it if you bypass that — e.g. via curl with a `.pdf` extension). Expected: a clear error, not a silent failure or a crash.

- [ ] **Step 5: Tear down**

Run: `docker compose down`
Expected: containers stop and are removed; the `postgres_data` volume persists (data will still be there next `docker compose up`).

No commit for this task — it's verification only, confirming Tasks 1-16 work together before moving to documentation and deployment config.

---

### Task 18: README, architecture note, and deployment config

**Files:**
- Create: `README.md`
- Create: `docs/architecture-note.md`
- Create: `render.yaml`

- [ ] **Step 1: Write the architecture note**

`docs/architecture-note.md`:
```markdown
# Architecture Note

## What this is

A scoped slice of a collaborative document editor: create/rename/edit rich-text
documents, import a .txt/.md file as a new document, share a document with another
seeded user, and persist all of it in Postgres. Full spec:
[docs/specs/2026-07-23-collaborative-doc-editor-design.md](specs/2026-07-23-collaborative-doc-editor-design.md).

## What was prioritized

- **Correct, testable access control** over broad sharing features. Sharing is
  single-tier (anyone granted access can view and edit) rather than role-based,
  because the access-check logic itself — not the number of roles — is where bugs
  actually hide, and it's covered by unit and integration tests.
- **A coherent editing loop** (create, format, autosave, reopen) over a wide
  formatting surface. The toolbar covers exactly what the editor persists and
  nothing it can't render back correctly.
- **A single language (TypeScript) across the stack** to keep the timebox spent on
  product logic rather than cross-language plumbing.

## Deliberate scope cuts

- No real authentication — a seeded-user picker stands in for login, documented as
  such and not intended as production security.
- No role-based sharing (viewer vs. editor) — one access tier.
- No real-time collaborative editing, no version history.
- Import supports `.txt` and `.md` only, and only block-level structure (headings,
  paragraphs, lists) — inline emphasis inside imported files is not parsed.
- `.docx` import was considered and dropped: a correct parser is a meaningfully
  larger dependency than the value it adds within this timebox.

## Testing

Backend unit tests cover the two places most likely to hide real bugs: the
access-check function (owner / shared / unauthorized) and the markdown/text import
converter. One Supertest integration test exercises the create-then-fetch path
against a real database. UI behavior was verified manually end to end rather than
with component tests, which was the better use of a tight timebox at this scope.
```

- [ ] **Step 2: Write the Render deployment config**

`render.yaml`:
```yaml
services:
  - type: web
    name: docs-backend
    env: node
    plan: free
    rootDir: backend
    buildCommand: npm install && npx prisma generate && npm run build
    startCommand: npx prisma migrate deploy && npx prisma db seed && node dist/index.js
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: FRONTEND_ORIGIN
        sync: false
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 4000
```

- [ ] **Step 3: Write the README**

`README.md`:
```markdown
# Docs — Collaborative Document Editor

A scoped, working slice of a Google-Docs-like editor: create/rename/edit rich-text
documents, import a `.txt` or `.md` file as a new document, share a document with
another user, and persist everything. See
[docs/architecture-note.md](docs/architecture-note.md) for what was prioritized and
cut, and [docs/specs/2026-07-23-collaborative-doc-editor-design.md](docs/specs/2026-07-23-collaborative-doc-editor-design.md)
for the full design.

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

## Scope

See [docs/architecture-note.md](docs/architecture-note.md) for what's deliberately
out of scope (no real auth, no role-based sharing, no real-time collaboration, no
version history) and why.
```

- [ ] **Step 4: Commit**

```bash
git add README.md docs/architecture-note.md render.yaml
git commit -m "Add README, architecture note, and Render deployment config"
```

---

## Post-plan: going live

Actually deploying to Vercel/Render/Supabase requires accounts that belong to you,
not to an agent acting on your behalf — creating third-party accounts isn't
something to automate. Once the plan above is executed and pushed to a GitHub repo
you control, the README's "Deployed version" section has the exact steps to click
through on each platform's free tier. Come back and fill in the two URLs there once
live.
