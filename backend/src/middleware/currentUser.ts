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
