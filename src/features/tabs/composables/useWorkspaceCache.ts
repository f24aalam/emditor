import { ref } from "vue"

export const MAX_CACHED_WORKSPACES = 6

export function useWorkspaceCache(maxSize = MAX_CACHED_WORKSPACES) {
  const cachedTabIds = ref<string[]>([])

  function touch(tabId: string): void {
    const current = cachedTabIds.value
    if (current[current.length - 1] === tabId && current.length <= maxSize) {
      return
    }
    cachedTabIds.value = [
      ...current.filter((id) => id !== tabId),
      tabId,
    ].slice(-maxSize)
  }

  function remove(tabId: string): void {
    if (!cachedTabIds.value.includes(tabId)) return
    cachedTabIds.value = cachedTabIds.value.filter((id) => id !== tabId)
  }

  function prune(validTabIds: readonly string[]): void {
    const valid = new Set(validTabIds)
    const next = cachedTabIds.value.filter((id) => valid.has(id))
    if (next.length !== cachedTabIds.value.length) {
      cachedTabIds.value = next
    }
  }

  return { cachedTabIds, touch, remove, prune }
}
