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
