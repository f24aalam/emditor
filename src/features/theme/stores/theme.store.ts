import { computed, ref } from "vue"
import { defineStore } from "pinia"

import {
  DEFAULT_THEME_PREFERENCES,
  type ThemeMode,
  type ThemePreferences,
  type ThemePreset,
} from "@/features/theme/model/theme.types"

export const useThemeStore = defineStore("theme", () => {
  const mode = ref<ThemeMode>(DEFAULT_THEME_PREFERENCES.mode)
  const preset = ref<ThemePreset>(DEFAULT_THEME_PREFERENCES.preset)
  const systemDark = ref(false)
  const dialogOpen = ref(false)

  const resolvedMode = computed<"light" | "dark">(() => {
    if (mode.value === "system") {
      return systemDark.value ? "dark" : "light"
    }
    return mode.value
  })

  const isDark = computed(() => resolvedMode.value === "dark")

  const preferences = computed<ThemePreferences>(() => ({
    mode: mode.value,
    preset: preset.value,
  }))

  function setMode(nextMode: ThemeMode): void {
    mode.value = nextMode
  }

  function setPreset(nextPreset: ThemePreset): void {
    preset.value = nextPreset
  }

  function setPreferences(next: ThemePreferences): void {
    mode.value = next.mode
    preset.value = next.preset
  }

  function setSystemDark(nextSystemDark: boolean): void {
    systemDark.value = nextSystemDark
  }

  function openDialog(): void {
    dialogOpen.value = true
  }

  function closeDialog(): void {
    dialogOpen.value = false
  }

  function setDialogOpen(nextOpen: boolean): void {
    dialogOpen.value = nextOpen
  }

  return {
    mode,
    preset,
    systemDark,
    dialogOpen,
    resolvedMode,
    isDark,
    preferences,
    setMode,
    setPreset,
    setPreferences,
    setSystemDark,
    openDialog,
    closeDialog,
    setDialogOpen,
  }
})
