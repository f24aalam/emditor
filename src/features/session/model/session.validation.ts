import { createDefaultEditorState } from "@/features/tabs"
import type { DocumentEditorState, WorkspaceMode } from "@/features/tabs"
import type { RecentFile } from "@/features/files"
import type {
  SessionSnapshot,
  SessionTabSnapshot,
} from "@/features/session/model/session.types"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringOrNull(value: unknown): value is string | null {
  return typeof value === "string" || value === null
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isMode(value: unknown): value is WorkspaceMode {
  return value === "editor" || value === "source" || value === "split"
}

function number(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback
}

function editorState(value: unknown): DocumentEditorState {
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

function sessionTab(value: unknown): SessionTabSnapshot | null {
  if (!isRecord(value)) return null
  if (
    !nonEmptyString(value.id)
    || !nonEmptyString(value.title)
    || !isMode(value.mode)
  ) return null

  const isUntitled = value.filePath === null && value.pathKey === null
  const isFileBacked = nonEmptyString(value.filePath) && nonEmptyString(value.pathKey)
  if (!isUntitled && !isFileBacked) return null

  const draftCandidate = value.draftContent !== undefined
    ? value.draftContent
    : typeof value.content === "string"
      ? (isUntitled || value.content !== value.lastSavedContent ? value.content : null)
      : undefined

  if (isUntitled && typeof draftCandidate !== "string") return null
  if (isFileBacked && !stringOrNull(draftCandidate)) return null

  return {
    id: value.id,
    title: value.title,
    filePath: isFileBacked ? (value.filePath as string) : null,
    pathKey: isFileBacked ? (value.pathKey as string) : null,
    draftContent: draftCandidate as string | null,
    mode: value.mode,
    editorState: editorState(value.editorState),
  }
}

function recentFile(value: unknown): RecentFile | null {
  if (
    !isRecord(value)
    || !nonEmptyString(value.title)
    || !nonEmptyString(value.filePath)
    || !nonEmptyString(value.pathKey)
  ) return null
  return { title: value.title, filePath: value.filePath, pathKey: value.pathKey }
}

export function parseSessionSnapshot(value: unknown): SessionSnapshot | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.tabs)) return null
  const parsedTabs = value.tabs.map(sessionTab)
  if (parsedTabs.some((tab) => tab === null)) return null
  if (!stringOrNull(value.activeTabId)) return null

  const seenIds = new Set<string>()
  const seenPathKeys = new Set<string>()
  const tabs: SessionTabSnapshot[] = []
  for (const tab of parsedTabs) {
    if (!tab || seenIds.has(tab.id)) continue
    if (tab.pathKey !== null && seenPathKeys.has(tab.pathKey)) continue
    seenIds.add(tab.id)
    if (tab.pathKey !== null) seenPathKeys.add(tab.pathKey)
    tabs.push(tab)
  }

  const recentValues = Array.isArray(value.recentFiles) ? value.recentFiles : []
  const seenRecentKeys = new Set<string>()
  const recentFiles: RecentFile[] = []
  for (const candidate of recentValues) {
    const parsed = recentFile(candidate)
    if (!parsed || seenRecentKeys.has(parsed.pathKey)) continue
    seenRecentKeys.add(parsed.pathKey)
    recentFiles.push(parsed)
  }

  return {
    version: 1,
    tabs,
    activeTabId: value.activeTabId,
    recentFiles,
  }
}
