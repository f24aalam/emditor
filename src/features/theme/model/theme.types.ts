export type ThemeMode = "system" | "light" | "dark"
export type ThemePreset = "neutral" | "sepia" | "slate" | "forest"

export interface ThemePreferences {
  mode: ThemeMode
  preset: ThemePreset
}

export interface ThemePresetOption {
  value: ThemePreset
  label: string
  description: string
  swatches: {
    lightBg: string
    lightFg: string
    darkBg: string
    darkFg: string
    accent: string
  }
}

export const DEFAULT_THEME_PREFERENCES: Readonly<ThemePreferences> = {
  mode: "system",
  preset: "neutral",
}

export const THEME_PRESET_OPTIONS: readonly ThemePresetOption[] = [
  {
    value: "neutral",
    label: "Neutral",
    description: "Crisp studio grayscale with balanced contrast.",
    swatches: {
      lightBg: "#ffffff",
      lightFg: "#171717",
      darkBg: "#121212",
      darkFg: "#f5f5f5",
      accent: "#737373",
    },
  },
  {
    value: "sepia",
    label: "Sepia / Paper",
    description: "Warm book-paper ivory and espresso charcoal for prose.",
    swatches: {
      lightBg: "#fbf7ef",
      lightFg: "#2b231d",
      darkBg: "#1d1814",
      darkFg: "#efe6d8",
      accent: "#b07d4f",
    },
  },
  {
    value: "slate",
    label: "Slate",
    description: "Cool Nordic blue-slate tones for a modern code feel.",
    swatches: {
      lightBg: "#f8fafc",
      lightFg: "#0f172a",
      darkBg: "#0f172a",
      darkFg: "#e2e8f0",
      accent: "#3b82f6",
    },
  },
  {
    value: "forest",
    label: "Forest",
    description: "Soft botanical sage paper and deep pine dark mode.",
    swatches: {
      lightBg: "#f6f9f6",
      lightFg: "#16241b",
      darkBg: "#111b15",
      darkFg: "#e3ede6",
      accent: "#2e7d5b",
    },
  },
] as const

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark"
}

export function isThemePreset(value: unknown): value is ThemePreset {
  return (
    value === "neutral"
    || value === "sepia"
    || value === "slate"
    || value === "forest"
  )
}

export function parseThemePreferences(value: unknown): ThemePreferences | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null
  }
  const candidate = value as Record<string, unknown>
  if (!isThemeMode(candidate.mode) || !isThemePreset(candidate.preset)) {
    return null
  }
  return {
    mode: candidate.mode,
    preset: candidate.preset,
  }
}
