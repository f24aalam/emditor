import {
  parseThemePreferences,
  type ThemePreferences,
} from "@/features/theme/model/theme.types"
import type { useThemeStore } from "@/features/theme/stores/theme.store"

export const THEME_STORAGE_KEY = "emditor:theme"

export interface ThemeStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export interface MediaQueryListLike {
  readonly matches: boolean
  addEventListener?: (
    type: "change",
    listener: (event: { matches: boolean }) => void,
  ) => void
  removeEventListener?: (
    type: "change",
    listener: (event: { matches: boolean }) => void,
  ) => void
}

export interface UseThemeControllerOptions {
  rootElement?: HTMLElement | null
  storage?: ThemeStorage | null
  matchMedia?: ((query: string) => MediaQueryListLike) | null
}

export interface ThemeController {
  start: () => void
  stop: () => void
  apply: () => void
}

function defaultRootElement(): HTMLElement | null {
  return typeof document !== "undefined" ? document.documentElement : null
}

function defaultStorage(): ThemeStorage | null {
  try {
    return typeof globalThis.localStorage !== "undefined"
      ? globalThis.localStorage
      : null
  } catch {
    return null
  }
}

function defaultMatchMedia(): ((query: string) => MediaQueryListLike) | null {
  return typeof globalThis.matchMedia === "function"
    ? globalThis.matchMedia.bind(globalThis)
    : null
}

export function useThemeController(
  themeStore: ReturnType<typeof useThemeStore>,
  options: UseThemeControllerOptions = {},
): ThemeController {
  const getRoot = () =>
    options.rootElement !== undefined ? options.rootElement : defaultRootElement()
  const storage = options.storage !== undefined ? options.storage : defaultStorage()
  const matchMediaFn =
    options.matchMedia !== undefined ? options.matchMedia : defaultMatchMedia()

  let mediaQueryList: MediaQueryListLike | null = null
  let unsubscribeStore: (() => void) | null = null
  let started = false

  function onMediaChange(event: { matches: boolean }): void {
    themeStore.setSystemDark(event.matches)
    apply()
  }

  function hydrateFromStorage(): void {
    if (!storage) return
    try {
      const raw = storage.getItem(THEME_STORAGE_KEY)
      if (!raw) return
      const parsed = parseThemePreferences(JSON.parse(raw))
      if (parsed) {
        themeStore.setPreferences(parsed)
      }
    } catch {
      // Ignore malformed localStorage entries and keep defaults.
    }
  }

  function persistToStorage(preferences: ThemePreferences): void {
    if (!storage) return
    try {
      storage.setItem(THEME_STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // Ignore storage quota or security errors.
    }
  }

  function apply(): void {
    const root = getRoot()
    if (!root) return
    root.classList.toggle("dark", themeStore.isDark)
    root.dataset.themePreset = themeStore.preset
    root.style.colorScheme = themeStore.resolvedMode
  }

  function start(): void {
    if (started) return
    started = true

    hydrateFromStorage()

    if (matchMediaFn) {
      mediaQueryList = matchMediaFn("(prefers-color-scheme: dark)")
      themeStore.setSystemDark(Boolean(mediaQueryList.matches))
      mediaQueryList.addEventListener?.("change", onMediaChange)
    }

    apply()

    unsubscribeStore = themeStore.$subscribe(
      () => {
        apply()
        persistToStorage(themeStore.preferences)
      },
      { detached: true, flush: "sync" },
    )
  }

  function stop(): void {
    if (!started) return
    started = false
    mediaQueryList?.removeEventListener?.("change", onMediaChange)
    mediaQueryList = null
    unsubscribeStore?.()
    unsubscribeStore = null
  }

  return {
    start,
    stop,
    apply,
  }
}
