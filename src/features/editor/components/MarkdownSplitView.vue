<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue"

import { Separator } from "@/components/ui/separator"
import MarkdownSourceEditor from "@/features/editor/components/MarkdownSourceEditor.vue"
import MilkdownEditor from "@/features/editor/components/MilkdownEditor.vue"
import {
  EMPTY_EDITOR_STATE,
  type EditorCommands,
  type EditorViewportState,
  type PreviewViewportState,
} from "@/features/editor/model/editor.types"

const PREVIEW_DEBOUNCE_MS = 120
const SCROLL_THROTTLE_MS = 150

interface Props {
  modelValue: string
  sourceState: EditorViewportState
  previewState: PreviewViewportState
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
const previewValue = ref(props.modelValue)
let previewTimer: ReturnType<typeof setTimeout> | null = null
let scrollTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.modelValue,
  (next) => {
    if (previewTimer) clearTimeout(previewTimer)
    previewTimer = setTimeout(() => {
      previewTimer = null
      previewValue.value = next
    }, PREVIEW_DEBOUNCE_MS)
  },
)

function flushPreviewState(): void {
  if (scrollTimer) {
    clearTimeout(scrollTimer)
    scrollTimer = null
  }
  const element = previewScroller.value
  if (!element) return
  emit("update:previewState", {
    scrollTop: element.scrollTop,
    scrollLeft: element.scrollLeft,
  })
}

function schedulePreviewState(): void {
  if (scrollTimer) return
  scrollTimer = setTimeout(flushPreviewState, SCROLL_THROTTLE_MS)
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

onUnmounted(() => {
  if (previewTimer) {
    clearTimeout(previewTimer)
    previewTimer = null
  }
  flushPreviewState()
})

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
      @scroll.passive="schedulePreviewState"
    >
      <div class="split-view__heading">Preview</div>
      <MilkdownEditor
        :model-value="previewValue"
        :editor-state="EMPTY_EDITOR_STATE"
        readonly
      />
    </section>
  </div>
</template>
