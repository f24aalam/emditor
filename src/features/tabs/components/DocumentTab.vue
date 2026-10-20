<script setup lang="ts">
import { X } from "@lucide/vue"

interface Props {
  id: string
  title: string
  filePath: string | null
  active: boolean
  modified: boolean
  dragging: boolean
  previewed: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  activate: []
  close: []
  navigate: [event: KeyboardEvent]
  dragstart: [event: DragEvent]
  dragover: [event: DragEvent]
  dragend: []
}>()

function middleClick(event: MouseEvent): void {
  if (event.button === 1) {
    event.preventDefault()
    emit("close")
  }
}
</script>

<template>
  <div
    class="document-tab"
    :class="{
      'document-tab--active': active,
      'document-tab--dragging': dragging,
      'document-tab--previewed': previewed,
    }"
    draggable="true"
    @auxclick="middleClick"
    @dragstart="emit('dragstart', $event)"
    @dragover="emit('dragover', $event)"
    @dragend="emit('dragend')"
  >
    <button
      :id="`tab-${id}`"
      type="button"
      role="tab"
      class="document-tab__target"
      :aria-selected="active"
      :aria-controls="`panel-${id}`"
      :aria-label="`${title}${modified ? ', unsaved changes' : ''}`"
      :tabindex="active ? 0 : -1"
      :title="filePath ?? title"
      @click="emit('activate')"
      @keydown="emit('navigate', $event)"
    >
      <span v-if="modified" class="document-tab__dirty" aria-hidden="true" />
      <span class="document-tab__title">{{ title }}</span>
    </button>
    <button
      type="button"
      class="document-tab__close"
      :aria-label="`Close ${title}`"
      @click.stop="$emit('close')"
    >
      <X class="size-3.5" />
    </button>
  </div>
</template>
