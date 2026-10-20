import type { EditorCommands } from "@/features/editor"
import type { FileCommands } from "@/features/files"
import type { WorkspaceMode } from "@/features/tabs"
import { useTabsStore } from "@/features/tabs"
import { formatErrorMessage } from "@/shared/utils/error"

export const APPLICATION_COMMAND_IDS = {
  newTab: "file_new_tab",
  open: "file_open",
  save: "file_save",
  saveAs: "file_save_as",
  closeTab: "file_close_tab",
  exit: "file_exit",
  undo: "edit_undo",
  redo: "edit_redo",
  editorMode: "view_editor",
  sourceMode: "view_source",
  splitMode: "view_split",
  nextTab: "window_next_tab",
  previousTab: "window_previous_tab",
  moveTabLeft: "window_move_tab_left",
  moveTabRight: "window_move_tab_right",
  closeWindow: "window_close",
} as const

export type ApplicationCommandId =
  (typeof APPLICATION_COMMAND_IDS)[keyof typeof APPLICATION_COMMAND_IDS]

export type ActiveEditorCommands = EditorCommands

interface CloseCommands {
  closeTab: (tabId: string) => void
  closeWindow: () => Promise<void>
}

interface ApplicationCommandDependencies {
  tabsStore: ReturnType<typeof useTabsStore>
  files: FileCommands
  close: CloseCommands
  activeEditor: () => ActiveEditorCommands | null
  reportError: (message: string) => void
  reportUnknown?: (id: string) => void
}

export interface ApplicationCommands {
  execute: (id: string) => Promise<boolean>
  openRecent: (path: string) => Promise<boolean>
  setWorkspaceMode: (mode: WorkspaceMode) => Promise<boolean>
  isKnown: (id: string) => id is ApplicationCommandId
}

const COMMAND_IDS = new Set<string>(Object.values(APPLICATION_COMMAND_IDS))

export function createApplicationCommands(
  dependencies: ApplicationCommandDependencies,
): ApplicationCommands {
  const { tabsStore, files, close, activeEditor, reportError, reportUnknown } = dependencies

  function isKnown(id: string): id is ApplicationCommandId {
    return COMMAND_IDS.has(id)
  }

  async function setWorkspaceMode(mode: WorkspaceMode): Promise<boolean> {
    const tabId = tabsStore.activeTabId
    if (!tabId) return false
    tabsStore.setMode(tabId, mode)
    return true
  }

  async function openRecent(path: string): Promise<boolean> {
    return files.openPath(path)
  }

  function moveActiveTab(offset: 1 | -1): boolean {
    const currentIndex = tabsStore.tabs.findIndex((tab) => tab.id === tabsStore.activeTabId)
    const targetIndex = currentIndex + offset
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= tabsStore.tabs.length) {
      return false
    }
    tabsStore.reorderTabs(currentIndex, targetIndex)
    return true
  }

  async function run(id: ApplicationCommandId): Promise<boolean> {
    switch (id) {
      case APPLICATION_COMMAND_IDS.newTab:
        tabsStore.createTab()
        return true
      case APPLICATION_COMMAND_IDS.open:
        return files.open()
      case APPLICATION_COMMAND_IDS.save:
        return files.save()
      case APPLICATION_COMMAND_IDS.saveAs:
        return files.saveAs()
      case APPLICATION_COMMAND_IDS.closeTab:
        if (!tabsStore.activeTabId) return false
        close.closeTab(tabsStore.activeTabId)
        return true
      case APPLICATION_COMMAND_IDS.exit:
      case APPLICATION_COMMAND_IDS.closeWindow:
        await close.closeWindow()
        return true
      case APPLICATION_COMMAND_IDS.undo:
        return activeEditor()?.undo() ?? false
      case APPLICATION_COMMAND_IDS.redo:
        return activeEditor()?.redo() ?? false
      case APPLICATION_COMMAND_IDS.editorMode:
        return setWorkspaceMode("editor")
      case APPLICATION_COMMAND_IDS.sourceMode:
        return setWorkspaceMode("source")
      case APPLICATION_COMMAND_IDS.splitMode:
        return setWorkspaceMode("split")
      case APPLICATION_COMMAND_IDS.nextTab:
        if (tabsStore.tabs.length < 2) return false
        tabsStore.activateRelative(1)
        return true
      case APPLICATION_COMMAND_IDS.previousTab:
        if (tabsStore.tabs.length < 2) return false
        tabsStore.activateRelative(-1)
        return true
      case APPLICATION_COMMAND_IDS.moveTabLeft:
        return moveActiveTab(-1)
      case APPLICATION_COMMAND_IDS.moveTabRight:
        return moveActiveTab(1)
    }
  }

  async function execute(id: string): Promise<boolean> {
    if (!isKnown(id)) {
      reportUnknown?.(id)
      return false
    }

    try {
      return await run(id)
    } catch (cause: unknown) {
      reportError(formatErrorMessage(cause, "Unable to run the requested command"))
      return false
    }
  }

  return { execute, openRecent, setWorkspaceMode, isKnown }
}
