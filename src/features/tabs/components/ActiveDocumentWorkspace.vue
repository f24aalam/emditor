<script setup lang="ts">
import { computed, watch } from "vue"

import MarkdownWorkspace from "@/components/editor/MarkdownWorkspace.vue"
import type { ActiveEditorCommands } from "@/features/commands"
import { useWorkspaceCache } from "@/features/tabs/composables/useWorkspaceCache"
import { useTabsStore } from "@/features/tabs"

const tabsStore = useTabsStore()
const emit = defineEmits<{ historyStateChange: [] }>()
const cache = useWorkspaceCache()
const workspaceRefs = new Map<string, ActiveEditorCommands>()

const cachedTabs = computed(() => {
  const cached = new Set(cache.cachedTabIds.value)
  return tabsStore.tabs.filter((tab) => cached.has(tab.id))
})

function setWorkspaceRef(tabId: string, instance: unknown): void {
  if (!instance) {
    workspaceRefs.delete(tabId)
    return
  }
  const commands = instance as ActiveEditorCommands
  if (
    typeof commands.undo === "function"
    && typeof commands.redo === "function"
    && typeof commands.canUndo === "function"
    && typeof commands.canRedo === "function"
  ) {
    // Function refs may run again during a parent update. History notifications
    // must come from the editor, or emitting here creates a render loop.
    workspaceRefs.set(tabId, commands)
  }
}

function activeWorkspace(): ActiveEditorCommands | null {
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
  },
  { immediate: true },
)

watch(
  () => tabsStore.tabs.map((tab) => tab.id),
  (validTabIds) => {
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
        :tab-id="tab.id"
        @history-state-change="emit('historyStateChange')"
      />
    </section>
  </div>
</template>
