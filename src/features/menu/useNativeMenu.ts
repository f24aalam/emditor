import { onUnmounted, watch, type ComputedRef, type Ref } from "vue"

import type { NativeMenuController } from "@/features/menu/nativeMenu"
import type { NativeMenuState } from "@/features/menu/menuState"
import { formatErrorMessage } from "@/shared/utils/error"

interface UseNativeMenuOptions {
  ready: Ref<boolean>
  state: ComputedRef<NativeMenuState>
  controller: NativeMenuController
  reportError: (message: string) => void
}

export function useNativeMenu(options: UseNativeMenuOptions): void {
  let stopped = false
  let queue = Promise.resolve()

  const stop = watch(
    () => options.ready.value ? options.state.value : null,
    (state) => {
      if (!state) return
      queue = queue
        .then(async () => {
          if (stopped) return
          if (options.controller.isInstalled()) await options.controller.sync(state)
          else await options.controller.install(state)
        })
        .catch((cause: unknown) => {
          options.reportError(formatErrorMessage(cause, "Unable to synchronize the native menu"))
        })
    },
    { deep: true, immediate: true },
  )

  onUnmounted(() => {
    stopped = true
    stop()
    void queue.then(() => options.controller.dispose())
  })
}
