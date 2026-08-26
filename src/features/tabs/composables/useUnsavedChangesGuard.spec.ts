import { beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createPinia, setActivePinia } from "pinia"

import type { FileCommands } from "@/features/files"
import { useTabsStore } from "@/features/tabs"
import { useUnsavedChangesGuard } from "@/features/tabs/composables/useUnsavedChangesGuard"
import type { WindowRepository } from "@/features/tabs/model/window.repository"

describe("unsaved changes guard", () => {
  beforeEach(() => setActivePinia(createPinia()))

  function setup(saveResult = true) {
    const tabsStore = useTabsStore()
    const tabId = tabsStore.createTab("saved")
    tabsStore.updateContent(tabId, "dirty")
    const files: FileCommands = {
      open: vi.fn(async () => false),
      openPath: vi.fn(async () => false),
      openCliPath: vi.fn(async () => null),
      save: vi.fn(async () => saveResult),
      saveAs: vi.fn(async () => true),
    }
    const windowRepository: WindowRepository = {
      onCloseRequested: vi.fn(async () => () => undefined),
      destroy: vi.fn(async () => undefined),
    }
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    const guard = useUnsavedChangesGuard(files, windowRepository, {
      flush: vi.fn(async () => undefined),
    })
    return { tabsStore, tabId, files, windowRepository, guard, warning }
  }

  it("opens the existing confirmation flow before closing a dirty tab", () => {
    const { tabsStore, tabId, guard, warning } = setup()
    guard.requestClose(tabId)

    expect(guard.dialogOpen.value).toBe(true)
    expect(guard.dialogTitle.value).toContain("Untitled")
    expect(tabsStore.tabs).toHaveLength(1)
    warning.mockRestore()
  })

  it("closes the dialog and tab after Save succeeds", async () => {
    const { tabsStore, tabId, files, guard, warning } = setup()
    guard.requestClose(tabId)

    await guard.saveAndContinue()

    expect(files.save).toHaveBeenCalledWith(tabId)
    expect(guard.dialogOpen.value).toBe(false)
    expect(tabsStore.tabs).toHaveLength(0)
    warning.mockRestore()
  })

  it("closes only the dialog when Cancel is selected", () => {
    const { tabsStore, tabId, guard, warning } = setup()
    guard.requestClose(tabId)

    guard.cancel()

    expect(guard.dialogOpen.value).toBe(false)
    expect(tabsStore.tabs).toHaveLength(1)
    warning.mockRestore()
  })

  it("keeps the dialog open when Save is canceled or fails", async () => {
    const { tabsStore, tabId, guard, warning } = setup(false)
    guard.requestClose(tabId)

    await guard.saveAndContinue()

    expect(guard.dialogOpen.value).toBe(true)
    expect(guard.processing.value).toBe(false)
    expect(tabsStore.tabs).toHaveLength(1)
    warning.mockRestore()
  })

  it("allows another close attempt when destroying the window fails", async () => {
    const { tabsStore, tabId, windowRepository, guard, warning } = setup()
    tabsStore.completeSave(tabId)
    vi.mocked(windowRepository.destroy).mockRejectedValueOnce(new Error("destroy failed"))

    await expect(guard.requestWindowClose()).rejects.toThrow("destroy failed")

    expect(guard.processing.value).toBe(false)
    warning.mockRestore()
  })

  it("removes the web modal before starting an asynchronous save", async () => {
    const { tabId, files, guard, warning } = setup()
    let finishSave = (_result: boolean): void => {
      throw new Error("The save operation did not start")
    }
    vi.mocked(files.save).mockImplementation(() => new Promise((resolve) => {
      finishSave = resolve
    }))
    guard.requestClose(tabId)

    const saving = guard.saveAndContinue()
    await nextTick()

    expect(guard.processing.value).toBe(true)
    expect(guard.dialogOpen.value).toBe(false)
    finishSave(false)
    await saving
    expect(guard.dialogOpen.value).toBe(true)
    warning.mockRestore()
  })
})
