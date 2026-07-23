'use client'

import type { Editor } from '@tiptap/react'

export default function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div role="toolbar">
      <button onClick={() => editor.chain().focus().toggleBold().run()} aria-pressed={editor.isActive('bold')}>
        Bold
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} aria-pressed={editor.isActive('italic')}>
        Italic
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        aria-pressed={editor.isActive('underline')}
      >
        Underline
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        aria-pressed={editor.isActive('heading', { level: 1 })}
      >
        H1
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        aria-pressed={editor.isActive('heading', { level: 2 })}
      >
        H2
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        aria-pressed={editor.isActive('heading', { level: 3 })}
      >
        H3
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        aria-pressed={editor.isActive('bulletList')}
      >
        Bulleted list
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        aria-pressed={editor.isActive('orderedList')}
      >
        Numbered list
      </button>
    </div>
  )
}
