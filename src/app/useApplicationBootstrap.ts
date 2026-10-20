import { computed, onMounted, onUnmounted, ref } from "vue"

import {
  createApplicationCommands,
  type ActiveEditorCommands,
} from "@/features/commands"
import { useCliOpenController } from "@/features/cli"
import { useFileCommands, useFilesStore } from "@/features/files"
import {
  createNativeMenuController,
  createNativeMenuState,
  useNativeMenu,
} from "@/features/menu"
import { useSessionRestoration } from "@/features/session"
import {
  useKeyboardShortcuts,
  useTabsStore,
  useUnsavedChangesGuard,
  type WorkspaceMode,
} from "@/features/tabs"
import { useThemeController, useThemeStore } from "@/features/theme"
import { TauriCliRepository } from "@/infrastructure/tauri/tauri-cli.repository"
import { TauriFileDialogRepository } from "@/infrastructure/tauri/tauri-dialog.repository"
import { TauriFileRepository } from "@/infrastructure/tauri/tauri-file.repository"
import { TauriSessionRepository } from "@/infrastructure/tauri/tauri-session.repository"
import { TauriShellCommandRepository } from "@/infrastructure/tauri/tauri-shell-command.repository"
import { TauriWindowRepository } from "@/infrastructure/tauri/tauri-window.repository"
import { formatErrorMessage } from "@/shared/utils/error"

export function useApplicationBootstrap() {
  const tabsStore = useTabsStore()
  const filesStore = useFilesStore()
  const themeStore = useThemeStore()
  const themeController = useThemeController(themeStore)
  themeController.start()

  const workspace = ref<ActiveEditorCommands | null>(null)
  const editorCommandRevision = ref(0)
  const ready = ref(false)

  const fileRepository = new TauriFileRepository()
  const shellCommandRepository = new TauriShellCommandRepository()

  const fileCommands = useFileCommands({
    tabsStore,
    filesStore,
    files: fileRepository,
    dialogs: new TauriFileDialogRepository(),
  })
  const cli = useCliOpenController({
    repository: new TauriCliRepository(),
    files: fileCommands,
    tabsStore,
    reportError: filesStore.setError,
  })
  const session = useSessionRestoration(
    new TauriSessionRepository(),
    tabsStore,
    filesStore,
    fileRepository,
    themeStore,
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
    openTheme: themeStore.openDialog,
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
        await shellCommandRepository.manage(install)
        return true
      } catch (cause: unknown) {
        filesStore.setError(
          formatErrorMessage(cause, "Unable to update the Emditor shell commands", ": Unknown error"),
        )
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

  useKeyboardShortcuts({
    activateByPosition: tabsStore.activateByPosition,
    getTabCount: () => tabsStore.tabs.length,
  })

  function run(id: string): void {
    void appCommands.execute(id)
  }

  function selectMode(mode: WorkspaceMode): void {
    void appCommands.setWorkspaceMode(mode)
  }

  function notifyHistoryStateChange(): void {
    editorCommandRevision.value += 1
  }

  onMounted(async () => {
    await cli.startListening()
    const automaticWelcomeTabId = await session.restore()
    session.start()
    await closeGuard.start()
    await cli.finishStartup(automaticWelcomeTabId)
    ready.value = true
  })

  onUnmounted(() => {
    cli.stop()
    themeController.stop()
  })

  return {
    tabsStore,
    filesStore,
    themeStore,
    workspace,
    ready,
    closeGuard,
    run,
    selectMode,
    notifyHistoryStateChange,
  }
}
