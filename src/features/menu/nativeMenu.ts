import { isTauri, type Resource } from "@tauri-apps/api/core"
import {
  CheckMenuItem,
  Menu,
  MenuItem,
  PredefinedMenuItem,
  Submenu,
} from "@tauri-apps/api/menu"

import { APPLICATION_COMMAND_IDS } from "@/features/commands"
import { NATIVE_MENU_IDS, recentFileMenuId } from "@/features/menu/menuIds"
import type { NativeMenuState } from "@/features/menu/menuState"

export type DesktopPlatform = "macos" | "windows" | "linux"

interface NativeMenuHandlers {
  execute: (id: string) => Promise<boolean>
  openRecent: (path: string) => Promise<boolean>
  reportError: (message: string) => void
}

interface NativeMenuControllerOptions {
  platform?: DesktopPlatform
  available?: () => boolean
}

export interface NativeMenuController {
  install: (state: NativeMenuState) => Promise<void>
  sync: (state: NativeMenuState) => Promise<void>
  dispose: () => Promise<void>
  isInstalled: () => boolean
}

// Kept at module scope so an App.vue hot replacement cannot leave an older
// controller installed or let its delayed cleanup replace the newer menu.
let activeNativeMenuController: NativeMenuController | null = null

function currentPlatform(): DesktopPlatform {
  const userAgent = globalThis.navigator?.userAgent.toLowerCase() ?? ""
  if (userAgent.includes("macintosh") || userAgent.includes("mac os")) return "macos"
  if (userAgent.includes("windows")) return "windows"
  return "linux"
}

function errorMessage(cause: unknown, action: string): string {
  if (cause instanceof Error && cause.message.trim()) return `${action}: ${cause.message}`
  return action
}

