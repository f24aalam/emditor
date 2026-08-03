export type WorkspaceMode = "editor" | "source" | "split"

export interface EditorSelectionState {
  anchor: number
  head: number
}

export interface EditorViewportState {
  selection: EditorSelectionState
  scrollTop: number
  scrollLeft: number
}

export interface PreviewViewportState {
  scrollTop: number
  scrollLeft: number
}

export interface DocumentEditorState {
  source: EditorViewportState
  editor: EditorViewportState
  preview: PreviewViewportState
}

export interface DocumentTab {
  id: string
  title: string
  filePath: string | null
  pathKey: string | null
  content: string
  lastSavedContent: string
  mode: WorkspaceMode
  editorState: DocumentEditorState
}

export interface OpenedMarkdownFile {
  title: string
  filePath: string
  pathKey: string
  content: string
}

export interface SavedMarkdownFile {
  title: string
  filePath: string
  pathKey: string
}

export function createDefaultEditorState(): DocumentEditorState {
  const viewport = (): EditorViewportState => ({
    selection: { anchor: 0, head: 0 },
    scrollTop: 0,
    scrollLeft: 0,
  })

  return {
    source: viewport(),
    editor: viewport(),
    preview: { scrollTop: 0, scrollLeft: 0 },
  }
}
