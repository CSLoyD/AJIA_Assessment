'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '../../lib/api'
import type { Document, SharedDocument, User } from '../../lib/types'

export default function DashboardPage() {
  const [me, setMe] = useState<User | null>(null)
  const [owned, setOwned] = useState<Document[]>([])
  const [shared, setShared] = useState<SharedDocument[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    api
      .me()
      .then(setMe)
      .catch(() => router.push('/'))
  }, [router])

  useEffect(() => {
    if (!me) return
    api
      .listDocuments()
      .then((data) => {
        setOwned(data.owned)
        setShared(data.shared)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load documents'))
  }, [me])

  async function handleCreate() {
    const document = await api.createDocument('Untitled document')
    router.push(`/documents/${document.id}`)
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const isSupported = /\.(txt|md)$/i.test(file.name)
    if (!isSupported) {
      setError('Only .txt and .md files are supported')
      event.target.value = ''
      return
    }

    try {
      const document = await api.importDocument(file)
      router.push(`/documents/${document.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      event.target.value = ''
    }
  }

  if (!me) return null

  return (
    <main>
      <h1>Welcome, {me.name}</h1>
      {error && <p role="alert">{error}</p>}

      <button onClick={handleCreate}>New document</button>

      <label>
        Import .txt or .md
        <input type="file" accept=".txt,.md" onChange={handleImport} />
      </label>

      <section>
        <h2>My Documents</h2>
        <ul>
          {owned.map((doc) => (
            <li key={doc.id}>
              <Link href={`/documents/${doc.id}`}>{doc.title}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Shared with Me</h2>
        <ul>
          {shared.map((doc) => (
            <li key={doc.id}>
              <Link href={`/documents/${doc.id}`}>{doc.title}</Link> — shared by {doc.ownerName}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
