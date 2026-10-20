export { default as ActiveDocumentWorkspace } from "./components/ActiveDocumentWorkspace.vue"
export { default as DocumentTabItem } from "./components/DocumentTab.vue"
export { default as EmptyWorkspace } from "./components/EmptyWorkspace.vue"
export { default as NewTabButton } from "./components/NewTabButton.vue"
export { default as TabBar } from "./components/TabBar.vue"
export { default as UnsavedChangesDialog } from "./components/UnsavedChangesDialog.vue"
export { useDeferredTabActivation } from "./composables/useDeferredTabActivation"
export { useKeyboardShortcuts } from "./composables/useKeyboardShortcuts"
export { useTabDrag } from "./composables/useTabDrag"
export { useUnsavedChangesGuard } from "./composables/useUnsavedChangesGuard"
export { MAX_CACHED_WORKSPACES, useWorkspaceCache } from "./composables/useWorkspaceCache"
export { useTabsStore, STARTER_MARKDOWN } from "./stores/tabs.store"
export {
  createDefaultEditorState,
  type DocumentEditorState,
  type DocumentTab,
  type EditorSelectionState,
  type EditorViewportState,
  type OpenedMarkdownFile,
  type PreviewViewportState,
  type SavedMarkdownFile,
  type WorkspaceMode,
} from "./model/tab.types"
export type { WindowRepository } from "./model/window.repository"
