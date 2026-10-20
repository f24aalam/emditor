import type { FileRepository } from "@/features/files"
import { useFilesStore } from "@/features/files"
import type {
  SessionRepository,
  SessionSnapshot,
  SessionTabSnapshot,
} from "@/features/session/model/session.types"
import { parseSessionSnapshot } from "@/features/session/model/session.validation"
import { STARTER_MARKDOWN, useTabsStore, type DocumentTab } from "@/features/tabs"
import type { useThemeStore } from "@/features/theme"

const SAVE_DEBOUNCE_MS = 300

export interface SessionController {
  restore: () => Promise<string | null>
  start: () => void
  flush: () => Promise<void>
  stop: () => Promise<void>
}

export function useSessionRestoration(
  repository: SessionRepository,
  tabsStore: ReturnType<typeof useTabsStore>,
  filesStore: ReturnType<typeof useFilesStore>,
  files?: Pick<FileRepository, "read">,
  themeStore?: ReturnType<typeof useThemeStore>,
): SessionController {
  let unsubscribe: (() => void) | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let saveQueue = Promise.resolve()

  function snapshot(): SessionSnapshot {
    return {
      version: 1,
      tabs: tabsStore.tabs.map((tab) => {
        const modified = tabsStore.isModified(tab.id)
        return {
          id: tab.id,
          title: tab.title,
          filePath: tab.filePath,
          pathKey: tab.pathKey,
          draftContent: modified || tab.filePath === null ? tab.content : null,
          mode: tab.mode,
          editorState: {
            source: {
              ...tab.editorState.source,
              selection: { ...tab.editorState.source.selection },
            },
            editor: {
              ...tab.editorState.editor,
              selection: { ...tab.editorState.editor.selection },
            },
            preview: { ...tab.editorState.preview },
          },
        }
      }),
      activeTabId: tabsStore.activeTabId,
      recentFiles: filesStore.recentFiles.map((file) => ({ ...file })),
      ...(themeStore ? { theme: { ...themeStore.preferences } } : {}),
    }
  }

  function enqueueSave(nextSnapshot: SessionSnapshot): Promise<void> {
    saveQueue = saveQueue.then(
      () => repository.save(nextSnapshot),
      () => repository.save(nextSnapshot),
    )
    return saveQueue
  }

  async function flush(): Promise<void> {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    await enqueueSave(snapshot())
  }

  function schedule(): void {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void enqueueSave(snapshot()).catch((cause: unknown) => {
        console.error("Failed to persist the Emditor session", cause)
      })
    }, SAVE_DEBOUNCE_MS)
  }

  async function hydrateTab(tab: SessionTabSnapshot): Promise<DocumentTab | null> {
    if (tab.filePath === null || tab.pathKey === null) {
      const content = tab.draftContent ?? ""
      const lastSavedContent = content === STARTER_MARKDOWN ? STARTER_MARKDOWN : ""
      return {
        id: tab.id,
        title: tab.title,
        filePath: null,
        pathKey: null,
        content,
        lastSavedContent,
        mode: tab.mode,
        editorState: tab.editorState,
      }
    }

    if (!files) {
      const content = tab.draftContent ?? ""
      return {
        id: tab.id,
        title: tab.title,
        filePath: tab.filePath,
        pathKey: tab.pathKey,
        content,
        lastSavedContent: tab.draftContent === null ? content : "",
        mode: tab.mode,
        editorState: tab.editorState,
      }
    }

    try {
      const diskFile = await files.read(tab.filePath)
      return {
        id: tab.id,
        title: diskFile.title,
        filePath: diskFile.filePath,
        pathKey: diskFile.pathKey,
        content: tab.draftContent ?? diskFile.content,
        lastSavedContent: diskFile.content,
        mode: tab.mode,
        editorState: tab.editorState,
      }
    } catch {
      if (tab.draftContent !== null) {
        return {
          id: tab.id,
          title: tab.title,
          filePath: tab.filePath,
          pathKey: tab.pathKey,
          content: tab.draftContent,
          lastSavedContent: "",
          mode: tab.mode,
          editorState: tab.editorState,
        }
      }
      return null
    }
  }

  async function restore(): Promise<string | null> {
    try {
      const raw = await repository.load()
      if (raw === null || raw === undefined) {
        return tabsStore.createTab(STARTER_MARKDOWN)
      }
      const restored = parseSessionSnapshot(raw)
      if (!restored) {
        filesStore.setError("The previous session could not be restored because its data was invalid.")
        return tabsStore.createTab(STARTER_MARKDOWN)
      }

      if (restored.theme && themeStore) {
        themeStore.setPreferences(restored.theme)
      }
      const hydrated = (await Promise.all(restored.tabs.map(hydrateTab))).filter(
        (tab): tab is DocumentTab => tab !== null,
      )
      filesStore.replaceRecentFiles(restored.recentFiles)
      if (hydrated.length === 0 && restored.tabs.length > 0) {
        return tabsStore.createTab(STARTER_MARKDOWN)
      }
      tabsStore.replaceTabs(hydrated, restored.activeTabId)
      return null
    } catch (cause: unknown) {
      console.error("Failed to restore the Emditor session", cause)
      filesStore.setError("The previous session could not be restored. A new document was opened instead.")
      return tabsStore.createTab(STARTER_MARKDOWN)
    }
  }

  function start(): void {
    if (unsubscribe) return
    const stopTabs = tabsStore.$subscribe(schedule, { detached: true })
    const stopFiles = filesStore.$subscribe(schedule, { detached: true })
    const stopTheme = themeStore?.$subscribe(schedule, { detached: true })
    unsubscribe = () => {
      stopTabs()
      stopFiles()
      stopTheme?.()
    }
  }

  async function stop(): Promise<void> {
    unsubscribe?.()
    unsubscribe = null
    await flush()
  }

  return { restore, start, flush, stop }
}
