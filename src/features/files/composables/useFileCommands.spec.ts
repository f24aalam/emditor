import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import {
  createFileCommands,
  useFilesStore,
  type FileDialogRepository,
  type FileRepository,
  type ResolvedFilePath,
} from "@/features/files"
import { useTabsStore, type OpenedMarkdownFile, type SavedMarkdownFile } from "@/features/tabs"

class FakeFiles implements FileRepository {
  writes: Array<{ path: string; content: string }> = []
  shouldFail = false

  read(path: string): Promise<OpenedMarkdownFile> {
    if (this.shouldFail) return Promise.reject(new Error("not found"))
    return Promise.resolve({
      title: "notes.md",
      filePath: path,
      pathKey: path.toLowerCase(),
      content: "loaded",
    })
  }

  resolve(path: string): Promise<ResolvedFilePath> {
    return Promise.resolve({ title: "notes.md", filePath: path, pathKey: path.toLowerCase() })
  }

  write(path: string, content: string): Promise<SavedMarkdownFile> {
    this.writes.push({ path, content })
    return this.resolve(path)
  }
}

class FakeDialogs implements FileDialogRepository {
  openPath: string | null = null
  savePath: string | null = null

  chooseMarkdownFile(): Promise<string | null> {
    return Promise.resolve(this.openPath)
  }

  chooseMarkdownSavePath(): Promise<string | null> {
    return Promise.resolve(this.savePath)
  }
}

describe("file commands", () => {
  beforeEach(() => setActivePinia(createPinia()))

  function setup() {
    const tabsStore = useTabsStore()
    const filesStore = useFilesStore()
    const files = new FakeFiles()
    const dialogs = new FakeDialogs()
    const commands = createFileCommands({ tabsStore, filesStore, files, dialogs })
    return { tabsStore, filesStore, files, dialogs, commands }
  }

  it("updates an untitled tab and recent files after Save As", async () => {
    const { tabsStore, filesStore, files, dialogs, commands } = setup()
    tabsStore.createTab("draft", "")
    dialogs.savePath = "/docs/notes.md"

    await expect(commands.saveAs()).resolves.toBe(true)
    expect(files.writes).toEqual([{ path: "/docs/notes.md", content: "draft" }])
    expect(tabsStore.activeTab).toMatchObject({ title: "notes.md", filePath: "/docs/notes.md" })
    expect(filesStore.recentFiles[0]?.filePath).toBe("/docs/notes.md")
  })

  it("writes the active Markdown file and marks it saved", async () => {
    const { tabsStore, files, commands } = setup()
    const { id } = tabsStore.openFile({
      title: "notes.md",
      filePath: "/docs/notes.md",
      pathKey: "/docs/notes.md",
      content: "saved",
    })
    tabsStore.updateContent(id, "updated")

    await expect(commands.save()).resolves.toBe(true)
    expect(files.writes).toEqual([{ path: "/docs/notes.md", content: "updated" }])
    expect(tabsStore.isModified(id)).toBe(false)
  })

  it("does not overwrite a path owned by another tab", async () => {
    const { tabsStore, files, dialogs, commands } = setup()
    tabsStore.openFile({
      title: "notes.md",
      filePath: "/docs/notes.md",
      pathKey: "/docs/notes.md",
      content: "existing",
    })
    tabsStore.createTab("other", "")
    dialogs.savePath = "/docs/notes.md"

    await expect(commands.saveAs()).resolves.toBe(false)
    expect(files.writes).toHaveLength(0)
  })

  it("removes a missing recent file and exposes a useful error", async () => {
    const { filesStore, files, commands } = setup()
    filesStore.addRecentFile({
      title: "missing.md",
      filePath: "/docs/missing.md",
      pathKey: "/docs/missing.md",
    })
    files.shouldFail = true

    await expect(commands.openPath("/docs/missing.md")).resolves.toBe(false)
    expect(filesStore.recentFiles).toHaveLength(0)
    expect(filesStore.errorMessage).toContain("missing.md")
  })
})
