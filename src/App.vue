<script setup lang="ts">
import { onMounted, ref } from "vue"
import { CircleAlert, X } from "@lucide/vue"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import EditorToolbar from "@/components/layout/EditorToolbar.vue"
import EditorModeSwitcher from "@/components/editor/EditorModeSwitcher.vue"
import { createFileCommands, useFilesStore } from "@/features/files"
import { createSessionController } from "@/features/session"
import ActiveDocumentWorkspace from "@/features/tabs/components/ActiveDocumentWorkspace.vue"
import EmptyWorkspace from "@/features/tabs/components/EmptyWorkspace.vue"
import TabBar from "@/features/tabs/components/TabBar.vue"
import UnsavedChangesDialog from "@/features/tabs/components/UnsavedChangesDialog.vue"
import { useKeyboardShortcuts } from "@/features/tabs/composables/useKeyboardShortcuts"
import { useUnsavedChangesGuard } from "@/features/tabs/composables/useUnsavedChangesGuard"
import { useTabsStore } from "@/features/tabs"
import { TauriFileDialogRepository } from "@/infrastructure/tauri/tauri-dialog.repository"
import { TauriFileRepository } from "@/infrastructure/tauri/tauri-file.repository"
import { TauriSessionRepository } from "@/infrastructure/tauri/tauri-session.repository"
import { TauriWindowRepository } from "@/infrastructure/tauri/tauri-window.repository"

interface EditorCommands {
  undo: () => boolean
  redo: () => boolean
}

const tabsStore = useTabsStore()
const filesStore = useFilesStore()
const workspace = ref<EditorCommands | null>(null)
const ready = ref(false)

const fileCommands = createFileCommands({
  tabsStore,
  filesStore,
  files: new TauriFileRepository(),
  dialogs: new TauriFileDialogRepository(),
})
const session = createSessionController(
  new TauriSessionRepository(),
  tabsStore,
  filesStore,
)
const closeGuard = useUnsavedChangesGuard(
  fileCommands,
  new TauriWindowRepository(),
  session,
)

function createTab(): void {
  tabsStore.createTab()
}

function closeActiveTab(): void {
  if (tabsStore.activeTabId) closeGuard.requestClose(tabsStore.activeTabId)
}

useKeyboardShortcuts({
  newTab: createTab,
  closeTab: closeActiveTab,
  nextTab: () => tabsStore.activateRelative(1),
  previousTab: () => tabsStore.activateRelative(-1),
  activateByPosition: tabsStore.activateByPosition,
  open: () => void fileCommands.open(),
  save: () => void fileCommands.save(),
  saveAs: () => void fileCommands.saveAs(),
})

onMounted(async () => {
  await session.restore()
  session.start()
  await closeGuard.start()
  ready.value = true
})
</script>

<template>
  <div class="app-shell">
    <EditorToolbar
      @undo="workspace?.undo()"
      @redo="workspace?.redo()"
      @open="fileCommands.open()"
      @save="fileCommands.save()"
      @save-as="fileCommands.saveAs()"
      @open-recent="fileCommands.openPath($event)"
    />

    <TabBar @new="createTab" @close="closeGuard.requestClose">
      <template #actions>
        <EditorModeSwitcher />
      </template>
    </TabBar>

    <Alert v-if="filesStore.errorMessage" variant="destructive" class="file-error-banner">
      <CircleAlert />
      <AlertTitle>Document operation failed</AlertTitle>
      <AlertDescription>{{ filesStore.errorMessage }}</AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Dismiss error"
        @click="filesStore.clearError"
      >
        <X />
      </Button>
    </Alert>

    <div v-if="!ready" class="workspace-loading" role="status">Restoring workspace…</div>
    <ActiveDocumentWorkspace
      v-else-if="tabsStore.activeTab"
      ref="workspace"
    />
    <EmptyWorkspace v-else @new="createTab" @open="fileCommands.open()" />

    <UnsavedChangesDialog
      :open="closeGuard.dialogOpen.value"
      :title="closeGuard.dialogTitle.value"
      :processing="closeGuard.processing.value"
      @save="closeGuard.saveAndContinue"
      @discard="closeGuard.discardAndContinue"
      @cancel="closeGuard.cancel"
    />
  </div>
</template>
