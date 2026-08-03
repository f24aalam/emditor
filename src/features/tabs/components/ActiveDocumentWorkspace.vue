<script setup lang="ts">
import { ref } from "vue"
import MarkdownWorkspace from "@/components/editor/MarkdownWorkspace.vue"
import { useTabsStore } from "@/features/tabs"

const tabsStore = useTabsStore()
const workspace = ref<{ undo: () => boolean; redo: () => boolean } | null>(null)

function undo(): boolean {
  return workspace.value?.undo() ?? false
}

function redo(): boolean {
  return workspace.value?.redo() ?? false
}

defineExpose({ undo, redo })
</script>

<template>
  <section
    v-if="tabsStore.activeTab"
    :id="`panel-${tabsStore.activeTab.id}`"
    :key="tabsStore.activeTab.id"
    role="tabpanel"
    :aria-labelledby="`tab-${tabsStore.activeTab.id}`"
    class="active-document-workspace"
  >
    <MarkdownWorkspace ref="workspace" />
  </section>
</template>
