import { afterEach, describe, expect, it, vi } from "vitest"

import { useDeferredTabActivation } from "@/features/tabs/composables/useDeferredTabActivation"

afterEach(() => vi.useRealTimers())

describe("deferred tab activation", () => {
  function setup(initial = "one") {
    vi.useFakeTimers()
    const tabIds = ["one", "two", "three", "four"]
    let activeTabId = initial
    const activations: string[] = []
    const controller = useDeferredTabActivation({
      getTabIds: () => tabIds,
      getActiveTabId: () => activeTabId,
      activate: (tabId) => {
        activeTabId = tabId
        activations.push(tabId)
      },
    })
    return { tabIds, activations, controller, active: () => activeTabId }
  }

  it("commits only the final tab reached by a rapid wheel gesture", () => {
    const { activations, controller } = setup()
    controller.step(1)
    vi.advanceTimersByTime(100)
    controller.step(1)
    vi.advanceTimersByTime(100)
    controller.step(1)

    expect(controller.pendingTabId.value).toBe("four")
    expect(activations).toEqual([])
    vi.advanceTimersByTime(160)
    expect(activations).toEqual(["four"])
  })

  it("stops at the first and last tabs", () => {
    const { activations, controller } = setup("four")
    controller.step(1)
    vi.advanceTimersByTime(200)
    expect(activations).toEqual([])

    controller.activateImmediately("one")
    controller.step(-1)
    vi.advanceTimersByTime(200)
    expect(activations).toEqual(["one"])
  })

  it("cancels a pending wheel target for immediate activation", () => {
    const { activations, controller } = setup()
    controller.step(1)
    controller.activateImmediately("four")
    vi.advanceTimersByTime(200)

    expect(controller.pendingTabId.value).toBeNull()
    expect(activations).toEqual(["four"])
  })

  it("does not commit a tab removed before the timer fires", () => {
    const { tabIds, activations, controller } = setup()
    controller.step(1)
    tabIds.splice(1, 1)
    vi.advanceTimersByTime(160)

    expect(activations).toEqual([])
  })
})
