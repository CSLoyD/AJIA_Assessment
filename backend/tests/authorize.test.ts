import { describe, expect, it } from 'vitest'
import { canAccessDocument } from '../src/lib/authorize'

describe('canAccessDocument', () => {
  it('allows the owner', () => {
    expect(canAccessDocument({ ownerId: 'u1', sharedUserIds: [] }, 'u1')).toBe(true)
  })

  it('allows a user the document is shared with', () => {
    expect(canAccessDocument({ ownerId: 'u1', sharedUserIds: ['u2'] }, 'u2')).toBe(true)
  })

  it('denies a user with no relationship to the document', () => {
    expect(canAccessDocument({ ownerId: 'u1', sharedUserIds: ['u2'] }, 'u3')).toBe(false)
  })
})
