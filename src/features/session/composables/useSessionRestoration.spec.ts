import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import { useFilesStore } from "@/features/files"
import {
  useSessionRestoration,
  type SessionRepository,
  type SessionSnapshot,
} from "@/features/session"
import { useTabsStore } from "@/features/tabs"

class FakeSessionRepository implements SessionRepository {
  saved: SessionSnapshot | null = null
  initial: unknown = null

  async load(): Promise<unknown> {
    return this.initial
  }

  async save(snapshot: SessionSnapshot): Promise<void> {
    this.saved = snapshot
  }
}

describe("session restoration", () => {
  beforeEach(() => setActivePinia(createPinia()))

  it("omits draftContent for clean file-backed tabs and preserves it for dirty tabs", async () => {
    const tabsStore = useTabsStore()
    const filesStore = useFilesStore()
    const repository = new FakeSessionRepository()
    const session = useSessionRestoration(repository, tabsStore, filesStore)

    tabsStore.openFile({
      title: "clean.md",
      filePath: "/docs/clean.md",
      pathKey: "/docs/clean.md",
      content: "disk content",
    })
    const dirty = tabsStore.openFile({
      title: "dirty.md",
      filePath: "/docs/dirty.md",
      pathKey: "/docs/dirty.md",
      content: "original",
    })
    tabsStore.updateContent(dirty.id, "modified draft")

    await session.flush()

    expect(repository.saved?.tabs).toEqual([
      expect.objectContaining({
        title: "clean.md",
        filePath: "/docs/clean.md",
        draftContent: null,
      }),
      expect.objectContaining({
        title: "dirty.md",
        filePath: "/docs/dirty.md",
        draftContent: "modified draft",
      }),
    ])
  })

  it("reloads clean file-backed tabs from disk while keeping dirty drafts on restore", async () => {
    const tabsStore = useTabsStore()
    const filesStore = useFilesStore()
    const repository = new FakeSessionRepository()
    repository.initial = {
      version: 1,
      activeTabId: "dirty-id",
      recentFiles: [],
      tabs: [
        {
          id: "clean-id",
          title: "clean.md",
          filePath: "/docs/clean.md",
          pathKey: "/docs/clean.md",
          draftContent: null,
          mode: "editor",
        },
        {
          id: "dirty-id",
          title: "dirty.md",
          filePath: "/docs/dirty.md",
          pathKey: "/docs/dirty.md",
          draftContent: "unsaved local draft",
          mode: "source",
        },
      ],
    }

    const session = useSessionRestoration(repository, tabsStore, filesStore, {
      read: async (path: string) => ({
        title: path.split("/").slice(-1)[0] ?? path,
        filePath: path,
        pathKey: path,
        content: path.includes("clean") ? "updated externally on disk" : "disk baseline",
      }),
    })

    await session.restore()

    expect(tabsStore.tabs).toHaveLength(2)
    expect(tabsStore.tabs[0]).toMatchObject({
      id: "clean-id",
      content: "updated externally on disk",
      lastSavedContent: "updated externally on disk",
    })
    expect(tabsStore.isModified("clean-id")).toBe(false)

    expect(tabsStore.tabs[1]).toMatchObject({
      id: "dirty-id",
      content: "unsaved local draft",
      lastSavedContent: "disk baseline",
    })
    expect(tabsStore.isModified("dirty-id")).toBe(true)
  })
})
