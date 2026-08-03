import { getCurrentWindow } from "@tauri-apps/api/window"

import type { WindowRepository } from "@/features/tabs"

export class TauriWindowRepository implements WindowRepository {
  onCloseRequested(handler: () => void): Promise<() => void> {
    return getCurrentWindow().onCloseRequested((event) => {
      event.preventDefault()
      handler()
    })
  }

  destroy(): Promise<void> {
    return getCurrentWindow().destroy()
  }
}
