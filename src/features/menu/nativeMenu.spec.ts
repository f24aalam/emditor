import { beforeEach, describe, expect, it, vi } from "vitest"

const tauriMenu = vi.hoisted(() => ({
  created: [] as Array<{
    id: string
    kind: string
    options: Record<string, unknown>
    enabled: boolean
    checked: boolean
    closed: boolean
  }>,
  windowsMenuCalls: 0,
  helpMenuCalls: 0,
}))

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => true,
  Resource: class {},
}))

vi.mock("@tauri-apps/api/menu", () => {
  type FakeOptions = Record<string, unknown> & {
    id?: string
    enabled?: boolean
    checked?: boolean
    items?: FakeResource[]
  }

  let generatedId = 0

  class FakeResource {
    id: string
    kind: string
    options: FakeOptions
    enabled: boolean
    checked: boolean
    closed = false
    children: FakeResource[]

    constructor(kind: string, options: FakeOptions = {}) {
      this.kind = kind
      this.options = options
      this.id = options.id ?? `${kind}_${generatedId += 1}`
      this.enabled = options.enabled ?? true
      this.checked = options.checked ?? false
      this.children = options.items ? [...options.items] : []
      tauriMenu.created.push(this)
    }

    async close(): Promise<void> {
      this.closed = true
    }

    async setEnabled(enabled: boolean): Promise<void> {
      this.enabled = enabled
    }

    async setChecked(checked: boolean): Promise<void> {
      this.checked = checked
    }

    async append(item: FakeResource): Promise<void> {
      this.children.push(item)
    }

    async remove(item: FakeResource): Promise<void> {
      this.children = this.children.filter((candidate) => candidate !== item)
    }

    async setAsWindowsMenuForNSApp(): Promise<void> {
      tauriMenu.windowsMenuCalls += 1
    }

    async setAsHelpMenuForNSApp(): Promise<void> {
      tauriMenu.helpMenuCalls += 1
    }

    async setAsAppMenu(): Promise<null> {
      return null
    }
  }

  class MenuItem extends FakeResource {
    static async new(options: FakeOptions): Promise<MenuItem> {
      return new MenuItem("MenuItem", options)
    }
  }

  class CheckMenuItem extends FakeResource {
    static async new(options: FakeOptions): Promise<CheckMenuItem> {
      return new CheckMenuItem("CheckMenuItem", options)
    }
  }

  class PredefinedMenuItem extends FakeResource {
    static async new(options: FakeOptions): Promise<PredefinedMenuItem> {
      return new PredefinedMenuItem("PredefinedMenuItem", options)
    }
  }

  class Submenu extends FakeResource {
    static async new(options: FakeOptions): Promise<Submenu> {
      return new Submenu("Submenu", options)
    }
  }

  class Menu extends FakeResource {
    static async new(options: FakeOptions): Promise<Menu> {
      return new Menu("Menu", options)
    }
  }

  return { MenuItem, CheckMenuItem, PredefinedMenuItem, Submenu, Menu }
})

import { APPLICATION_COMMAND_IDS } from "@/features/commands"
import { createNativeMenuController, type NativeMenuState } from "@/features/menu"

function menuState(overrides: Partial<NativeMenuState> = {}): NativeMenuState {
  return {
    canSave: false,
    canCloseTab: false,
    canUndo: false,
    canRedo: false,
    canNavigateTabs: false,
    canMoveTabLeft: false,
    canMoveTabRight: false,
    activeMode: null,
    recentFiles: [],
    ...overrides,
  }
}

