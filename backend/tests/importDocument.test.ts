import { describe, expect, it } from 'vitest'
import {
  markdownToDocumentJson,
  plainTextToDocumentJson,
  titleFromFilename,
} from '../src/lib/importDocument'

describe('markdownToDocumentJson', () => {
  it('converts headings, paragraphs, and lists into matching node types', () => {
    const markdown = '# Title\n\nSome text\n\n- one\n- two\n\n1. first\n2. second'
    const result = markdownToDocumentJson(markdown)

    expect(result.content[0]).toEqual({
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Title' }],
    })
    expect(result.content[1]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Some text' }],
    })
    expect(result.content[2].type).toBe('bulletList')
    expect(result.content[2].content).toHaveLength(2)
    expect(result.content[3].type).toBe('orderedList')
    expect(result.content[3].content).toHaveLength(2)
  })
})

describe('plainTextToDocumentJson', () => {
  it('wraps each line in its own paragraph', () => {
    const result = plainTextToDocumentJson('line one\nline two')
    expect(result.content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'line one' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'line two' }] },
    ])
  })
})

describe('titleFromFilename', () => {
  it('strips supported extensions', () => {
    expect(titleFromFilename('notes.md')).toBe('notes')
    expect(titleFromFilename('draft.txt')).toBe('draft')
  })
})
