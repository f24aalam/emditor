import type { FileCommands } from "@/features/files"
import type { CliRepository, OpenRequest } from "@/features/cli/model/cli.types"
import type { useTabsStore } from "@/features/tabs"
import { formatErrorMessage } from "@/shared/utils/error"

type TabsStore = ReturnType<typeof useTabsStore>

interface Dependencies {
  repository: CliRepository
  files: Pick<FileCommands, "openCliPath" | "openCliPaths">
  tabsStore: TabsStore
  reportError: (message: string) => void
}

interface PendingWait {
  tabIds: Set<string>
  failed: boolean
}

export function useCliOpenController(dependencies: Dependencies) {
  const { repository, files, tabsStore, reportError } = dependencies
  const seen = new Set<string>()
  const waits = new Map<string, PendingWait>()
  let bufferedEvents: OpenRequest[] = []
  let pending: OpenRequest[] = []
  let ready = false
  let processing: Promise<void> | null = null
  let unlisten: (() => void) | null = null
  let unsubscribeTabs: (() => void) | null = null
  let automaticWelcomeTabId: string | null = null

  async function complete(token: string, wait: PendingWait): Promise<void> {
    waits.delete(token)
    try {
      await repository.completeWait(token, wait.failed)
    } catch (cause: unknown) {
      reportError(formatErrorMessage(cause, "Unable to complete a terminal wait request"))
    }
  }

  async function reconcileWaits(): Promise<void> {
    if (waits.size === 0) return
    const openIds = new Set(tabsStore.tabs.map((tab) => tab.id))
    const completed = [...waits.entries()].filter(([, wait]) =>
      [...wait.tabIds].every((tabId) => !openIds.has(tabId))
    )
    for (const [token, wait] of completed) await complete(token, wait)
  }

  function closeWelcomeTabIfPresent(): void {
    if (
      automaticWelcomeTabId
      && tabsStore.tabs.some((tab) => tab.id === automaticWelcomeTabId)
    ) {
      tabsStore.closeTab(automaticWelcomeTabId)
      automaticWelcomeTabId = null
    }
  }

  async function processRequest(request: OpenRequest): Promise<void> {
    if (seen.has(request.id)) return
    seen.add(request.id)
    const tabIds = new Set<string>()
    let failed = false

    if (files.openCliPaths && request.paths.length > 1) {
      const batch = await files.openCliPaths(request.paths)
      for (const id of batch.ids) tabIds.add(id)
      failed = batch.failed
      if (batch.ids.length > 0) closeWelcomeTabIfPresent()
    } else {
      for (const path of request.paths) {
        const opened = await files.openCliPath(path)
        if (!opened) {
          failed = true
          continue
        }
        tabIds.add(opened.id)
        closeWelcomeTabIfPresent()
      }
    }

    if (request.waitToken) {
      const wait = { tabIds, failed }
      waits.set(request.waitToken, wait)
      if (tabIds.size === 0) await complete(request.waitToken, wait)
    }
  }

  function schedule(): Promise<void> {
    if (!processing) {
      processing = (async () => {
        while (pending.length > 0) {
          const request = pending.shift()
          if (request) await processRequest(request)
        }
      })().finally(() => {
        processing = null
        if (pending.length > 0) void schedule()
      })
    }
    return processing
  }

  function accept(request: OpenRequest): void {
    if (!ready) {
      bufferedEvents.push(request)
      return
    }
    pending.push(request)
    void schedule()
  }

  async function startListening(): Promise<void> {
    if (unlisten) return
    unlisten = await repository.listen(accept)
  }

  async function finishStartup(welcomeTabId: string | null): Promise<void> {
    automaticWelcomeTabId = welcomeTabId
    const startup = await repository.drain()
    const events = bufferedEvents
    bufferedEvents = []
    ready = true
    pending.push(...startup, ...events)
    unsubscribeTabs = tabsStore.$subscribe(() => {
      void reconcileWaits()
    }, { detached: true })
    await schedule()
  }

  function stop(): void {
    unlisten?.()
    unlisten = null
    unsubscribeTabs?.()
    unsubscribeTabs = null
  }

  return { startListening, finishStartup, stop }
}
