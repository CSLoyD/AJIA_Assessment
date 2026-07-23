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
