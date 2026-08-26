import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"

import type { CliRepository, OpenRequest } from "@/features/cli"

const OPEN_REQUEST_EVENT = "emditor://open-request"

export class TauriCliRepository implements CliRepository {
  async listen(handler: (request: OpenRequest) => void): Promise<() => void> {
    return listen<OpenRequest>(OPEN_REQUEST_EVENT, (event) => handler(event.payload))
  }

  drain(): Promise<OpenRequest[]> {
    return invoke<OpenRequest[]>("drain_open_requests")
  }

  completeWait(token: string, failed: boolean): Promise<void> {
    return invoke("complete_cli_wait", { token, failed })
  }
}
