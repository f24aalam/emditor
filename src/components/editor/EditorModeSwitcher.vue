<script setup lang="ts">
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { useTabsStore, type WorkspaceMode } from "@/features/tabs"

interface ModeOption {
  value: WorkspaceMode
  label: string
}

const modes: readonly ModeOption[] = [
  { value: "editor", label: "Editor" },
  { value: "source", label: "Source" },
  { value: "split", label: "Split" },
]

const emit = defineEmits<{ select: [mode: WorkspaceMode] }>()
const tabsStore = useTabsStore()

function isDocumentMode(value: unknown): value is WorkspaceMode {
  return typeof value === "string"
    && modes.some((mode) => mode.value === value)
}

function selectMode(value: unknown): void {
  // A controlled group must never deselect the active document mode.
  if (isDocumentMode(value) && tabsStore.activeTabId) emit("select", value)
}
</script>

<template>
  <ToggleGroup
    type="single"
    orientation="horizontal"
    variant="outline"
    size="sm"
    :model-value="tabsStore.activeTab?.mode"
    :disabled="!tabsStore.activeTab"
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
