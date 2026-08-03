import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import type { ActiveEditorCommands } from "@/features/commands"
import { useFilesStore } from "@/features/files"
import { createNativeMenuState } from "@/features/menu"
import { useTabsStore } from "@/features/tabs"

describe("native menu state", () => {
  beforeEach(() => setActivePinia(createPinia()))

  function state(editor: ActiveEditorCommands | null = null) {
    return createNativeMenuState({
      tabsStore: useTabsStore(),
      filesStore: useFilesStore(),
      activeEditor: () => editor,
    })
  }

  it("disables document actions without an active tab", () => {
    expect(state()).toMatchObject({
      canSave: false,
      canCloseTab: false,
      canNavigateTabs: false,
      canMoveTabLeft: false,
      canMoveTabRight: false,
      activeMode: null,
    })
  })

  it("follows the active tab mode and tab boundaries", () => {
    const tabsStore = useTabsStore()
    const first = tabsStore.createTab()
    tabsStore.createTab()
    tabsStore.activateTab(first)
    tabsStore.setMode(first, "split")

    expect(state()).toMatchObject({
      canSave: true,
      canNavigateTabs: true,
      canMoveTabLeft: false,
      canMoveTabRight: true,
      activeMode: "split",
    })
  })

  it("uses the active editor's real Undo and Redo availability", () => {
    useTabsStore().createTab()
    const editor: ActiveEditorCommands = {
      undo: () => false,
      redo: () => false,
      canUndo: () => true,
      canRedo: () => false,
    }

    expect(state(editor)).toMatchObject({ canUndo: true, canRedo: false })
  })

  it("copies recent-file state for native synchronization", () => {
    useFilesStore().addRecentFile({
      title: "notes.md",
      filePath: "/docs/notes.md",
      pathKey: "/docs/notes.md",
    })

    const snapshot = state()
    expect(snapshot.recentFiles).toEqual([{
      title: "notes.md",
      filePath: "/docs/notes.md",
      pathKey: "/docs/notes.md",
    }])
  })
})
