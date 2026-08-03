<script setup lang="ts">
import { computed, ref } from "vue"

import MarkdownSourceEditor from "@/components/editor/MarkdownSourceEditor.vue"
import MarkdownSplitView from "@/components/editor/MarkdownSplitView.vue"
import MilkdownEditor from "@/components/editor/MilkdownEditor.vue"
import { useTabsStore } from "@/features/tabs"

interface EditorCommands {
  undo: () => boolean
  redo: () => boolean
  canUndo: () => boolean
  canRedo: () => boolean
}

interface Props {
  tabId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ historyStateChange: [] }>()
const tabsStore = useTabsStore()
const milkdownEditor = ref<EditorCommands | null>(null)
const sourceEditor = ref<EditorCommands | null>(null)
const splitView = ref<EditorCommands | null>(null)
const tab = computed(
  () => tabsStore.tabs.find((candidate) => candidate.id === props.tabId) ?? null,
)

const markdown = computed({
  get: () => tab.value?.content ?? "",
  set: (value: string) => tabsStore.updateContent(props.tabId, value),
})

function undo(): boolean {
  switch (tab.value?.mode) {
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
  switch (tab.value?.mode) {
    case "editor":
      return milkdownEditor.value?.redo() ?? false
    case "source":
      return sourceEditor.value?.redo() ?? false
    case "split":
      return splitView.value?.redo() ?? false
  }
  return false
}

function canUndo(): boolean {
  switch (tab.value?.mode) {
    case "editor":
      return milkdownEditor.value?.canUndo() ?? false
    case "source":
      return sourceEditor.value?.canUndo() ?? false
    case "split":
      return splitView.value?.canUndo() ?? false
  }
  return false
}

function canRedo(): boolean {
  switch (tab.value?.mode) {
    case "editor":
      return milkdownEditor.value?.canRedo() ?? false
    case "source":
      return sourceEditor.value?.canRedo() ?? false
    case "split":
      return splitView.value?.canRedo() ?? false
  }
  return false
}

defineExpose({ undo, redo, canUndo, canRedo })
</script>

<template>
  <main v-if="tab" class="markdown-workspace">
    <div
      v-if="tab.mode === 'editor'"
      class="workspace-mode workspace-mode--prose"
    >
      <MilkdownEditor
        ref="milkdownEditor"
        v-model="markdown"
        :editor-state="tab.editorState.editor"
        @update:editor-state="tabsStore.updateEditorState(tabId, 'editor', $event)"
        @history-state-change="emit('historyStateChange')"
      />
    </div>

    <div
      v-else-if="tab.mode === 'source'"
      class="workspace-mode workspace-mode--source"
    >
      <MarkdownSourceEditor
        ref="sourceEditor"
        v-model="markdown"
        :editor-state="tab.editorState.source"
        @update:editor-state="tabsStore.updateEditorState(tabId, 'source', $event)"
        @history-state-change="emit('historyStateChange')"
      />
    </div>

    <MarkdownSplitView
      v-else
      ref="splitView"
      v-model="markdown"
      :source-state="tab.editorState.source"
      :preview-state="tab.editorState.preview"
      class="workspace-mode workspace-mode--split"
      @update:source-state="tabsStore.updateEditorState(tabId, 'source', $event)"
      @update:preview-state="tabsStore.updateEditorState(tabId, 'preview', $event)"
      @history-state-change="emit('historyStateChange')"
    />
  </main>
</template>
