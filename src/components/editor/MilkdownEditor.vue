<script setup lang="ts">
import { ref, watch } from "vue"

import "@milkdown/crepe/theme/common/style.css"
import "@milkdown/crepe/theme/frame.css"

import { useMilkdownEditor } from "@/composables/useMilkdownEditor"

interface Props {
  modelValue: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
})

const emit = defineEmits<{
  "update:modelValue": [value: string]
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
    <div
      v-if="error"
      class="editor-error"
      role="alert"
    >
      <strong>Unable to open the Markdown editor.</strong>
      <span>{{ error }}</span>
    </div>

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
