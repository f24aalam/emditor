<script setup lang="ts">
import { ref } from "vue"

import MarkdownSourceEditor from "@/features/editor/components/MarkdownSourceEditor.vue"
import MarkdownSplitView from "@/features/editor/components/MarkdownSplitView.vue"
import MilkdownEditor from "@/features/editor/components/MilkdownEditor.vue"
import type {
  DocumentEditorState,
  EditorCommands,
  WorkspaceMode,
} from "@/features/editor/model/editor.types"

interface Props {
  mode: WorkspaceMode
  modelValue: string
  editorState: DocumentEditorState
}

const props = defineProps<Props>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
  "update:editorState": [
    area: keyof DocumentEditorState,
    state: DocumentEditorState[keyof DocumentEditorState],
  ]
  "historyStateChange": []
}>()

const milkdownEditor = ref<EditorCommands | null>(null)
const sourceEditor = ref<EditorCommands | null>(null)
const splitView = ref<EditorCommands | null>(null)

function activeTarget(): EditorCommands | null {
  switch (props.mode) {
    case "editor":
      return milkdownEditor.value
    case "source":
      return sourceEditor.value
    case "split":
      return splitView.value
  }
}

function undo(): boolean {
  return activeTarget()?.undo() ?? false
}

function redo(): boolean {
  return activeTarget()?.redo() ?? false
}

function canUndo(): boolean {
  return activeTarget()?.canUndo() ?? false
}

function canRedo(): boolean {
  return activeTarget()?.canRedo() ?? false
}

defineExpose({ undo, redo, canUndo, canRedo })
</script>

<template>
  <main class="markdown-workspace">
    <div
      v-if="mode === 'editor'"
      class="workspace-mode workspace-mode--prose"
    >
      <MilkdownEditor
        ref="milkdownEditor"
        :model-value="modelValue"
        :editor-state="editorState.editor"
        @update:model-value="emit('update:modelValue', $event)"
        @update:editor-state="emit('update:editorState', 'editor', $event)"
        @history-state-change="emit('historyStateChange')"
      />
    </div>

    <div
      v-else-if="mode === 'source'"
      class="workspace-mode workspace-mode--source"
    >
      <MarkdownSourceEditor
        ref="sourceEditor"
        :model-value="modelValue"
        :editor-state="editorState.source"
        @update:model-value="emit('update:modelValue', $event)"
        @update:editor-state="emit('update:editorState', 'source', $event)"
        @history-state-change="emit('historyStateChange')"
      />
    </div>

    <MarkdownSplitView
      v-else
      ref="splitView"
      :model-value="modelValue"
      :source-state="editorState.source"
      :preview-state="editorState.preview"
      class="workspace-mode workspace-mode--split"
      @update:model-value="emit('update:modelValue', $event)"
      @update:source-state="emit('update:editorState', 'source', $event)"
      @update:preview-state="emit('update:editorState', 'preview', $event)"
      @history-state-change="emit('historyStateChange')"
    />
  </main>
</template>
