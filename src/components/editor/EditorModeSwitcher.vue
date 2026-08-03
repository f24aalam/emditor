<script setup lang="ts">
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
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

function isDocumentMode(value: unknown): value is DocumentMode {
  return typeof value === "string"
    && modes.some((mode) => mode.value === value)
}

function selectMode(value: unknown): void {
  // A controlled group must never deselect the active document mode.
  if (isDocumentMode(value)) documentsStore.setMode(value)
}
</script>

<template>
  <ToggleGroup
    type="single"
    orientation="horizontal"
    variant="outline"
    size="sm"
    :model-value="documentsStore.activeDocument.mode"
    aria-label="Document mode"
    class="bg-muted/50 p-0.5"
    @update:model-value="selectMode"
  >
    <ToggleGroupItem
      v-for="mode in modes"
      :key="mode.value"
      :value="mode.value"
      :aria-label="`Switch to ${mode.label} mode`"
      class="border-0 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
    >
      {{ mode.label }}
    </ToggleGroupItem>
  </ToggleGroup>
</template>
