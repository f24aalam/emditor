<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import { CircleAlert, X } from "@lucide/vue"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import EditorModeSwitcher from "@/components/editor/EditorModeSwitcher.vue"
import {
  APPLICATION_COMMAND_IDS,
  createApplicationCommands,
  type ActiveEditorCommands,
} from "@/features/commands"
import { createCliOpenController } from "@/features/cli"
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
import { TauriCliRepository } from "@/infrastructure/tauri/tauri-cli.repository"
import { TauriFileRepository } from "@/infrastructure/tauri/tauri-file.repository"
import { TauriSessionRepository } from "@/infrastructure/tauri/tauri-session.repository"
import { TauriShellCommandRepository } from "@/infrastructure/tauri/tauri-shell-command.repository"
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
const cli = createCliOpenController({
  repository: new TauriCliRepository(),
  files: fileCommands,
  tabsStore,
  reportError: filesStore.setError,
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
  manageShellCommands: async (install) => {
    try {
      await new TauriShellCommandRepository().manage(install)
      return true
    } catch (cause: unknown) {
      const detail = typeof cause === "string"
        ? cause
        : cause instanceof Error ? cause.message : "Unknown error"
      filesStore.setError(`Unable to update the Emditor shell commands: ${detail}`)
      return false
    }
  },
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
  await cli.startListening()
  const automaticWelcomeTabId = await session.restore()
  session.start()
  await closeGuard.start()
  await cli.finishStartup(automaticWelcomeTabId)
  ready.value = true
})

onUnmounted(cli.stop)
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
