<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { CircleAlert, X } from "@lucide/vue"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import EditorModeSwitcher from "@/components/editor/EditorModeSwitcher.vue"
import {
  APPLICATION_COMMAND_IDS,
  createApplicationCommands,
  type ActiveEditorCommands,
} from "@/features/commands"
import { createFileCommands, useFilesStore } from "@/features/files"
import {
  createNativeMenuController,
  createNativeMenuState,
  useNativeMenu,
} from "@/features/menu"
import { createSessionController } from "@/features/session"
import ActiveDocumentWorkspace from "@/features/tabs/components/ActiveDocumentWorkspace.vue"
import EmptyWorkspace from "@/features/tabs/components/EmptyWorkspace.vue"
import TabBar from "@/features/tabs/components/TabBar.vue"
import UnsavedChangesDialog from "@/features/tabs/components/UnsavedChangesDialog.vue"
import { useKeyboardShortcuts } from "@/features/tabs/composables/useKeyboardShortcuts"
import { useUnsavedChangesGuard } from "@/features/tabs/composables/useUnsavedChangesGuard"
import { useTabsStore, type WorkspaceMode } from "@/features/tabs"
import { TauriFileDialogRepository } from "@/infrastructure/tauri/tauri-dialog.repository"
import { TauriFileRepository } from "@/infrastructure/tauri/tauri-file.repository"
import { TauriSessionRepository } from "@/infrastructure/tauri/tauri-session.repository"
import { TauriWindowRepository } from "@/infrastructure/tauri/tauri-window.repository"

const tabsStore = useTabsStore()
const filesStore = useFilesStore()
const workspace = ref<ActiveEditorCommands | null>(null)
const editorCommandRevision = ref(0)
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

const appCommands = createApplicationCommands({
  tabsStore,
  files: fileCommands,
  close: {
    closeTab: closeGuard.requestClose,
    closeWindow: closeGuard.requestWindowClose,
  },
  activeEditor: () => workspace.value,
  reportError: filesStore.setError,
  reportUnknown: (id) => console.warn(`Ignoring unknown application command: ${id}`),
})

const menuState = computed(() => {
  editorCommandRevision.value
  return createNativeMenuState({
    tabsStore,
    filesStore,
    activeEditor: () => workspace.value,
  })
})

const nativeMenu = createNativeMenuController({
  execute: appCommands.execute,
  openRecent: appCommands.openRecent,
  reportError: filesStore.setError,
})

useNativeMenu({
  ready,
  state: menuState,
  controller: nativeMenu,
  reportError: filesStore.setError,
})

useKeyboardShortcuts({ activateByPosition: tabsStore.activateByPosition })

function run(id: string): void {
  void appCommands.execute(id)
}

function selectMode(mode: WorkspaceMode): void {
  void appCommands.setWorkspaceMode(mode)
}

onMounted(async () => {
  await session.restore()
  session.start()
  await closeGuard.start()
  ready.value = true
})
</script>

<template>
  <div class="app-shell">
    <TabBar
      @new="run(APPLICATION_COMMAND_IDS.newTab)"
      @close="closeGuard.requestClose"
    >
      <template #actions>
        <EditorModeSwitcher @select="selectMode" />
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
      @history-state-change="editorCommandRevision += 1"
    />
    <EmptyWorkspace
      v-else
      @new="run(APPLICATION_COMMAND_IDS.newTab)"
      @open="run(APPLICATION_COMMAND_IDS.open)"
    />

    <UnsavedChangesDialog
      v-if="closeGuard.dialogOpen.value"
      :open="closeGuard.dialogOpen.value"
      :title="closeGuard.dialogTitle.value"
      :processing="closeGuard.processing.value"
      @save="closeGuard.saveAndContinue"
      @discard="closeGuard.discardAndContinue"
      @cancel="closeGuard.cancel"
    />
  </div>
</template>
