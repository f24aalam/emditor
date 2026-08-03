import type { ActiveEditorCommands } from "@/features/commands"
import type { RecentFile } from "@/features/files"
import { useFilesStore } from "@/features/files"
import { useTabsStore, type WorkspaceMode } from "@/features/tabs"

export interface NativeMenuState {
  canSave: boolean
  canCloseTab: boolean
  canUndo: boolean
  canRedo: boolean
  canNavigateTabs: boolean
  canMoveTabLeft: boolean
  canMoveTabRight: boolean
  activeMode: WorkspaceMode | null
  recentFiles: RecentFile[]
}

interface MenuStateDependencies {
  tabsStore: ReturnType<typeof useTabsStore>
  filesStore: ReturnType<typeof useFilesStore>
  activeEditor: () => ActiveEditorCommands | null
}

export function createNativeMenuState(
  dependencies: MenuStateDependencies,
): NativeMenuState {
  const { tabsStore, filesStore, activeEditor } = dependencies
  const activeIndex = tabsStore.tabs.findIndex((tab) => tab.id === tabsStore.activeTabId)
  const editor = activeEditor()
  const activeBusy = tabsStore.activeTabId
    ? filesStore.busyTabIds.includes(tabsStore.activeTabId)
    : false

  return {
    canSave: tabsStore.activeTab !== null && !activeBusy,
    canCloseTab: tabsStore.activeTab !== null,
    canUndo: editor?.canUndo() ?? false,
    canRedo: editor?.canRedo() ?? false,
    canNavigateTabs: tabsStore.tabs.length > 1,
    canMoveTabLeft: activeIndex > 0,
    canMoveTabRight: activeIndex >= 0 && activeIndex < tabsStore.tabs.length - 1,
    activeMode: tabsStore.activeTab?.mode ?? null,
    recentFiles: filesStore.recentFiles.map((file) => ({ ...file })),
  }
}
