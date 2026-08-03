<script setup lang="ts">
import { ref } from "vue"

import MarkdownSourceEditor from "@/components/editor/MarkdownSourceEditor.vue"
import MilkdownEditor from "@/components/editor/MilkdownEditor.vue"

interface Props {
  modelValue: string
}

interface EditorCommands {
  undo: () => boolean
  redo: () => boolean
}

defineProps<Props>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
}>()

const sourceEditor = ref<EditorCommands | null>(null)

function undo(): boolean {
  return sourceEditor.value?.undo() ?? false
}

function redo(): boolean {
  return sourceEditor.value?.redo() ?? false
}

defineExpose({ undo, redo })
</script>

<template>
  <div class="split-view">
    <section class="split-view__panel split-view__source" aria-label="Markdown source">
      <div class="split-view__heading">Source</div>
      <MarkdownSourceEditor
        ref="sourceEditor"
        :model-value="modelValue"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </section>

    <section class="split-view__panel split-view__preview" aria-label="Rendered preview">
      <div class="split-view__heading">Preview</div>
      <MilkdownEditor :model-value="modelValue" readonly />
    </section>
  </div>
</template>
