import type { Document, Share, SharedDocument, User } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(body.error ?? 'Request failed')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export const api = {
  listUsers: () => request<User[]>('/auth/users'),
  login: (userId: string) => request<User>('/auth/login', { method: 'POST', body: JSON.stringify({ userId }) }),
  me: () => request<User>('/auth/me'),
  listDocuments: () => request<{ owned: Document[]; shared: SharedDocument[] }>('/documents'),
  createDocument: (title: string) =>
    request<Document>('/documents', { method: 'POST', body: JSON.stringify({ title }) }),
  importDocument: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request<Document>('/documents/import', { method: 'POST', body: formData })
  },
  getDocument: (id: string) => request<Document>(`/documents/${id}`),
  renameDocument: (id: string, title: string) =>
    request<Document>(`/documents/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  saveDocumentContent: (id: string, content: unknown) =>
    request<Document>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  getShareableUsers: (id: string) => request<User[]>(`/documents/${id}/shareable-users`),
  getShares: (id: string) => request<Share[]>(`/documents/${id}/shares`),
  shareDocument: (id: string, userId: string) =>
    request(`/documents/${id}/share`, { method: 'POST', body: JSON.stringify({ userId }) }),
  revokeShare: (id: string, userId: string) =>
    request(`/documents/${id}/share/${userId}`, { method: 'DELETE' }),
}
