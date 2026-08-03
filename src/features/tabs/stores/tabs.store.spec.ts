import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import { useTabsStore } from "@/features/tabs"

describe("tabs store", () => {
  beforeEach(() => setActivePinia(createPinia()))

  it("creates and activates uniquely titled tabs", () => {
    const store = useTabsStore()
    const first = store.createTab()
    const second = store.createTab()

    expect(store.tabs.map((tab) => tab.title)).toEqual(["Untitled", "Untitled 2"])
    expect(store.activeTabId).toBe(second)
    store.activateTab(first)
    expect(store.activeTabId).toBe(first)
  })

  it("selects the right neighbor, then the left neighbor, when closing", () => {
    const store = useTabsStore()
    const first = store.createTab()
    const second = store.createTab()
    const third = store.createTab()

    store.activateTab(second)
    store.closeTab(second)
    expect(store.activeTabId).toBe(third)
    store.closeTab(third)
    expect(store.activeTabId).toBe(first)
    store.closeTab(first)
    expect(store.activeTabId).toBeNull()
  })

  it("does not change the active tab when closing an inactive tab", () => {
    const store = useTabsStore()
    const first = store.createTab()
    const second = store.createTab()
    store.closeTab(first)
    expect(store.activeTabId).toBe(second)
  })

  it("derives modified state from current and saved content", () => {
    const store = useTabsStore()
    const id = store.createTab("saved")
    expect(store.isModified(id)).toBe(false)
    store.updateContent(id, "changed")
    expect(store.isModified(id)).toBe(true)
    store.updateContent(id, "saved")
    expect(store.isModified(id)).toBe(false)
  })

  it("activates an existing tab for a duplicate normalized path", () => {
    const store = useTabsStore()
    const first = store.openFile({
      title: "notes.md",
      filePath: "/docs/notes.md",
      pathKey: "/docs/notes.md",
      content: "first",
    })
    const duplicate = store.openFile({
      title: "NOTES.md",
      filePath: "/docs/NOTES.md",
      pathKey: "/docs/notes.md",
      content: "second",
    })

    expect(duplicate).toEqual({ id: first.id, created: false })
    expect(store.tabs).toHaveLength(1)
    expect(store.activeTab?.content).toBe("first")
  })

  it("reorders tabs without changing active identity", () => {
    const store = useTabsStore()
    const first = store.createTab()
    const second = store.createTab()
    const third = store.createTab()
    store.activateTab(second)
    store.reorderTabs(0, 2)

    expect(store.tabs.map((tab) => tab.id)).toEqual([second, third, first])
    expect(store.activeTabId).toBe(second)
  })

  it("updates an untitled tab after Save As", () => {
    const store = useTabsStore()
    const id = store.createTab("content", "")
    store.completeSave(id, {
      title: "saved.md",
      filePath: "/docs/saved.md",
      pathKey: "/docs/saved.md",
    })

    expect(store.activeTab).toMatchObject({
      title: "saved.md",
      filePath: "/docs/saved.md",
      pathKey: "/docs/saved.md",
      lastSavedContent: "content",
    })
    expect(store.isModified(id)).toBe(false)
  })
})
