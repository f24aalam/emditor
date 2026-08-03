<script setup lang="ts">
import { computed, nextTick, onUnmounted, watch } from "vue"

import DocumentTab from "@/features/tabs/components/DocumentTab.vue"
import NewTabButton from "@/features/tabs/components/NewTabButton.vue"
import { useDeferredTabActivation } from "@/features/tabs/composables/useDeferredTabActivation"
import { useTabDrag } from "@/features/tabs/composables/useTabDrag"
import { useTabsStore } from "@/features/tabs"

const emit = defineEmits<{ close: [tabId: string]; new: [] }>()
const tabsStore = useTabsStore()
const { draggedTabId, start, over, end } = useTabDrag()
const deferredActivation = useDeferredTabActivation({
  getTabIds: () => tabsStore.tabs.map((tab) => tab.id),
  getActiveTabId: () => tabsStore.activeTabId,
  activate: tabsStore.activateTab,
})
const visibleTabId = computed(
  () => deferredActivation.pendingTabId.value ?? tabsStore.activeTabId,
)

function activateTab(tabId: string): void {
  deferredActivation.activateImmediately(tabId)
}

function requestClose(tabId: string): void {
  deferredActivation.cancel()
  emit("close", tabId)
}

function createTab(): void {
  deferredActivation.cancel()
  emit("new")
}

function startDragging(tabId: string, event: DragEvent): void {
  deferredActivation.cancel()
  start(tabId, event)
}

function scrollTabs(event: WheelEvent): void {
  const element = event.currentTarget
  if (!(element instanceof HTMLElement)) return

  if (event.shiftKey && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      ? event.deltaY
      : event.deltaX
    if (delta === 0) return
    deferredActivation.step(delta > 0 ? 1 : -1)
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
  deferredActivation.cancel()
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
  visibleTabId,
  (id) => void nextTick(() => {
    if (id) document.getElementById(`tab-${id}`)?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    })
  }),
)

watch(
  () => tabsStore.activeTabId,
  () => {
    if (deferredActivation.pendingTabId.value) deferredActivation.cancel()
  },
)

watch(
  () => tabsStore.tabs.map((tab) => tab.id).join("\u0000"),
  () => deferredActivation.cancel(),
)

onUnmounted(deferredActivation.dispose)
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
          :previewed="tab.id === deferredActivation.pendingTabId.value"
          @activate="activateTab(tab.id)"
          @close="requestClose(tab.id)"
          @navigate="navigate"
          @dragstart="startDragging(tab.id, $event)"
          @dragover="over(tab.id, $event)"
          @dragend="end"
        />
      </div>
      <NewTabButton @click="createTab" />
    </div>
    <div class="tab-bar__actions">
      <slot name="actions" />
    </div>
  </div>
</template>
