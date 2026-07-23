import { Router } from 'express'
import multer from 'multer'
import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { AuthedRequest, currentUser } from '../middleware/currentUser'
import { canAccessDocument } from '../lib/authorize'
import {
  markdownToDocumentJson,
  plainTextToDocumentJson,
  titleFromFilename,
} from '../lib/importDocument'

export const documentsRouter = Router()
documentsRouter.use(currentUser)

const emptyDocument = { type: 'doc', content: [{ type: 'paragraph' }] }

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
      content: content as unknown as Prisma.InputJsonValue,
      ownerId: req.currentUser!.id,
    },
  })

  res.status(201).json(document)
})

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
  const { shares, ...documentResponse } = document
  res.json(documentResponse)
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