export function createNativeMenuController(
  handlers: NativeMenuHandlers,
  options: NativeMenuControllerOptions = {},
): NativeMenuController {
  const platform = options.platform ?? currentPlatform()
  const available = options.available ?? isTauri
  const resources: Resource[] = []
  const enabledItems = new Map<string, MenuItem>()
  const checkedItems = new Map<string, CheckMenuItem>()
  let recentSubmenu: Submenu | null = null
  let recentItems: MenuItem[] = []
  let recentSignature = ""
  let menu: Menu | null = null
  let previousState: NativeMenuState | null = null
  let activeActionCount = 0
  let pendingState: NativeMenuState | null = null
  let syncQueue = Promise.resolve()
  let disposePromise: Promise<void> | null = null

  function track<T extends Resource>(resource: T): T {
    resources.push(resource)
    return resource
  }

  function snapshot(state: NativeMenuState): NativeMenuState {
    return {
      ...state,
      recentFiles: state.recentFiles.map((file) => ({ ...file })),
    }
  }

  function queueSync(state: NativeMenuState): Promise<void> {
    const nextState = snapshot(state)
    // A failed native call is reported by its caller, but must not poison the
    // queue and prevent every later state update.
    syncQueue = syncQueue.then(
      () => applyState(nextState),
      () => applyState(nextState),
    )
    return syncQueue
  }

  function runAction(operation: () => Promise<boolean>, failureMessage: string): void {
    activeActionCount += 1
    void operation()
      .catch((cause: unknown) => {
        handlers.reportError(errorMessage(cause, failureMessage))
      })
      .finally(() => {
        activeActionCount -= 1
        if (activeActionCount !== 0 || !pendingState) return

        const state = pendingState
        pendingState = null
        void queueSync(state).catch((cause: unknown) => {
          handlers.reportError(errorMessage(cause, "Unable to synchronize the native menu"))
        })
      })
  }

  function action(id: string): void {
    runAction(
      () => handlers.execute(id),
      "Unable to run the selected menu command",
    )
  }

  async function commandItem(
    id: string,
    text: string,
    accelerator?: string,
  ): Promise<MenuItem> {
    const item = track(await MenuItem.new({
      id,
      text,
      accelerator,
      action,
    }))
    enabledItems.set(id, item)
    return item
  }

  async function checkItem(id: string, text: string): Promise<CheckMenuItem> {
    const item = track(await CheckMenuItem.new({
      id,
      text,
      checked: false,
      action,
    }))
    checkedItems.set(id, item)
    return item
  }

  async function predefined(
    item: Parameters<typeof PredefinedMenuItem.new>[0],
  ): Promise<PredefinedMenuItem> {
    return track(await PredefinedMenuItem.new(item))
  }

  async function separator(): Promise<PredefinedMenuItem> {
    return predefined({ item: "Separator" })
  }

  async function placeholder(id: string): Promise<MenuItem> {
    return track(await MenuItem.new({ id, text: "No actions available yet", enabled: false }))
  }

  async function buildApplicationMenu(): Promise<Submenu> {
    const items: Array<MenuItem | PredefinedMenuItem> = [
      await predefined({ item: { About: { name: "emditor", version: "0.1.0" } } }),
      await separator(),
      await predefined({ item: "Services" }),
      await separator(),
      await predefined({ item: "Hide" }),
      await predefined({ item: "HideOthers" }),
      await predefined({ item: "ShowAll" }),
      await separator(),
      await commandItem(APPLICATION_COMMAND_IDS.exit, "Quit emditor", "CmdOrCtrl+Q"),
    ]
    return track(await Submenu.new({ id: NATIVE_MENU_IDS.app, text: "emditor", items }))
  }

  async function buildFileMenu(): Promise<Submenu> {
    recentSubmenu = track(await Submenu.new({
      id: NATIVE_MENU_IDS.fileOpenRecent,
      text: "Open Recent",
      items: [],
    }))

    const items: Array<MenuItem | Submenu | PredefinedMenuItem> = [
      await commandItem(APPLICATION_COMMAND_IDS.newTab, "New Tab", "CmdOrCtrl+N"),
      await commandItem(APPLICATION_COMMAND_IDS.open, "Open File…", "CmdOrCtrl+O"),
      recentSubmenu,
      await separator(),
      await commandItem(APPLICATION_COMMAND_IDS.save, "Save", "CmdOrCtrl+S"),
      await commandItem(APPLICATION_COMMAND_IDS.saveAs, "Save As…", "CmdOrCtrl+Shift+S"),
      await separator(),
      await commandItem(APPLICATION_COMMAND_IDS.closeTab, "Close Tab", "CmdOrCtrl+W"),
    ]
    if (platform !== "macos") {
      items.push(
        await separator(),
        await commandItem(APPLICATION_COMMAND_IDS.exit, "Exit", "Alt+F4"),
      )
    }
    return track(await Submenu.new({ id: NATIVE_MENU_IDS.file, text: "File", items }))
  }

  async function buildEditMenu(): Promise<Submenu> {
    const redoAccelerator = platform === "macos" ? "CmdOrCtrl+Shift+Z" : "Ctrl+Y"
    const items = [
      await commandItem(APPLICATION_COMMAND_IDS.undo, "Undo", "CmdOrCtrl+Z"),
      await commandItem(APPLICATION_COMMAND_IDS.redo, "Redo", redoAccelerator),
      await separator(),
      await predefined({ item: "Cut" }),
      await predefined({ item: "Copy" }),
      await predefined({ item: "Paste" }),
      await predefined({ item: "SelectAll" }),
    ]
    return track(await Submenu.new({ id: NATIVE_MENU_IDS.edit, text: "Edit", items }))
  }

  async function buildViewMenu(): Promise<Submenu> {
    const items = [
      await checkItem(APPLICATION_COMMAND_IDS.editorMode, "Editor Mode"),
      await checkItem(APPLICATION_COMMAND_IDS.sourceMode, "Source Mode"),
      await checkItem(APPLICATION_COMMAND_IDS.splitMode, "Split View"),
    ]
    return track(await Submenu.new({ id: NATIVE_MENU_IDS.view, text: "View", items }))
  }

  async function buildWindowMenu(): Promise<Submenu> {
    const items = [
      await commandItem(APPLICATION_COMMAND_IDS.nextTab, "Next Tab", "CmdOrCtrl+Tab"),
      await commandItem(
        APPLICATION_COMMAND_IDS.previousTab,
        "Previous Tab",
        "CmdOrCtrl+Shift+Tab",
      ),
      await separator(),
      await commandItem(APPLICATION_COMMAND_IDS.moveTabLeft, "Move Tab Left"),
      await commandItem(APPLICATION_COMMAND_IDS.moveTabRight, "Move Tab Right"),
      await separator(),
      await predefined({ item: "Minimize" }),
      await commandItem(APPLICATION_COMMAND_IDS.closeWindow, "Close Window"),
    ]
    const submenu = track(await Submenu.new({
      id: NATIVE_MENU_IDS.window,
      text: "Window",
      items,
    }))
    if (platform === "macos") await submenu.setAsWindowsMenuForNSApp()
    return submenu
  }

  async function buildSettingsMenu(): Promise<Submenu> {
    return track(await Submenu.new({
      id: NATIVE_MENU_IDS.settings,
      text: "Settings",
      items: [await placeholder(NATIVE_MENU_IDS.placeholderSettings)],
    }))
  }

  async function buildHelpMenu(): Promise<Submenu> {
    const items = platform === "macos"
      ? [await placeholder(NATIVE_MENU_IDS.placeholderHelp)]
      : [await predefined({ item: { About: { name: "emditor", version: "0.1.0" } } })]
    const submenu = track(await Submenu.new({
      id: NATIVE_MENU_IDS.help,
      text: "Help",
      items,
    }))
    if (platform === "macos") await submenu.setAsHelpMenuForNSApp()
    return submenu
  }

  async function rebuildRecentFiles(state: NativeMenuState): Promise<void> {
    if (!recentSubmenu) return
    const signature = state.recentFiles
      .map((file) => `${file.pathKey}\u0000${file.title}\u0000${file.filePath}`)
      .join("\u0001")
    if (signature === recentSignature) return

    for (const item of recentItems) {
      await recentSubmenu.remove(item)
      await item.close()
    }
    recentItems = []

    if (state.recentFiles.length === 0) {
      const empty = await MenuItem.new({
        id: NATIVE_MENU_IDS.placeholderRecent,
        text: "No recent documents",
        enabled: false,
      })
      recentItems.push(empty)
      await recentSubmenu.append(empty)
    } else {
      for (const file of state.recentFiles) {
        const item = await MenuItem.new({
          id: recentFileMenuId(file.pathKey),
          text: file.title,
          action: () => {
            runAction(
              () => handlers.openRecent(file.filePath),
              "Unable to open the recent document",
            )
          },
        })
        recentItems.push(item)
        await recentSubmenu.append(item)
      }
    }
    recentSignature = signature
  }

  async function setEnabled(id: string, enabled: boolean): Promise<void> {
    await enabledItems.get(id)?.setEnabled(enabled)
  }

  async function setModeState(state: NativeMenuState): Promise<void> {
    const hasDocument = state.activeMode !== null
    const modeItems: Array<[string, string]> = [
      [APPLICATION_COMMAND_IDS.editorMode, "editor"],
      [APPLICATION_COMMAND_IDS.sourceMode, "source"],
      [APPLICATION_COMMAND_IDS.splitMode, "split"],
    ]
    for (const [id, mode] of modeItems) {
      const item = checkedItems.get(id)
      if (!item) continue
      await item.setEnabled(hasDocument)
      await item.setChecked(state.activeMode === mode)
    }
  }

  async function applyState(state: NativeMenuState): Promise<void> {
    if (!menu) return
    const before = previousState
    const updates: Promise<void>[] = []

    if (!before || before.canSave !== state.canSave) {
      updates.push(
        setEnabled(APPLICATION_COMMAND_IDS.save, state.canSave),
        setEnabled(APPLICATION_COMMAND_IDS.saveAs, state.canSave),
      )
    }
    if (!before || before.canCloseTab !== state.canCloseTab) {
      updates.push(setEnabled(APPLICATION_COMMAND_IDS.closeTab, state.canCloseTab))
    }
    if (!before || before.canUndo !== state.canUndo) {
      updates.push(setEnabled(APPLICATION_COMMAND_IDS.undo, state.canUndo))
    }
    if (!before || before.canRedo !== state.canRedo) {
      updates.push(setEnabled(APPLICATION_COMMAND_IDS.redo, state.canRedo))
    }
    if (!before || before.canNavigateTabs !== state.canNavigateTabs) {
      updates.push(
        setEnabled(APPLICATION_COMMAND_IDS.nextTab, state.canNavigateTabs),
        setEnabled(APPLICATION_COMMAND_IDS.previousTab, state.canNavigateTabs),
      )
    }
    if (!before || before.canMoveTabLeft !== state.canMoveTabLeft) {
      updates.push(setEnabled(APPLICATION_COMMAND_IDS.moveTabLeft, state.canMoveTabLeft))
    }
    if (!before || before.canMoveTabRight !== state.canMoveTabRight) {
      updates.push(setEnabled(APPLICATION_COMMAND_IDS.moveTabRight, state.canMoveTabRight))
    }
    if (!before || before.activeMode !== state.activeMode) updates.push(setModeState(state))

    await Promise.all(updates)
    await rebuildRecentFiles(state)
    previousState = snapshot(state)
  }

  async function sync(state: NativeMenuState): Promise<void> {
    if (activeActionCount > 0) {
      // Mutating a GTK native menu from inside its own action callback can
      // redraw the webview. Retain only the newest state and apply it once the
      // command (including any file I/O) has finished.
      pendingState = snapshot(state)
      return
    }
    await queueSync(state)
  }

  async function install(state: NativeMenuState): Promise<void> {
    if (!available()) return
    if (disposePromise) {
      await disposePromise
      disposePromise = null
    }
    if (activeNativeMenuController && activeNativeMenuController !== controller) {
      await activeNativeMenuController.dispose()
    }
    if (menu) {
      activeNativeMenuController = controller
      await sync(state)
      return
    }

    try {
      const submenus: Submenu[] = []
      if (platform === "macos") submenus.push(await buildApplicationMenu())
      submenus.push(
        await buildFileMenu(),
        await buildEditMenu(),
        await buildViewMenu(),
        await buildWindowMenu(),
        await buildSettingsMenu(),
        await buildHelpMenu(),
      )
      menu = track(await Menu.new({ id: "emditor_main_menu", items: submenus }))
      const previous = await menu.setAsAppMenu()
      await previous?.close()
      await sync(state)
      activeNativeMenuController = controller
    } catch (cause: unknown) {
      handlers.reportError(errorMessage(cause, "Unable to create the native application menu"))
      await closeResources()
      throw cause
    }
  }

  async function closeResources(): Promise<void> {
    const closing = [...recentItems, ...resources.reverse()]
    recentItems = []
    resources.length = 0
    for (const resource of closing) {
      try {
        await resource.close()
      } catch {
        // Continue releasing the remaining native resources.
      }
    }
    enabledItems.clear()
    checkedItems.clear()
    recentSubmenu = null
    recentSignature = ""
    previousState = null
    pendingState = null
    activeActionCount = 0
    syncQueue = Promise.resolve()
    menu = null
  }

  function dispose(): Promise<void> {
    if (disposePromise) return disposePromise
    disposePromise = (async () => {
      if (!menu) return
      if (activeNativeMenuController === controller) {
        try {
          const empty = await Menu.new({ id: "emditor_disposed_menu", items: [] })
          const previous = await empty.setAsAppMenu()
          await previous?.close()
        } catch {
          // The app may already be shutting down and unable to replace its menu.
        }
      }
      await closeResources()
      if (activeNativeMenuController === controller) activeNativeMenuController = null
    })()
    return disposePromise
  }

  const controller: NativeMenuController = {
    install,
    sync,
    dispose,
    isInstalled: () => menu !== null,
  }
  return controller
}