describe("native menu", () => {
  beforeEach(() => {
    tauriMenu.created.length = 0
    tauriMenu.windowsMenuCalls = 0
    tauriMenu.helpMenuCalls = 0
  })

  function controller(platform: "macos" | "windows" | "linux" = "linux") {
    const execute = vi.fn(async () => true)
    const openRecent = vi.fn(async () => true)
    const reportError = vi.fn()
    return {
      execute,
      openRecent,
      reportError,
      instance: createNativeMenuController(
        { execute, openRecent, reportError },
        { platform, available: () => true },
      ),
    }
  }

  it("installs command callbacks only once", async () => {
    const { instance } = controller()
    await instance.install(menuState())
    const createdAfterFirstInstall = tauriMenu.created.length

    await instance.install(menuState({ canSave: true }))
    expect(tauriMenu.created).toHaveLength(createdAfterFirstInstall)
  })

  it("routes stable menu IDs to the shared command layer", async () => {
    const { instance, execute } = controller()
    await instance.install(menuState())
    const newTab = tauriMenu.created.find((item) => item.id === APPLICATION_COMMAND_IDS.newTab)
    const action = newTab?.options.action

    expect(action).toBeTypeOf("function")
    if (typeof action === "function") action(APPLICATION_COMMAND_IDS.newTab)
    await Promise.resolve()
    expect(execute).toHaveBeenCalledWith(APPLICATION_COMMAND_IDS.newTab)

    const themeItem = tauriMenu.created.find((item) => item.id === APPLICATION_COMMAND_IDS.openTheme)
    expect(themeItem?.options.text).toBe("Theme…")
    const themeAction = themeItem?.options.action
    if (typeof themeAction === "function") themeAction(APPLICATION_COMMAND_IDS.openTheme)
    await Promise.resolve()
    expect(execute).toHaveBeenCalledWith(APPLICATION_COMMAND_IDS.openTheme)
  })

  it("synchronizes enabled and checked state", async () => {
    const { instance } = controller()
    await instance.install(menuState({
      canSave: true,
      canCloseTab: true,
      activeMode: "source",
    }))

    expect(tauriMenu.created.find((item) => item.id === APPLICATION_COMMAND_IDS.save)?.enabled)
      .toBe(true)
    expect(tauriMenu.created.find((item) => item.id === APPLICATION_COMMAND_IDS.sourceMode)?.checked)
      .toBe(true)
    expect(tauriMenu.created.find((item) => item.id === APPLICATION_COMMAND_IDS.editorMode)?.checked)
      .toBe(false)
  })

  it("defers native state mutations until an active menu command finishes", async () => {
    const { instance, execute } = controller()
    let finishSave: ((result: boolean) => void) | undefined
    execute.mockImplementationOnce(() => new Promise<boolean>((resolve) => {
      finishSave = resolve
    }))
    await instance.install(menuState({ canSave: true }))
    const save = tauriMenu.created.find((item) => item.id === APPLICATION_COMMAND_IDS.save)
    const action = save?.options.action

    expect(action).toBeTypeOf("function")
    if (typeof action === "function") action(APPLICATION_COMMAND_IDS.save)
    await instance.sync(menuState({ canSave: false }))

    expect(save?.enabled).toBe(true)
    finishSave?.(true)
    await vi.waitFor(() => expect(save?.enabled).toBe(false))
  })

  it("rebuilds Open Recent and invokes the existing open-path command", async () => {
    const { instance, openRecent } = controller()
    await instance.install(menuState({
      recentFiles: [{
        title: "notes.md",
        filePath: "/docs/notes.md",
        pathKey: "/docs/notes.md",
      }],
    }))
    const recent = tauriMenu.created.find((item) => item.id.startsWith("file_open_recent_%2Fdocs"))
    const action = recent?.options.action

    if (typeof action === "function") action(recent?.id ?? "")
    await Promise.resolve()
    expect(openRecent).toHaveBeenCalledWith("/docs/notes.md")
  })

  it.each(["macos", "windows", "linux"] as const)(
    "constructs the %s menu without failing",
    async (platform) => {
      const { instance } = controller(platform)
      await expect(instance.install(menuState())).resolves.toBeUndefined()
      expect(instance.isInstalled()).toBe(true)
      await instance.dispose()
    },
  )

  it("marks the standard Window and Help menus on macOS", async () => {
    const { instance } = controller("macos")
    await instance.install(menuState())

    expect(tauriMenu.windowsMenuCalls).toBe(1)
    expect(tauriMenu.helpMenuCalls).toBe(1)
  })
})
