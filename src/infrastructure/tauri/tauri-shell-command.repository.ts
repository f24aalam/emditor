import { invoke } from "@tauri-apps/api/core"

import type { ShellCommandRepository } from "@/features/menu"

export class TauriShellCommandRepository implements ShellCommandRepository {
  manage(install: boolean): Promise<void> {
    return invoke("manage_shell_commands", { install })
  }
}
