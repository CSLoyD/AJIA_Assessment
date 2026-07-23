'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../lib/api'
import type { User } from '../lib/types'

export default function LoginPage() {
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    api
      .listUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users'))
  }, [])

  async function handleLogin(userId: string) {
    try {
      await api.login(userId)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <main>
      <h1>Docs</h1>
      <p>Pick a user to continue. This is a demo login with no password.</p>
      {error && <p role="alert">{error}</p>}
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <button onClick={() => handleLogin(user.id)}>{user.name}</button>
          </li>
        ))}
      </ul>
    </main>
  )
}
