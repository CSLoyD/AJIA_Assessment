interface DocNode {
  type: string
  attrs?: Record<string, unknown>
  content?: DocNode[]
  text?: string
}

function paragraph(text: string): DocNode {
  return text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' }
}

function heading(level: number, text: string): DocNode {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] }
}

function listItem(text: string): DocNode {
  return { type: 'listItem', content: [paragraph(text)] }
}

export function markdownToDocumentJson(markdown: string): { type: 'doc'; content: DocNode[] } {
  const lines = markdown.split(/\r?\n/)
  const content: DocNode[] = []
  let currentList: { type: 'bulletList' | 'orderedList'; items: DocNode[] } | null = null

  function flushList() {
    if (currentList) {
      content.push({ type: currentList.type, content: currentList.items })
      currentList = null
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line === '') {
      flushList()
      continue
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/)
    if (headingMatch) {
      flushList()
      content.push(heading(headingMatch[1].length, headingMatch[2]))
      continue
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/)
    if (bulletMatch) {
      if (currentList?.type !== 'bulletList') {
        flushList()
        currentList = { type: 'bulletList', items: [] }
      }
      currentList.items.push(listItem(bulletMatch[1]))
      continue
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/)
    if (orderedMatch) {
      if (currentList?.type !== 'orderedList') {
        flushList()
        currentList = { type: 'orderedList', items: [] }
      }
      currentList.items.push(listItem(orderedMatch[1]))
      continue
    }

    flushList()
    content.push(paragraph(line))
  }

  flushList()

  return { type: 'doc', content: content.length > 0 ? content : [paragraph('')] }
}

export function plainTextToDocumentJson(text: string): { type: 'doc'; content: DocNode[] } {
  const paragraphs = text.split(/\r?\n/).map((line) => paragraph(line.trim()))
  return { type: 'doc', content: paragraphs.length > 0 ? paragraphs : [paragraph('')] }
}

export function titleFromFilename(filename: string): string {
  return filename.replace(/\.(md|txt)$/i, '').trim() || 'Untitled'
}
