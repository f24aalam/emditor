<script setup lang="ts">
import { ref, watch } from "vue"

import { useCodeMirrorEditor } from "@/composables/useCodeMirrorEditor"

interface Props {
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
}>()

const editorRoot = ref<HTMLElement | null>(null)

const { setValue, undo, redo } = useCodeMirrorEditor({
  root: editorRoot,
  getValue: () => props.modelValue,
  onChange: (value) => emit("update:modelValue", value),
})

watch(() => props.modelValue, setValue)

defineExpose({ undo, redo })
</script>

<template>
  <div class="source-editor" aria-label="Markdown source editor">
    <div ref="editorRoot" class="source-editor__root" />
  </div>
</template>
