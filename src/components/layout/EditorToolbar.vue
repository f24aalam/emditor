<script setup lang="ts">
import { ref } from "vue"
import { FilePenLine, Plus, Redo2, Save, Undo2 } from "@lucide/vue"

import EditorModeSwitcher from "@/components/editor/EditorModeSwitcher.vue"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useDocumentsStore } from "@/stores/documents"

const emit = defineEmits<{
  undo: []
  redo: []
}>()

const documentsStore = useDocumentsStore()
const discardDialogOpen = ref(false)

function requestNewDocument(): void {
  if (documentsStore.isDirty) {
    discardDialogOpen.value = true
    return
  }

  documentsStore.createDocument()
}

function discardAndCreateDocument(): void {
  documentsStore.createDocument()
  discardDialogOpen.value = false
}
</script>

<template>
  <TooltipProvider :delay-duration="250">
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
        <Badge
          :variant="documentsStore.isDirty ? 'destructive' : 'secondary'"
          class="editor-toolbar__status"
        >
          {{ documentsStore.isDirty ? "Unsaved" : "Saved" }}
        </Badge>
      </div>

      <EditorModeSwitcher class="editor-toolbar__modes" />

      <div class="editor-toolbar__actions">
        <ButtonGroup aria-label="Edit history">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="outline"
                size="icon"
                aria-label="Undo"
                @click="emit('undo')"
              >
                <Undo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="outline"
                size="icon"
                aria-label="Redo"
                @click="emit('redo')"
              >
                <Redo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
        </ButtonGroup>

        <Separator orientation="vertical" class="mx-1 h-5" />

        <ButtonGroup aria-label="Document actions">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="outline"
                size="sm"
                aria-label="New document"
                @click="requestNewDocument"
              >
                <Plus />
                <span class="editor-toolbar__action-label">New</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>New document</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="outline"
                size="sm"
                :disabled="!documentsStore.isDirty"
                aria-label="Save document"
                @click="documentsStore.markSaved"
              >
                <Save />
                <span class="editor-toolbar__action-label">
                  {{ documentsStore.isDirty ? "Save" : "Saved" }}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mark the document as saved</TooltipContent>
          </Tooltip>
        </ButtonGroup>
      </div>
    </header>

    <AlertDialog v-model:open="discardDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Creating a new document will permanently discard the changes in
            {{ documentsStore.activeDocument.name }}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            @click="discardAndCreateDocument"
          >
            Discard and create new
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </TooltipProvider>
</template>
