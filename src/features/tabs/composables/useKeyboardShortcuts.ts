import { onMounted, onUnmounted } from "vue"

interface ShortcutCommands {
  activateByPosition: (position: number) => void
}

export function useKeyboardShortcuts(commands: ShortcutCommands): void {
  function onKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase()
    let handled = false

    if (
      event.altKey
      && !event.ctrlKey
      && !event.metaKey
      && !event.shiftKey
      && /^[1-9]$/.test(key)
    ) {
      commands.activateByPosition(Number(key) - 1)
      handled = true
    }

    if (handled) event.preventDefault()
  }

  onMounted(() => window.addEventListener("keydown", onKeydown))
  onUnmounted(() => window.removeEventListener("keydown", onKeydown))
}
