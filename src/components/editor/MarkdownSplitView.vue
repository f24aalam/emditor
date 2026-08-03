<script setup lang="ts">
import { onMounted, ref } from "vue"

import MarkdownSourceEditor from "@/components/editor/MarkdownSourceEditor.vue"
import MilkdownEditor from "@/components/editor/MilkdownEditor.vue"
import { Separator } from "@/components/ui/separator"
import type {
  EditorViewportState,
  PreviewViewportState,
} from "@/features/tabs"

interface Props {
  modelValue: string
  sourceState: EditorViewportState
  previewState: PreviewViewportState
}

interface EditorCommands {
  undo: () => boolean
  redo: () => boolean
  canUndo: () => boolean
  canRedo: () => boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
  "update:sourceState": [value: EditorViewportState]
  "update:previewState": [value: PreviewViewportState]
  "historyStateChange": []
}>()

const sourceEditor = ref<EditorCommands | null>(null)
const previewScroller = ref<HTMLElement | null>(null)

function persistPreviewState(): void {
  const element = previewScroller.value
  if (!element) return
  emit("update:previewState", {
    scrollTop: element.scrollTop,
    scrollLeft: element.scrollLeft,
  })
}

function restorePreviewState(): void {
  const element = previewScroller.value
  if (!element) return
  requestAnimationFrame(() => {
    element.scrollTop = props.previewState.scrollTop
    element.scrollLeft = props.previewState.scrollLeft
  })
}

onMounted(restorePreviewState)

function undo(): boolean {
  return sourceEditor.value?.undo() ?? false
}

function redo(): boolean {
  return sourceEditor.value?.redo() ?? false
}

function canUndo(): boolean {
  return sourceEditor.value?.canUndo() ?? false
}

function canRedo(): boolean {
  return sourceEditor.value?.canRedo() ?? false
}

defineExpose({ undo, redo, canUndo, canRedo })
</script>

<template>
  <div class="split-view">
    <section class="split-view__panel split-view__source" aria-label="Markdown source">
      <div class="split-view__heading">Source</div>
      <MarkdownSourceEditor
        ref="sourceEditor"
        :model-value="modelValue"
        :editor-state="sourceState"
        @update:model-value="emit('update:modelValue', $event)"
        @update:editor-state="emit('update:sourceState', $event)"
        @history-state-change="emit('historyStateChange')"
      />
    </section>

    <Separator
      orientation="vertical"
      class="split-view__divider split-view__divider--vertical"
    />
    <Separator
      orientation="horizontal"
      class="split-view__divider split-view__divider--horizontal"
    />

    <section
      ref="previewScroller"
      class="split-view__panel split-view__preview"
      aria-label="Rendered preview"
      @scroll.passive="persistPreviewState"
    >
      <div class="split-view__heading">Preview</div>
      <MilkdownEditor
        :model-value="modelValue"
        :editor-state="{
          selection: { anchor: 0, head: 0 },
          scrollTop: 0,
          scrollLeft: 0,
        }"
        readonly
      />
    </section>
  </div>
</template>
