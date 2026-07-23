'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Editor from '../../../components/Editor'
import ShareDialog from '../../../components/ShareDialog'
import { api } from '../../../lib/api'
import type { Document, User } from '../../../lib/types'

export default function DocumentPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [me, setMe] = useState<User | null>(null)
  const [document, setDocument] = useState<Document | null>(null)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    api.me().then(setMe).catch(() => router.push('/'))
  }, [router])

  useEffect(() => {
    api
      .getDocument(params.id)
      .then((doc) => {
        setDocument(doc)
        setTitle(doc.title)
      })
      .catch(() => router.push('/dashboard'))
  }, [params.id, router])

  function handleContentChange(content: unknown) {
    setStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await api.saveDocumentContent(params.id, content)
        setStatus('saved')
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Save failed')
      }
    }, 1000)
  }

  async function handleTitleBlur() {
    if (!document || title === document.title) return
    try {
      const updated = await api.renameDocument(params.id, title)
      setDocument(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed')
    }
  }

  if (!document || !me) return null

  return (
    <main>
      <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleTitleBlur} />
      <span>{status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : ''}</span>
      {error && <p role="alert">{error}</p>}

      {document.ownerId === me.id && <ShareDialog documentId={params.id} />}

      <Editor content={document.content} onChange={handleContentChange} />
    </main>
  )
}
