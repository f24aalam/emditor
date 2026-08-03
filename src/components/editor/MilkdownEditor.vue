<script setup lang="ts">
import { ref, watch } from "vue"
import { CircleAlert } from "@lucide/vue"

import "@milkdown/crepe/theme/common/style.css"
import "@milkdown/crepe/theme/frame.css"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { useMilkdownEditor } from "@/composables/useMilkdownEditor"
import type { EditorViewportState } from "@/features/tabs"

interface Props {
  modelValue: string
  readonly?: boolean
  editorState: EditorViewportState
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
})

const emit = defineEmits<{
  "update:modelValue": [value: string]
  "update:editorState": [value: EditorViewportState]
}>()

const editorRoot = ref<HTMLElement | null>(null)

const {
  error,
  isReady,
  setMarkdown,
  setReadonly,
  undo,
  redo,
} = useMilkdownEditor({
  root: editorRoot,
  getMarkdown: () => props.modelValue,
  getReadonly: () => props.readonly,
  onMarkdownChange: (markdown) => emit("update:modelValue", markdown),
  getEditorState: () => props.editorState,
  onEditorStateChange: (state) => emit("update:editorState", state),
})

watch(() => props.modelValue, setMarkdown)
watch(() => props.readonly, setReadonly)

defineExpose({ undo, redo })
</script>

<template>
  <div
    class="milkdown-editor"
    :class="{ 'milkdown-editor--readonly': readonly }"
    :aria-busy="!isReady && !error"
  >
    <Alert
      v-if="error"
      variant="destructive"
      class="editor-error"
    >
      <CircleAlert />
      <AlertTitle>Unable to open the Markdown editor</AlertTitle>
      <AlertDescription>{{ error }}</AlertDescription>
    </Alert>

    <div
      ref="editorRoot"
      class="milkdown-editor__root"
      :class="{ 'milkdown-editor__root--loading': !isReady || error }"
    />

    <div
      v-if="!isReady && !error"
      class="editor-loading"
      role="status"
    >
      Loading editor…
    </div>
  </div>
</template>
