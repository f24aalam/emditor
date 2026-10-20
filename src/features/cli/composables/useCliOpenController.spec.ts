import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import { useCliOpenController, type CliRepository, type OpenRequest } from "@/features/cli"
import { useTabsStore } from "@/features/tabs"

class FakeCliRepository implements CliRepository {
  startup: OpenRequest[] = []
  completed: Array<{ token: string; failed: boolean }> = []
  handler: ((request: OpenRequest) => void) | null = null

  async listen(handler: (request: OpenRequest) => void): Promise<() => void> {
    this.handler = handler
    return () => { this.handler = null }
  }

  async drain(): Promise<OpenRequest[]> {
    const requests = this.startup
    this.startup = []
    return requests
  }

  async completeWait(token: string, failed: boolean): Promise<void> {
    this.completed.push({ token, failed })
  }
}

function request(id: string, paths: string[], waitToken: string | null = null): OpenRequest {
  return { id, paths, waitToken }
}

describe("CLI open controller", () => {
  beforeEach(() => setActivePinia(createPinia()))

  function setup(failPath?: string) {
    const tabsStore = useTabsStore()
    const repository = new FakeCliRepository()
    const openCliPath = vi.fn(async (path: string) => {
      if (path === failPath) return null
      return tabsStore.openFile({
        title: path.split("/").slice(-1)[0] ?? path,
        filePath: path,
        pathKey: path.toLowerCase(),
        content: "",
      })
    })
    const reportError = vi.fn()
    const controller = useCliOpenController({
      repository,
      files: { openCliPath },
      tabsStore,
      reportError,
    })
    return { tabsStore, repository, openCliPath, controller }
  }

  it("registers its listener before draining and preserves queue order", async () => {
    const { repository, openCliPath, controller } = setup()
    repository.startup = [request("startup", ["/one.md"])]
    await controller.startListening()
    repository.handler?.(request("forwarded", ["/two.md"]))

    await controller.finishStartup(null)

    expect(openCliPath.mock.calls.map(([path]) => path)).toEqual(["/one.md", "/two.md"])
  })

  it("deduplicates notifications also returned by the Rust queue", async () => {
    const { repository, openCliPath, controller } = setup()
    const duplicate = request("same", ["/one.md"])
    repository.startup = [duplicate]
    await controller.startListening()
    repository.handler?.(duplicate)
    await controller.finishStartup(null)
    expect(openCliPath).toHaveBeenCalledOnce()
  })

  it("removes only the automatic welcome tab after a successful file open", async () => {
    const { tabsStore, repository, controller } = setup()
    const welcome = tabsStore.createTab("welcome")
    const restored = tabsStore.createTab("restored")
    repository.startup = [request("open", ["/one.md"])]
    await controller.startListening()
    await controller.finishStartup(welcome)
    expect(tabsStore.tabs.some((tab) => tab.id === welcome)).toBe(false)
    expect(tabsStore.tabs.some((tab) => tab.id === restored)).toBe(true)
  })

  it("reuses one tab and completes wait only after that tab closes", async () => {
    const { tabsStore, repository, controller } = setup()
    const existing = tabsStore.openFile({
      title: "one.md",
      filePath: "/one.md",
      pathKey: "/one.md",
      content: "existing",
    })
    repository.startup = [request("wait", ["/one.md"], "token")]
    await controller.startListening()
    await controller.finishStartup(null)
    expect(tabsStore.tabs).toHaveLength(1)
    expect(repository.completed).toEqual([])

    tabsStore.closeTab(existing.id)
    await vi.waitFor(() => expect(repository.completed).toEqual([{ token: "token", failed: false }]))
  })

  it("reports partial failure after successful tabs have closed", async () => {
    const { tabsStore, repository, controller } = setup("/bad.md")
    repository.startup = [request("partial", ["/good.md", "/bad.md"], "token")]
    await controller.startListening()
    await controller.finishStartup(null)
    expect(repository.completed).toEqual([])
    tabsStore.closeTab(tabsStore.tabs[0]!.id)
    await vi.waitFor(() => expect(repository.completed).toEqual([{ token: "token", failed: true }]))
  })

  it("uses openCliPaths batch opening when multiple paths are requested", async () => {
    const tabsStore = useTabsStore()
    const repository = new FakeCliRepository()
    const openCliPath = vi.fn()
    const openCliPaths = vi.fn(async (paths: readonly string[]) => {
      const opened = tabsStore.openFiles(
        paths.map((path) => ({
          title: path.split("/").slice(-1)[0] ?? path,
          filePath: path,
          pathKey: path.toLowerCase(),
          content: "",
        })),
      )
      return { ids: opened.map((item) => item.id), failed: false }
    })
    const controller = useCliOpenController({
      repository,
      files: { openCliPath, openCliPaths },
      tabsStore,
      reportError: vi.fn(),
    })

    repository.startup = [request("batch", ["/a.md", "/b.md", "/c.md"])]
    await controller.startListening()
    await controller.finishStartup(null)

    expect(openCliPaths).toHaveBeenCalledOnce()
    expect(openCliPath).not.toHaveBeenCalled()
    expect(tabsStore.tabs).toHaveLength(3)
  })
})
