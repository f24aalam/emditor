import type { SessionRepository, SessionSnapshot } from "@/features/session/model/session.types"
import { parseSessionSnapshot } from "@/features/session/model/session.validation"
import { STARTER_MARKDOWN, useTabsStore } from "@/features/tabs"
import { useFilesStore } from "@/features/files"

interface SessionController {
  restore: () => Promise<void>
  start: () => void
  flush: () => Promise<void>
  stop: () => Promise<void>
}

export function createSessionController(
  repository: SessionRepository,
  tabsStore: ReturnType<typeof useTabsStore>,
  filesStore: ReturnType<typeof useFilesStore>,
): SessionController {
  let unsubscribe: (() => void) | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  function snapshot(): SessionSnapshot {
    return {
      version: 1,
      tabs: tabsStore.tabs.map((tab) => ({
        ...tab,
        editorState: {
          source: { ...tab.editorState.source, selection: { ...tab.editorState.source.selection } },
          editor: { ...tab.editorState.editor, selection: { ...tab.editorState.editor.selection } },
          preview: { ...tab.editorState.preview },
        },
      })),
      activeTabId: tabsStore.activeTabId,
      recentFiles: filesStore.recentFiles.map((file) => ({ ...file })),
    }
  }

  async function flush(): Promise<void> {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    await repository.save(snapshot())
  }

  function schedule(): void {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void repository.save(snapshot()).catch((cause: unknown) => {
        console.error("Failed to persist the Emditor session", cause)
      })
    }, 300)
  }

  async function restore(): Promise<void> {
    try {
      const raw = await repository.load()
      if (raw === null || raw === undefined) {
        tabsStore.createTab(STARTER_MARKDOWN)
        return
      }
      const restored = parseSessionSnapshot(raw)
      if (!restored) {
        filesStore.setError("The previous session could not be restored because its data was invalid.")
        tabsStore.createTab(STARTER_MARKDOWN)
        return
      }
      tabsStore.replaceTabs(restored.tabs, restored.activeTabId)
      filesStore.replaceRecentFiles(restored.recentFiles)
    } catch (cause: unknown) {
      console.error("Failed to restore the Emditor session", cause)
      filesStore.setError("The previous session could not be restored. A new document was opened instead.")
      tabsStore.createTab(STARTER_MARKDOWN)
    }
  }

  function start(): void {
    if (unsubscribe) return
    const stopTabs = tabsStore.$subscribe(schedule, { detached: true })
    const stopFiles = filesStore.$subscribe(schedule, { detached: true })
    unsubscribe = () => {
      stopTabs()
      stopFiles()
    }
  }

  async function stop(): Promise<void> {
    unsubscribe?.()
    unsubscribe = null
    await flush()
  }

  return { restore, start, flush, stop }
}
