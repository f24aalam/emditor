import { ref } from "vue"

export const MAX_CACHED_WORKSPACES = 6

export function useWorkspaceCache(maxSize = MAX_CACHED_WORKSPACES) {
  const cachedTabIds = ref<string[]>([])

  function touch(tabId: string): void {
    cachedTabIds.value = [
      ...cachedTabIds.value.filter((id) => id !== tabId),
      tabId,
    ].slice(-maxSize)
  }

  function remove(tabId: string): void {
    cachedTabIds.value = cachedTabIds.value.filter((id) => id !== tabId)
  }

  function prune(validTabIds: readonly string[]): void {
    const valid = new Set(validTabIds)
    cachedTabIds.value = cachedTabIds.value.filter((id) => valid.has(id))
  }

  return { cachedTabIds, touch, remove, prune }
}
