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

export interface EditorCommands {
  undo: () => boolean
  redo: () => boolean
  canUndo: () => boolean
  canRedo: () => boolean
}

export const EMPTY_EDITOR_STATE: EditorViewportState = Object.freeze({
  selection: Object.freeze({ anchor: 0, head: 0 }),
  scrollTop: 0,
  scrollLeft: 0,
})

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
