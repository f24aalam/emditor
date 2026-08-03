import { ref } from "vue"

interface DeferredTabActivationOptions {
  getTabIds: () => readonly string[]
  getActiveTabId: () => string | null
  activate: (tabId: string) => void
  commitDelay?: number
  stepThrottle?: number
}

export function useDeferredTabActivation(options: DeferredTabActivationOptions) {
  const pendingTabId = ref<string | null>(null)
  const commitDelay = options.commitDelay ?? 160
  const stepThrottle = options.stepThrottle ?? 90
  let commitTimer: ReturnType<typeof setTimeout> | null = null
  let lastStepTime = Number.NEGATIVE_INFINITY

  function clearTimer(): void {
    if (!commitTimer) return
    clearTimeout(commitTimer)
    commitTimer = null
  }

  function cancel(): void {
    clearTimer()
    pendingTabId.value = null
    lastStepTime = Number.NEGATIVE_INFINITY
  }

  function commit(): void {
    clearTimer()
    const tabId = pendingTabId.value
    pendingTabId.value = null
    lastStepTime = Number.NEGATIVE_INFINITY
    if (tabId && options.getTabIds().includes(tabId)) options.activate(tabId)
  }

  function scheduleCommit(): void {
    clearTimer()
    if (pendingTabId.value) commitTimer = setTimeout(commit, commitDelay)
  }

  function step(direction: 1 | -1): void {
    const now = Date.now()
    if (now - lastStepTime < stepThrottle) {
      scheduleCommit()
      return
    }

    const tabIds = options.getTabIds()
    const baseId = pendingTabId.value ?? options.getActiveTabId()
    const baseIndex = tabIds.indexOf(baseId ?? "")
    if (baseIndex < 0) return
    const targetIndex = baseIndex + direction
    if (targetIndex < 0 || targetIndex >= tabIds.length) {
      scheduleCommit()
      return
    }

    pendingTabId.value = tabIds[targetIndex] ?? null
    lastStepTime = now
    scheduleCommit()
  }

  function activateImmediately(tabId: string): void {
    cancel()
    options.activate(tabId)
  }

  return {
    pendingTabId,
    step,
    commit,
    cancel,
    activateImmediately,
    dispose: cancel,
  }
}
