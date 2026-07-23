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
    setError(null)
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
