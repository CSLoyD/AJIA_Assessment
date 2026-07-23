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
