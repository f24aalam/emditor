import type {
  FileDialogRepository,
  FileRepository,
  RecentFile,
} from "@/features/files/model/file.types"
import { useFilesStore } from "@/features/files/stores/files.store"
import { useTabsStore } from "@/features/tabs"

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
  save: (tabId?: string) => Promise<boolean>
  saveAs: (tabId?: string) => Promise<boolean>
}

function errorText(cause: unknown, action: string): string {
  if (typeof cause === "string" && cause.trim()) return `${action}: ${cause}`
  if (cause instanceof Error && cause.message.trim()) return `${action}: ${cause.message}`
  return `${action}. Please try again.`
}

function activeOrRequestedTab(store: TabsStore, tabId?: string) {
  return tabId
    ? store.tabs.find((tab) => tab.id === tabId) ?? null
    : store.activeTab
}

export function createFileCommands(
  dependencies: FileCommandDependencies,
): FileCommands {
  const { tabsStore, filesStore, files, dialogs } = dependencies

  async function openPath(path: string, recent?: RecentFile): Promise<boolean> {
    const recentEntry = recent
      ?? filesStore.recentFiles.find((file) => file.filePath === path)
    try {
      const file = await files.read(path)
      tabsStore.openFile(file)
      filesStore.addRecentFile(file)
      return true
    } catch (cause: unknown) {
      if (recentEntry) filesStore.removeRecentFile(recentEntry.pathKey)
      filesStore.setError(errorText(cause, `Unable to open “${recentEntry?.title ?? path}”`))
      return false
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

  return { open, openPath, save, saveAs }
}
