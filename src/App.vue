<script setup lang="ts">
import { ref } from "vue"

import MarkdownWorkspace from "@/components/editor/MarkdownWorkspace.vue"
import EditorToolbar from "@/components/layout/EditorToolbar.vue"

interface EditorCommands {
  undo: () => boolean
  redo: () => boolean
}

const workspace = ref<EditorCommands | null>(null)

function undo(): void {
  workspace.value?.undo()
}

function redo(): void {
  workspace.value?.redo()
}
</script>

<template>
  <div class="app-shell">
    <EditorToolbar @undo="undo" @redo="redo" />
    <MarkdownWorkspace ref="workspace" />
  </div>
</template>
