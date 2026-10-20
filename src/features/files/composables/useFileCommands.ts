import type {
  FileDialogRepository,
  FileRepository,
  RecentFile,
} from "@/features/files/model/file.types"
import { useFilesStore } from "@/features/files/stores/files.store"
import { useTabsStore, type OpenedMarkdownFile } from "@/features/tabs"
import { formatErrorMessage } from "@/shared/utils/error"

type TabsStore = ReturnType<typeof useTabsStore>
type FilesStore = ReturnType<typeof useFilesStore>

interface FileCommandDependencies {
  tabsStore: TabsStore
  filesStore: FilesStore
  files: FileRepository
  dialogs: FileDialogRepository
}

export interface FileCommands {
  open: () => Promise<boolean>
  openPath: (path: string, recent?: RecentFile) => Promise<boolean>
  openCliPath: (path: string) => Promise<{ id: string; created: boolean } | null>
  openCliPaths?: (paths: readonly string[]) => Promise<{ ids: string[]; failed: boolean }>
  save: (tabId?: string) => Promise<boolean>
  saveAs: (tabId?: string) => Promise<boolean>
}

function errorText(cause: unknown, action: string): string {
  return formatErrorMessage(cause, action, ". Please try again.")
}

function activeOrRequestedTab(store: TabsStore, tabId?: string) {
  return tabId
    ? store.tabs.find((tab) => tab.id === tabId) ?? null
    : store.activeTab
}

export function useFileCommands(
  dependencies: FileCommandDependencies,
): FileCommands {
  const { tabsStore, filesStore, files, dialogs } = dependencies

  async function readForOpen(
    path: string,
    recent?: RecentFile,
    allowMissing = false,
  ): Promise<OpenedMarkdownFile | null> {
    const recentEntry = recent
      ?? filesStore.recentFiles.find((file) => file.filePath === path)
    try {
      return await files.read(path, allowMissing)
    } catch (cause: unknown) {
      if (recentEntry) filesStore.removeRecentFile(recentEntry.pathKey)
      filesStore.setError(errorText(cause, `Unable to open “${recentEntry?.title ?? path}”`))
      return null
    }
  }

  async function openPathResult(
    path: string,
    recent?: RecentFile,
    allowMissing = false,
  ): Promise<{ id: string; created: boolean } | null> {
    const file = await readForOpen(path, recent, allowMissing)
    if (!file) return null
    const result = tabsStore.openFile(file)
    filesStore.addRecentFile(file)
    return result
  }

  async function openPath(path: string, recent?: RecentFile): Promise<boolean> {
    return (await openPathResult(path, recent)) !== null
  }

  function openCliPath(path: string): Promise<{ id: string; created: boolean } | null> {
    return openPathResult(path, undefined, true)
  }

  async function openCliPaths(
    paths: readonly string[],
  ): Promise<{ ids: string[]; failed: boolean }> {
    if (paths.length === 0) return { ids: [], failed: false }
    const loaded = await Promise.all(
      paths.map((path) => readForOpen(path, undefined, true)),
    )
    const validFiles = loaded.filter(
      (file): file is OpenedMarkdownFile => file !== null,
    )
    const failed = validFiles.length !== paths.length
    const opened = tabsStore.openFiles(validFiles)
    filesStore.addRecentFiles(validFiles)
    return {
      ids: opened.map((entry) => entry.id),
      failed,
    }
  }

  async function open(): Promise<boolean> {
    try {
      const path = await dialogs.chooseMarkdownFile()
      return path ? openPath(path) : false
    } catch (cause: unknown) {
      filesStore.setError(errorText(cause, "Unable to show the Open dialog"))
      return false
    }
  }

  async function writeTo(tabId: string, path: string): Promise<boolean> {
    const tab = tabsStore.tabs.find((candidate) => candidate.id === tabId)
    if (!tab || filesStore.busyTabIds.includes(tabId)) return false
    filesStore.setBusy(tabId, true)
    try {
      const resolved = await files.resolve(path)
      const owner = tabsStore.tabs.find(
        (candidate) => candidate.id !== tabId && candidate.pathKey === resolved.pathKey,
      )
      if (owner) {
        filesStore.setError(`“${resolved.title}” is already open in another tab.`)
        return false
      }

      const saved = await files.write(path, tab.content)
      tabsStore.completeSave(tabId, saved)
      filesStore.addRecentFile(saved)
      return true
    } catch (cause: unknown) {
      filesStore.setError(errorText(cause, `Unable to save “${tab.title}”`))
      return false
    } finally {
      filesStore.setBusy(tabId, false)
    }
  }

  async function saveAs(tabId?: string): Promise<boolean> {
    const tab = activeOrRequestedTab(tabsStore, tabId)
    if (!tab) return false
    try {
      const suggestedName = tab.filePath ? tab.title : `${tab.title}.md`
      const path = await dialogs.chooseMarkdownSavePath(suggestedName)
      return path ? writeTo(tab.id, path) : false
    } catch (cause: unknown) {
      filesStore.setError(errorText(cause, "Unable to show the Save As dialog"))
      return false
    }
  }

  async function save(tabId?: string): Promise<boolean> {
    const tab = activeOrRequestedTab(tabsStore, tabId)
    if (!tab) return false
    return tab.filePath ? writeTo(tab.id, tab.filePath) : saveAs(tab.id)
  }

  return { open, openPath, openCliPath, openCliPaths, save, saveAs }
}
