<script setup lang="ts">
import { computed, watch } from "vue"

import { MarkdownWorkspace, type EditorCommands } from "@/features/editor"
import { useWorkspaceCache } from "@/features/tabs/composables/useWorkspaceCache"
import type { DocumentTab } from "@/features/tabs/model/tab.types"
import { useTabsStore } from "@/features/tabs/stores/tabs.store"

const tabsStore = useTabsStore()
const emit = defineEmits<{ historyStateChange: [] }>()
const cache = useWorkspaceCache()
const workspaceRefs = new Map<string, EditorCommands>()

const cachedTabs = computed(() => {
  const byId = new Map(tabsStore.tabs.map((tab) => [tab.id, tab]))
  return cache.cachedTabIds.value
    .map((id) => byId.get(id))
    .filter((tab): tab is DocumentTab => tab !== undefined)
})

function setWorkspaceRef(tabId: string, instance: unknown): void {
  if (!instance) {
    workspaceRefs.delete(tabId)
    return
  }
  const commands = instance as EditorCommands
  if (
    typeof commands.undo === "function"
    && typeof commands.redo === "function"
    && typeof commands.canUndo === "function"
    && typeof commands.canRedo === "function"
  ) {
    const previous = workspaceRefs.get(tabId)
    workspaceRefs.set(tabId, commands)
    if (previous !== commands && tabId === tabsStore.activeTabId) {
      emit("historyStateChange")
    }
  }
}

function activeWorkspace(): EditorCommands | null {
  const tabId = tabsStore.activeTabId
  return tabId ? workspaceRefs.get(tabId) ?? null : null
}

function undo(): boolean {
  return activeWorkspace()?.undo() ?? false
}

function redo(): boolean {
  return activeWorkspace()?.redo() ?? false
}

function canUndo(): boolean {
  return activeWorkspace()?.canUndo() ?? false
}

function canRedo(): boolean {
  return activeWorkspace()?.canRedo() ?? false
}

watch(
  () => tabsStore.activeTabId,
  (tabId) => {
    if (tabId) cache.touch(tabId)
    emit("historyStateChange")
  },
  { immediate: true },
)

const tabIdsSignature = computed(() =>
  tabsStore.tabs.map((tab) => tab.id).join("\u0000"),
)

watch(
  tabIdsSignature,
  () => {
    const validTabIds = tabsStore.tabs.map((tab) => tab.id)
    cache.prune(validTabIds)
    const valid = new Set(validTabIds)
    for (const tabId of workspaceRefs.keys()) {
      if (!valid.has(tabId)) workspaceRefs.delete(tabId)
    }
  },
)

defineExpose({ undo, redo, canUndo, canRedo })
</script>

<template>
  <div class="workspace-cache">
    <section
      v-for="tab in cachedTabs"
      v-show="tab.id === tabsStore.activeTabId"
      :id="`panel-${tab.id}`"
      :key="tab.id"
      role="tabpanel"
      :aria-labelledby="`tab-${tab.id}`"
      :aria-hidden="tab.id !== tabsStore.activeTabId"
      :inert="tab.id !== tabsStore.activeTabId"
      class="active-document-workspace"
    >
      <MarkdownWorkspace
        :ref="(instance) => setWorkspaceRef(tab.id, instance)"
        :mode="tab.mode"
        :model-value="tab.content"
        :editor-state="tab.editorState"
        @update:model-value="tabsStore.updateContent(tab.id, $event)"
        @update:editor-state="(area, state) => tabsStore.updateEditorState(tab.id, area, state)"
        @history-state-change="emit('historyStateChange')"
      />
    </section>
  </div>
</template>
