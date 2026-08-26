import { invoke } from "@tauri-apps/api/core"

export class TauriShellCommandRepository {
  manage(install: boolean): Promise<void> {
    return invoke("manage_shell_commands", { install })
  }
}
