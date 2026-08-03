import { describe, expect, it } from "vitest"

import { useWorkspaceCache } from "@/features/tabs/composables/useWorkspaceCache"

describe("workspace cache", () => {
  it("keeps recently used workspaces in LRU order", () => {
    const cache = useWorkspaceCache(3)
    cache.touch("one")
    cache.touch("two")
    cache.touch("three")
    cache.touch("one")

    expect(cache.cachedTabIds.value).toEqual(["two", "three", "one"])
  })

  it("evicts the least recently used workspace at capacity", () => {
    const cache = useWorkspaceCache(2)
    cache.touch("one")
    cache.touch("two")
    cache.touch("three")

    expect(cache.cachedTabIds.value).toEqual(["two", "three"])
  })

  it("removes closed tabs and prunes invalid restored entries", () => {
    const cache = useWorkspaceCache()
    cache.touch("one")
    cache.touch("two")
    cache.touch("three")
    cache.remove("two")
    cache.prune(["three"])

    expect(cache.cachedTabIds.value).toEqual(["three"])
  })
})
