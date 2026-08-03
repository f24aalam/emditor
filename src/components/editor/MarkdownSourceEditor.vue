<script setup lang="ts">
import { ref, watch } from "vue"

import { useCodeMirrorEditor } from "@/composables/useCodeMirrorEditor"
import type { EditorViewportState } from "@/features/tabs"

interface Props {
  modelValue: string
  editorState: EditorViewportState
}

const props = defineProps<Props>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
  "update:editorState": [value: EditorViewportState]
  "historyStateChange": []
}>()

const editorRoot = ref<HTMLElement | null>(null)

const { setValue, undo, redo, canUndo, canRedo } = useCodeMirrorEditor({
  root: editorRoot,
  getValue: () => props.modelValue,
  onChange: (value) => emit("update:modelValue", value),
  getEditorState: () => props.editorState,
  onEditorStateChange: (state) => emit("update:editorState", state),
  onHistoryStateChange: () => emit("historyStateChange"),
})

watch(() => props.modelValue, setValue)

defineExpose({ undo, redo, canUndo, canRedo })
</script>

<template>
  <div class="source-editor" aria-label="Markdown source editor">
    <div ref="editorRoot" class="source-editor__root" />
  </div>
</template>
