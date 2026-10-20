import { ref } from "vue"

import { useTabsStore } from "@/features/tabs/stores/tabs.store"

const EDGE_SCROLL_ZONE_PX = 48
const EDGE_SCROLL_STEP_PX = 14

export function useTabDrag() {
  const tabsStore = useTabsStore()
  const draggedTabId = ref<string | null>(null)

  function autoScrollContainer(event: DragEvent): void {
    const target = event.currentTarget
    if (!(target instanceof HTMLElement)) return
    const scroller = target.closest(".tab-bar__scroll")
    if (!(scroller instanceof HTMLElement)) return

    const rect = scroller.getBoundingClientRect()
    if (event.clientX - rect.left < EDGE_SCROLL_ZONE_PX) {
      scroller.scrollLeft -= EDGE_SCROLL_STEP_PX
    } else if (rect.right - event.clientX < EDGE_SCROLL_ZONE_PX) {
      scroller.scrollLeft += EDGE_SCROLL_STEP_PX
    }
  }

  function start(tabId: string, event: DragEvent): void {
    draggedTabId.value = tabId
    event.dataTransfer?.setData("text/plain", tabId)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
  }

  function over(tabId: string, event: DragEvent): void {
    event.preventDefault()
    autoScrollContainer(event)
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
