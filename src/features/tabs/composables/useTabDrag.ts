import { ref } from "vue"

import { useTabsStore } from "@/features/tabs"

export function useTabDrag() {
  const tabsStore = useTabsStore()
  const draggedTabId = ref<string | null>(null)

  function start(tabId: string, event: DragEvent): void {
    draggedTabId.value = tabId
    event.dataTransfer?.setData("text/plain", tabId)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
  }

  function over(tabId: string, event: DragEvent): void {
    event.preventDefault()
    const draggedId = draggedTabId.value
    if (!draggedId || draggedId === tabId) return
    const from = tabsStore.tabs.findIndex((tab) => tab.id === draggedId)
    const to = tabsStore.tabs.findIndex((tab) => tab.id === tabId)
    tabsStore.reorderTabs(from, to)
  }

  function end(): void {
    draggedTabId.value = null
  }

  return { draggedTabId, start, over, end }
}
