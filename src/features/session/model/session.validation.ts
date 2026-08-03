import { createDefaultEditorState } from "@/features/tabs/model/tab.types"
import type { DocumentTab, WorkspaceMode } from "@/features/tabs"
import type { RecentFile } from "@/features/files"
import type { SessionSnapshot } from "@/features/session/model/session.types"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringOrNull(value: unknown): value is string | null {
  return typeof value === "string" || value === null
}

function isMode(value: unknown): value is WorkspaceMode {
  return value === "editor" || value === "source" || value === "split"
}

function number(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback
}

function editorState(value: unknown): DocumentTab["editorState"] {
  const fallback = createDefaultEditorState()
  if (!isRecord(value)) return fallback
  const stateRecord = value

  function viewport(key: "source" | "editor") {
    const candidate = stateRecord[key]
    if (!isRecord(candidate)) return fallback[key]
    const selection = isRecord(candidate.selection) ? candidate.selection : {}
    return {
      selection: {
        anchor: number(selection.anchor),
        head: number(selection.head),
      },
      scrollTop: number(candidate.scrollTop),
      scrollLeft: number(candidate.scrollLeft),
    }
  }

  const preview = isRecord(stateRecord.preview) ? stateRecord.preview : {}
  return {
    source: viewport("source"),
    editor: viewport("editor"),
    preview: {
      scrollTop: number(preview.scrollTop),
      scrollLeft: number(preview.scrollLeft),
    },
  }
}

function documentTab(value: unknown): DocumentTab | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== "string"
    || typeof value.title !== "string"
    || !stringOrNull(value.filePath)
    || !stringOrNull(value.pathKey)
    || typeof value.content !== "string"
    || typeof value.lastSavedContent !== "string"
    || !isMode(value.mode)
  ) return null

  return {
    id: value.id,
    title: value.title,
    filePath: value.filePath,
    pathKey: value.pathKey,
    content: value.content,
    lastSavedContent: value.lastSavedContent,
    mode: value.mode,
    editorState: editorState(value.editorState),
  }
}

function recentFile(value: unknown): RecentFile | null {
  if (
    !isRecord(value)
    || typeof value.title !== "string"
    || typeof value.filePath !== "string"
    || typeof value.pathKey !== "string"
  ) return null
  return { title: value.title, filePath: value.filePath, pathKey: value.pathKey }
}

export function parseSessionSnapshot(value: unknown): SessionSnapshot | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.tabs)) return null
  const tabs = value.tabs.map(documentTab)
  if (tabs.some((tab) => tab === null)) return null
  if (!stringOrNull(value.activeTabId)) return null

  const recentValues = Array.isArray(value.recentFiles) ? value.recentFiles : []
  const recentFiles = recentValues.map(recentFile).filter((file) => file !== null)
  return {
    version: 1,
    tabs: tabs.filter((tab) => tab !== null),
    activeTabId: value.activeTabId,
    recentFiles,
  }
}
