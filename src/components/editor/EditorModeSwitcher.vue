<script setup lang="ts">
import { ref } from "vue"

import { useDocumentsStore } from "@/stores/documents"
import type { DocumentMode } from "@/types/document"

interface ModeOption {
  value: DocumentMode
  label: string
}

const modes: readonly ModeOption[] = [
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
  { value: "source", label: "Source" },
  { value: "split", label: "Split" },
]

const documentsStore = useDocumentsStore()
const modeButtons = ref<HTMLButtonElement[]>([])

function selectMode(mode: DocumentMode): void {
  documentsStore.setMode(mode)
}

function handleKeydown(event: KeyboardEvent, index: number): void {
  let nextIndex: number | null = null

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    nextIndex = (index + 1) % modes.length
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    nextIndex = (index - 1 + modes.length) % modes.length
  } else if (event.key === "Home") {
    nextIndex = 0
  } else if (event.key === "End") {
    nextIndex = modes.length - 1
  }

  if (nextIndex === null) return

  event.preventDefault()
  const mode = modes[nextIndex]
  documentsStore.setMode(mode.value)
  modeButtons.value[nextIndex]?.focus()
}
</script>

<template>
  <div class="mode-switcher" role="radiogroup" aria-label="Document mode">
    <button
      v-for="(mode, index) in modes"
      :key="mode.value"
      ref="modeButtons"
      type="button"
      role="radio"
      class="mode-switcher__button"
      :class="{ 'mode-switcher__button--active': documentsStore.activeDocument.mode === mode.value }"
      :aria-checked="documentsStore.activeDocument.mode === mode.value"
      :aria-label="`Switch to ${mode.label} mode`"
      :tabindex="documentsStore.activeDocument.mode === mode.value ? 0 : -1"
      @click="selectMode(mode.value)"
      @keydown="handleKeydown($event, index)"
    >
      {{ mode.label }}
    </button>
  </div>
</template>
