<script setup lang="ts">
import { computed } from "vue"
import { FilePenLine, Plus, Redo2, Save, Undo2 } from "@lucide/vue"

import EditorModeSwitcher from "@/components/editor/EditorModeSwitcher.vue"
import { Button } from "@/components/ui/button"
import { useDocumentsStore } from "@/stores/documents"

const emit = defineEmits<{
  undo: []
  redo: []
}>()

const documentsStore = useDocumentsStore()

const supportsHistory = computed(
  () => documentsStore.activeDocument.mode !== "viewer",
)

function createDocument(): void {
  if (
    documentsStore.isDirty
    && !window.confirm("Discard unsaved changes and create a new document?")
  ) {
    return
  }

  documentsStore.createDocument()
}
</script>

<template>
  <header class="editor-toolbar">
    <div class="editor-toolbar__document">
      <div class="editor-toolbar__logo" aria-hidden="true">
        <FilePenLine class="size-4" />
      </div>
      <div class="editor-toolbar__title">
        <span class="editor-toolbar__app-name">Emditor</span>
        <span class="editor-toolbar__document-name">
          {{ documentsStore.activeDocument.name }}
        </span>
      </div>
      <span
        v-if="documentsStore.isDirty"
        class="editor-toolbar__dirty-dot"
        title="Unsaved changes"
      >
        <span class="sr-only">Unsaved changes</span>
      </span>
    </div>

    <EditorModeSwitcher class="editor-toolbar__modes" />

    <div class="editor-toolbar__actions">
      <Button
        variant="ghost"
        size="icon"
        :disabled="!supportsHistory"
        aria-label="Undo"
        title="Undo"
        @click="emit('undo')"
      >
        <Undo2 class="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        :disabled="!supportsHistory"
        aria-label="Redo"
        title="Redo"
        @click="emit('redo')"
      >
        <Redo2 class="size-4" />
      </Button>
      <div class="editor-toolbar__separator" aria-hidden="true" />
      <Button
        variant="ghost"
        size="sm"
        class="gap-1.5"
        aria-label="New document"
        @click="createDocument"
      >
        <Plus class="size-4" />
        <span class="editor-toolbar__action-label">New</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        class="gap-1.5"
        :disabled="!documentsStore.isDirty"
        aria-label="Save document"
        @click="documentsStore.markSaved"
      >
        <Save class="size-4" />
        <span class="editor-toolbar__action-label">
          {{ documentsStore.isDirty ? "Save" : "Saved" }}
        </span>
      </Button>
    </div>
  </header>
</template>
