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

  it('saves document content and persists it across a subsequent fetch', async () => {
    const createResponse = await agent.post('/documents').send({ title: 'Content Test Doc' }).expect(201)
    const documentId = createResponse.body.id

    const newContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'saved' }] }] }
    const putResponse = await agent.put(`/documents/${documentId}`).send({ content: newContent }).expect(200)
    expect(putResponse.body.content).toEqual(newContent)

    const getResponse = await agent.get(`/documents/${documentId}`).expect(200)
    expect(getResponse.body.content).toEqual(newContent)

    await prisma.document.delete({ where: { id: documentId } })
  })

  it('renames a document and rejects a blank title', async () => {
    const createResponse = await agent.post('/documents').send({ title: 'Original Title' }).expect(201)
    const documentId = createResponse.body.id

    const patchResponse = await agent.patch(`/documents/${documentId}`).send({ title: 'Renamed Title' }).expect(200)
    expect(patchResponse.body.title).toBe('Renamed Title')

    const getResponse = await agent.get(`/documents/${documentId}`).expect(200)
    expect(getResponse.body.title).toBe('Renamed Title')

    await agent.patch(`/documents/${documentId}`).send({ title: '   ' }).expect(400)

    await prisma.document.delete({ where: { id: documentId } })
  })
})
