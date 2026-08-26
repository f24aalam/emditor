import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import {
  APPLICATION_COMMAND_IDS,
  createApplicationCommands,
  type ActiveEditorCommands,
} from "@/features/commands"
import type { FileCommands } from "@/features/files"
import { useTabsStore } from "@/features/tabs"

describe("application commands", () => {
  beforeEach(() => setActivePinia(createPinia()))

  function setup() {
    const tabsStore = useTabsStore()
    const files: FileCommands = {
      open: vi.fn(async () => true),
      openPath: vi.fn(async () => true),
      openCliPath: vi.fn(async () => null),
      save: vi.fn(async () => true),
      saveAs: vi.fn(async () => true),
    }
    const closeTab = vi.fn()
    const closeWindow = vi.fn(async () => undefined)
    const editor: ActiveEditorCommands = {
      undo: vi.fn(() => true),
      redo: vi.fn(() => true),
      canUndo: () => true,
      canRedo: () => true,
    }
    const reportError = vi.fn()
    const reportUnknown = vi.fn()
    const commands = createApplicationCommands({
      tabsStore,
      files,
      close: { closeTab, closeWindow },
      activeEditor: () => editor,
      reportError,
      reportUnknown,
    })
    return {
      tabsStore,
      files,
      closeTab,
      closeWindow,
      editor,
      reportError,
      reportUnknown,
      commands,
    }
  }

  it("creates a new tab through the shared command", async () => {
    const { tabsStore, commands } = setup()

    await expect(commands.execute(APPLICATION_COMMAND_IDS.newTab)).resolves.toBe(true)
    expect(tabsStore.tabs).toHaveLength(1)
    expect(tabsStore.activeTab?.title).toBe("Untitled")
  })

  it("saves the active tab through the existing file command", async () => {
    const { tabsStore, files, commands } = setup()
    tabsStore.createTab("draft", "")

    await commands.execute(APPLICATION_COMMAND_IDS.save)
    expect(files.save).toHaveBeenCalledOnce()
  })

  it("routes a dirty active tab through close protection", async () => {
    const { tabsStore, closeTab, commands } = setup()
    const tabId = tabsStore.createTab("saved")
    tabsStore.updateContent(tabId, "dirty")

    await commands.execute(APPLICATION_COMMAND_IDS.closeTab)
    expect(closeTab).toHaveBeenCalledWith(tabId)
    expect(tabsStore.tabs).toHaveLength(1)
  })

  it("updates the active tab mode", async () => {
    const { tabsStore, commands } = setup()
    tabsStore.createTab()

    await commands.execute(APPLICATION_COMMAND_IDS.sourceMode)
    expect(tabsStore.activeTab?.mode).toBe("source")
  })

  it("moves the active tab without changing its identity", async () => {
    const { tabsStore, commands } = setup()
    const first = tabsStore.createTab()
    const second = tabsStore.createTab()

    await commands.execute(APPLICATION_COMMAND_IDS.moveTabLeft)
    expect(tabsStore.tabs.map((tab) => tab.id)).toEqual([second, first])
    expect(tabsStore.activeTabId).toBe(second)
  })

  it("handles unknown menu IDs safely", async () => {
    const { reportUnknown, reportError, commands } = setup()

    await expect(commands.execute("not_a_real_command")).resolves.toBe(false)
    expect(reportUnknown).toHaveBeenCalledWith("not_a_real_command")
    expect(reportError).not.toHaveBeenCalled()
  })
})
