<script setup lang="ts">
import { computed, ref } from "vue"

import MarkdownSourceEditor from "@/components/editor/MarkdownSourceEditor.vue"
import MarkdownSplitView from "@/components/editor/MarkdownSplitView.vue"
import MilkdownEditor from "@/components/editor/MilkdownEditor.vue"
import { useDocumentsStore } from "@/stores/documents"

interface EditorCommands {
  undo: () => boolean
  redo: () => boolean
}

const documentsStore = useDocumentsStore()
const milkdownEditor = ref<EditorCommands | null>(null)
const sourceEditor = ref<EditorCommands | null>(null)
const splitView = ref<EditorCommands | null>(null)

const markdown = computed({
  get: () => documentsStore.activeDocument.markdown,
  set: (value: string) => documentsStore.updateMarkdown(value),
})

function undo(): boolean {
  switch (documentsStore.activeDocument.mode) {
    case "editor":
      return milkdownEditor.value?.undo() ?? false
    case "source":
      return sourceEditor.value?.undo() ?? false
    case "split":
      return splitView.value?.undo() ?? false
    case "viewer":
      return false
  }
}

function redo(): boolean {
  switch (documentsStore.activeDocument.mode) {
    case "editor":
      return milkdownEditor.value?.redo() ?? false
    case "source":
      return sourceEditor.value?.redo() ?? false
    case "split":
      return splitView.value?.redo() ?? false
    case "viewer":
      return false
  }
}

defineExpose({ undo, redo })
</script>

<template>
  <main class="markdown-workspace">
    <div
      v-if="documentsStore.activeDocument.mode === 'editor'"
      class="workspace-mode workspace-mode--prose"
    >
      <MilkdownEditor ref="milkdownEditor" v-model="markdown" />
    </div>

    <div
      v-else-if="documentsStore.activeDocument.mode === 'viewer'"
      class="workspace-mode workspace-mode--prose"
    >
      <MilkdownEditor v-model="markdown" readonly />
    </div>

    <div
      v-else-if="documentsStore.activeDocument.mode === 'source'"
      class="workspace-mode workspace-mode--source"
    >
      <MarkdownSourceEditor ref="sourceEditor" v-model="markdown" />
    </div>

    <MarkdownSplitView
      v-else
      ref="splitView"
      v-model="markdown"
      class="workspace-mode workspace-mode--split"
    />
  </main>
</template>
