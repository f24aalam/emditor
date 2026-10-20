import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import {
  DEFAULT_THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  parseThemePreferences,
  useThemeController,
  useThemeStore,
  type MediaQueryListLike,
  type ThemeStorage,
} from "@/features/theme"

class FakeRootElement {
  private readonly classes = new Set<string>()
  readonly dataset: Record<string, string | undefined> = {}
  readonly style: { colorScheme: string } = { colorScheme: "" }

  readonly classList = {
    toggle: (token: string, force?: boolean): boolean => {
      const shouldHave = force !== undefined ? force : !this.classes.has(token)
      if (shouldHave) {
        this.classes.add(token)
      } else {
        this.classes.delete(token)
      }
      return shouldHave
    },
    contains: (token: string): boolean => this.classes.has(token),
  }
}

class MemoryThemeStorage implements ThemeStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

class FakeMediaQueryList implements MediaQueryListLike {
  matches: boolean
  private readonly listeners = new Set<(event: { matches: boolean }) => void>()

  constructor(initialMatches = false) {
    this.matches = initialMatches
  }

  addEventListener(
    _type: "change",
    listener: (event: { matches: boolean }) => void,
  ): void {
    this.listeners.add(listener)
  }

  removeEventListener(
    _type: "change",
    listener: (event: { matches: boolean }) => void,
  ): void {
    this.listeners.delete(listener)
  }

  dispatch(matches: boolean): void {
    this.matches = matches
    for (const listener of this.listeners) {
      listener({ matches })
    }
  }
}

describe("theme feature", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it("validates theme preferences and rejects malformed values", () => {
    expect(parseThemePreferences({ mode: "dark", preset: "sepia" })).toEqual({
      mode: "dark",
      preset: "sepia",
    })
    expect(parseThemePreferences({ mode: "system", preset: "forest" })).toEqual({
      mode: "system",
      preset: "forest",
    })
    expect(parseThemePreferences({ mode: "invalid", preset: "neutral" })).toBeNull()
    expect(parseThemePreferences({ mode: "light", preset: "unknown" })).toBeNull()
    expect(parseThemePreferences(null)).toBeNull()
  })

  it("resolves system, light, and dark modes in useThemeStore", () => {
    const store = useThemeStore()
    expect(store.preferences).toEqual(DEFAULT_THEME_PREFERENCES)
    expect(store.resolvedMode).toBe("light")
    expect(store.isDark).toBe(false)

    store.setSystemDark(true)
    expect(store.resolvedMode).toBe("dark")
    expect(store.isDark).toBe(true)

    store.setMode("light")
    expect(store.resolvedMode).toBe("light")
    expect(store.isDark).toBe(false)

    store.setMode("dark")
    expect(store.resolvedMode).toBe("dark")
    expect(store.isDark).toBe(true)

    store.openDialog()
    expect(store.dialogOpen).toBe(true)
    store.closeDialog()
    expect(store.dialogOpen).toBe(false)
  })

  it("synchronizes DOM attributes, media queries, and storage in useThemeController", () => {
    const store = useThemeStore()
    const root = new FakeRootElement()
    const storage = new MemoryThemeStorage()
    const mediaQuery = new FakeMediaQueryList(true)

    storage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ mode: "system", preset: "slate" }),
    )

    const controller = useThemeController(store, {
      rootElement: root as unknown as HTMLElement,
      storage,
      matchMedia: () => mediaQuery,
    })

    controller.start()

    expect(store.preset).toBe("slate")
    expect(store.isDark).toBe(true)
    expect(root.classList.contains("dark")).toBe(true)
    expect(root.dataset.themePreset).toBe("slate")
    expect(root.style.colorScheme).toBe("dark")

    // OS switches to light mode while store.mode === "system"
    mediaQuery.dispatch(false)
    expect(store.isDark).toBe(false)
    expect(root.classList.contains("dark")).toBe(false)
    expect(root.style.colorScheme).toBe("light")

    // User selects dark mode + sepia preset
    store.setMode("dark")
    store.setPreset("sepia")
    expect(root.classList.contains("dark")).toBe(true)
    expect(root.dataset.themePreset).toBe("sepia")
    expect(JSON.parse(storage.getItem(THEME_STORAGE_KEY) ?? "{}")).toEqual({
      mode: "dark",
      preset: "sepia",
    })

    controller.stop()
  })
})
