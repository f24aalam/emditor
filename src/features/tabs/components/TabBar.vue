<script setup lang="ts">
import { nextTick, watch } from "vue"

import DocumentTab from "@/features/tabs/components/DocumentTab.vue"
import NewTabButton from "@/features/tabs/components/NewTabButton.vue"
import { useTabDrag } from "@/features/tabs/composables/useTabDrag"
import { useTabsStore } from "@/features/tabs"

const emit = defineEmits<{ close: [tabId: string]; new: [] }>()
const tabsStore = useTabsStore()
const { draggedTabId, start, over, end } = useTabDrag()
let lastWheelTabChange = 0

function scrollTabs(event: WheelEvent): void {
  const element = event.currentTarget
  if (!(element instanceof HTMLElement)) return

  if (event.shiftKey && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    const now = performance.now()
    if (now - lastWheelTabChange < 140) return
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      ? event.deltaY
      : event.deltaX
    if (delta === 0) return
    const currentIndex = tabsStore.tabs.findIndex(
      (tab) => tab.id === tabsStore.activeTabId,
    )
    const targetIndex = currentIndex + (delta > 0 ? 1 : -1)
    if (targetIndex < 0 || targetIndex >= tabsStore.tabs.length) return
    tabsStore.activateByPosition(targetIndex)
    lastWheelTabChange = now
    return
  }

  if (event.ctrlKey || event.metaKey) {
    element.scrollLeft += event.deltaY || event.deltaX
    event.preventDefault()
    return
  }

  if (Math.abs(event.deltaX) < Math.abs(event.deltaY)) {
    element.scrollLeft += event.deltaY
    event.preventDefault()
  }
}

function navigate(event: KeyboardEvent): void {
  if (!tabsStore.activeTabId) return
  let target: string | null = null
  if (event.key === "ArrowRight") {
    tabsStore.activateRelative(1)
    target = tabsStore.activeTabId
  } else if (event.key === "ArrowLeft") {
    tabsStore.activateRelative(-1)
    target = tabsStore.activeTabId
  } else if (event.key === "Home") {
    target = tabsStore.tabs[0]?.id ?? null
  } else if (event.key === "End") {
    target = tabsStore.tabs[tabsStore.tabs.length - 1]?.id ?? null
  } else return

  event.preventDefault()
  if (target) tabsStore.activateTab(target)
  void nextTick(() => document.getElementById(`tab-${target}`)?.focus())
}

watch(
  () => tabsStore.activeTabId,
  (id) => void nextTick(() => {
    if (id) document.getElementById(`tab-${id}`)?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    })
  }),
)
</script>

<template>
  <div class="tab-bar">
    <div class="tab-bar__scroll" @wheel="scrollTabs">
      <div class="tab-bar__tabs" role="tablist" aria-label="Open documents">
        <DocumentTab
          v-for="tab in tabsStore.tabs"
          :key="tab.id"
          :tab="tab"
          :active="tab.id === tabsStore.activeTabId"
          :modified="tabsStore.isModified(tab.id)"
          :dragging="tab.id === draggedTabId"
          @activate="tabsStore.activateTab(tab.id)"
          @close="emit('close', tab.id)"
          @navigate="navigate"
          @dragstart="start(tab.id, $event)"
          @dragover="over(tab.id, $event)"
          @dragend="end"
        />
      </div>
      <NewTabButton @click="emit('new')" />
    </div>
    <div class="tab-bar__actions">
      <slot name="actions" />
    </div>
  </div>
</template>
