import { computed, ref } from "vue"
import { defineStore } from "pinia"

import type { DocumentMode, MarkdownDocument } from "@/types/document"

export const STARTER_MARKDOWN = `# Welcome to Emditor

Start writing your Markdown document.

## Code example

\`\`\`ts
const message = 'Hello from Emditor'
console.log(message)
\`\`\`
`

function createUntitledDocument(): MarkdownDocument {
  return {
    id: crypto.randomUUID(),
    name: "Untitled.md",
    path: null,
    markdown: STARTER_MARKDOWN,
    savedMarkdown: STARTER_MARKDOWN,
    mode: "editor",
  }
}

export const useDocumentsStore = defineStore("documents", () => {
  const activeDocument = ref<MarkdownDocument>(createUntitledDocument())

  const isDirty = computed(
    () => activeDocument.value.markdown !== activeDocument.value.savedMarkdown,
  )

  function createDocument(): void {
    activeDocument.value = createUntitledDocument()
  }

  function updateMarkdown(markdown: string): void {
    if (markdown === activeDocument.value.markdown) return
    activeDocument.value.markdown = markdown
  }

  function setMode(mode: DocumentMode): void {
    activeDocument.value.mode = mode
  }

  function markSaved(): void {
    activeDocument.value.savedMarkdown = activeDocument.value.markdown
  }

  return {
    activeDocument,
    isDirty,
    createDocument,
    updateMarkdown,
    setMode,
    markSaved,
  }
})
