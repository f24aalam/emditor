import type { RecentFile } from "@/features/files"
import type { DocumentEditorState, WorkspaceMode } from "@/features/tabs"

export type { SessionRepository } from "@/features/session/model/session.repository"

export interface SessionTabSnapshot {
  id: string
  title: string
  filePath: string | null
  pathKey: string | null
  draftContent: string | null
  mode: WorkspaceMode
  editorState: DocumentEditorState
}

export interface SessionSnapshot {
  version: 1
  tabs: SessionTabSnapshot[]
  activeTabId: string | null
  recentFiles: RecentFile[]
}
