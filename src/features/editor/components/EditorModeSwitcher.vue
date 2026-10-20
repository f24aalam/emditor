<script setup lang="ts">
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import type { WorkspaceMode } from "@/features/editor/model/editor.types"

interface Props {
  activeMode: WorkspaceMode | null
}

interface ModeOption {
  value: WorkspaceMode
  label: string
}

const props = defineProps<Props>()

const modes: readonly ModeOption[] = [
  { value: "editor", label: "Editor" },
  { value: "source", label: "Source" },
  { value: "split", label: "Split" },
]

const emit = defineEmits<{ select: [mode: WorkspaceMode] }>()

function isWorkspaceMode(value: unknown): value is WorkspaceMode {
  return typeof value === "string"
    && modes.some((mode) => mode.value === value)
}

function selectMode(value: unknown): void {
  // A controlled group must never deselect the active document mode.
  if (isWorkspaceMode(value) && props.activeMode !== null) emit("select", value)
}
</script>

<template>
  <ToggleGroup
    type="single"
    orientation="horizontal"
    variant="outline"
    size="sm"
    :model-value="activeMode ?? undefined"
    :disabled="activeMode === null"
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
