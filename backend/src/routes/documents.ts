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
