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
