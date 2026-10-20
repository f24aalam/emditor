import { onMounted, onUnmounted } from "vue"

interface ShortcutCommands {
  activateByPosition: (position: number) => void
  getTabCount?: () => number
}

function isMacOS(): boolean {
  const ua = globalThis.navigator?.userAgent.toLowerCase() ?? ""
  return ua.includes("macintosh") || ua.includes("mac os")
}

export function useKeyboardShortcuts(commands: ShortcutCommands): void {
  function onKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase()
    const mac = isMacOS()
    const primarySwitchModifier = mac
      ? event.metaKey && !event.ctrlKey && !event.altKey
      : event.altKey && !event.ctrlKey && !event.metaKey

    if (
      primarySwitchModifier
      && !event.shiftKey
      && /^[1-9]$/.test(key)
    ) {
      const digit = Number(key)
      const count = commands.getTabCount?.() ?? 0
      const position = digit === 9 && count > 9 ? count - 1 : digit - 1
      commands.activateByPosition(position)
      event.preventDefault()
    }
  }

  onMounted(() => window.addEventListener("keydown", onKeydown))
  onUnmounted(() => window.removeEventListener("keydown", onKeydown))
}
