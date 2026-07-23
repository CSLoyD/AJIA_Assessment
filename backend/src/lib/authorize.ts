export interface DocumentAccessInfo {
  ownerId: string
  sharedUserIds: string[]
}

export function canAccessDocument(document: DocumentAccessInfo, userId: string): boolean {
  return document.ownerId === userId || document.sharedUserIds.includes(userId)
}
