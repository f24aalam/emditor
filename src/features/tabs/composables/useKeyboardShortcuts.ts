import { onMounted, onUnmounted } from "vue"

interface ShortcutCommands {
  newTab: () => void
  closeTab: () => void
  nextTab: () => void
  previousTab: () => void
  activateByPosition: (position: number) => void
  open: () => void
  save: () => void
  saveAs: () => void
}

export function useKeyboardShortcuts(commands: ShortcutCommands): void {
  function onKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase()
    const primary = event.ctrlKey || event.metaKey
    let handled = false

    if (primary && !event.altKey) {
      if (key === "t" && !event.shiftKey) commands.newTab()
      else if (key === "w" && !event.shiftKey) commands.closeTab()
      else if (key === "o" && !event.shiftKey) commands.open()
      else if (key === "s" && event.shiftKey) commands.saveAs()
      else if (key === "s" && !event.shiftKey) commands.save()
      else if (key === "tab" && event.shiftKey) commands.previousTab()
      else if (key === "tab" && !event.shiftKey) commands.nextTab()
      else return
      handled = true
    } else if (
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
