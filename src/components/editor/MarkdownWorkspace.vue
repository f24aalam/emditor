<script setup lang="ts">
import { computed, ref } from "vue"

import MarkdownSourceEditor from "@/components/editor/MarkdownSourceEditor.vue"
import MarkdownSplitView from "@/components/editor/MarkdownSplitView.vue"
import MilkdownEditor from "@/components/editor/MilkdownEditor.vue"
import { useTabsStore } from "@/features/tabs"

interface EditorCommands {
  undo: () => boolean
  redo: () => boolean
}

const tabsStore = useTabsStore()
const milkdownEditor = ref<EditorCommands | null>(null)
const sourceEditor = ref<EditorCommands | null>(null)
const splitView = ref<EditorCommands | null>(null)

const markdown = computed({
  get: () => tabsStore.activeTab?.content ?? "",
  set: (value: string) => {
    if (tabsStore.activeTabId) tabsStore.updateContent(tabsStore.activeTabId, value)
  },
})

function undo(): boolean {
  switch (tabsStore.activeTab?.mode) {
    case "editor":
      return milkdownEditor.value?.undo() ?? false
    case "source":
      return sourceEditor.value?.undo() ?? false
    case "split":
      return splitView.value?.undo() ?? false
  }
  return false
}

function redo(): boolean {
  switch (tabsStore.activeTab?.mode) {
    case "editor":
      return milkdownEditor.value?.redo() ?? false
    case "source":
      return sourceEditor.value?.redo() ?? false
    case "split":
      return splitView.value?.redo() ?? false
  }
  return false
}

defineExpose({ undo, redo })
</script>

<template>
  <main class="markdown-workspace">
    <div
      v-if="tabsStore.activeTab?.mode === 'editor'"
      class="workspace-mode workspace-mode--prose"
    >
      <MilkdownEditor
        v-if="tabsStore.activeTab"
        ref="milkdownEditor"
        v-model="markdown"
        :editor-state="tabsStore.activeTab.editorState.editor"
        @update:editor-state="tabsStore.updateEditorState(tabsStore.activeTab!.id, 'editor', $event)"
      />
    </div>

    <div
      v-else-if="tabsStore.activeTab?.mode === 'source'"
      class="workspace-mode workspace-mode--source"
    >
      <MarkdownSourceEditor
        v-if="tabsStore.activeTab"
        ref="sourceEditor"
        v-model="markdown"
        :editor-state="tabsStore.activeTab.editorState.source"
        @update:editor-state="tabsStore.updateEditorState(tabsStore.activeTab!.id, 'source', $event)"
      />
    </div>

    <MarkdownSplitView
      v-else-if="tabsStore.activeTab"
      ref="splitView"
      v-model="markdown"
      :source-state="tabsStore.activeTab.editorState.source"
      :preview-state="tabsStore.activeTab.editorState.preview"
      class="workspace-mode workspace-mode--split"
      @update:source-state="tabsStore.updateEditorState(tabsStore.activeTab!.id, 'source', $event)"
      @update:preview-state="tabsStore.updateEditorState(tabsStore.activeTab!.id, 'preview', $event)"
    />
  </main>
</template>
