import type {
  DocumentEditorState,
  WorkspaceMode,
} from "@/features/editor"

export {
  createDefaultEditorState,
  type DocumentEditorState,
  type EditorSelectionState,
  type EditorViewportState,
  type PreviewViewportState,
  type WorkspaceMode,
} from "@/features/editor"

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
