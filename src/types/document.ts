export type DocumentMode =
  | "editor"
  | "viewer"
  | "source"
  | "split"

export interface MarkdownDocument {
  id: string
  name: string
  path: string | null
  markdown: string
  savedMarkdown: string
  mode: DocumentMode
}
