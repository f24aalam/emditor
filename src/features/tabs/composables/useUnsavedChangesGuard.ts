import { computed, nextTick, onUnmounted, ref } from "vue"

import type { FileCommands } from "@/features/files"
import type { WindowRepository } from "@/features/tabs/model/window.repository"
import { useTabsStore } from "@/features/tabs/stores/tabs.store"

interface SessionFlusher {
  flush: () => Promise<void>
}

export function useUnsavedChangesGuard(
  fileCommands: FileCommands,
  windowRepository: WindowRepository,
  session: SessionFlusher,
) {
  const tabsStore = useTabsStore()
  const pendingTabId = ref<string | null>(null)
  const pendingWindowClose = ref(false)
  const processing = ref(false)
  let unlisten: (() => void) | null = null

  const dialogOpen = computed(
    () => !processing.value
      && (pendingWindowClose.value || pendingTabId.value !== null),
  )
  const dirtyTabs = computed(() => tabsStore.tabs.filter((tab) => tabsStore.isModified(tab.id)))
  const dialogTitle = computed(() => {
    if (pendingWindowClose.value && dirtyTabs.value.length > 1) {
      return `Save changes to ${dirtyTabs.value.length} documents?`
    }
    const tab = pendingWindowClose.value
      ? dirtyTabs.value[0]
      : tabsStore.tabs.find((candidate) => candidate.id === pendingTabId.value)
    return `Save changes to ${tab?.title ?? "this document"}?`
  })

  function clearPending(): void {
    pendingTabId.value = null
    pendingWindowClose.value = false
  }

  function requestClose(tabId: string): void {
    if (processing.value || pendingWindowClose.value || pendingTabId.value !== null) {
      return
    }
    if (!tabsStore.isModified(tabId)) {
      tabsStore.closeTab(tabId)
      return
    }
    pendingTabId.value = tabId
  }

  async function requestWindowClose(): Promise<void> {
    if (processing.value || pendingWindowClose.value) return
    pendingTabId.value = null
    if (!tabsStore.hasModifiedTabs) {
      processing.value = true
      try {
        await session.flush()
        await windowRepository.destroy()
        return
      } finally {
        processing.value = false
      }
    }
    pendingWindowClose.value = true
  }

  async function saveAndContinue(): Promise<void> {
    if (processing.value) return
    processing.value = true
    try {
      // Remove the webview modal and its focus trap before opening a native
      // Save As dialog. Running both modal systems together breaks focus on
      // some Linux desktop environments.
      await nextTick()

      if (pendingWindowClose.value) {
        for (const tab of [...dirtyTabs.value]) {
          if (!tab.filePath) {
            tabsStore.activateTab(tab.id)
            await nextTick()
          }
          if (!await fileCommands.save(tab.id)) return
        }
        await session.flush()
        await windowRepository.destroy()
        return
      }

      const tabId = pendingTabId.value
      if (!tabId || !await fileCommands.save(tabId)) return
      tabsStore.closeTab(tabId)
      clearPending()
    } finally {
      processing.value = false
    }
  }

  async function discardAndContinue(): Promise<void> {
    if (processing.value) return
    processing.value = true
    try {
      if (pendingWindowClose.value) {
        for (const tab of [...dirtyTabs.value]) tabsStore.discardChanges(tab.id)
        await session.flush()
        await windowRepository.destroy()
        return
      }
      if (pendingTabId.value) tabsStore.closeTab(pendingTabId.value)
      clearPending()
    } finally {
      processing.value = false
    }
  }

  function cancel(): void {
    if (!processing.value) clearPending()
  }

  async function start(): Promise<void> {
    unlisten = await windowRepository.onCloseRequested(() => {
      void requestWindowClose()
    })
  }

  onUnmounted(() => unlisten?.())

  return {
    dialogOpen,
    dialogTitle,
    processing,
    requestClose,
    requestWindowClose,
    saveAndContinue,
    discardAndContinue,
    cancel,
    start,
  }
}
