import { open, save } from "@tauri-apps/plugin-dialog"

import type { FileDialogRepository } from "@/features/files"

const MARKDOWN_FILTER = [{
  name: "Markdown",
  extensions: ["md", "markdown", "mdown", "mkd"],
}]

export class TauriFileDialogRepository implements FileDialogRepository {
  async chooseMarkdownFile(): Promise<string | null> {
    const selected = await open({
      directory: false,
      multiple: false,
      filters: MARKDOWN_FILTER,
    })
    return typeof selected === "string" ? selected : null
  }

  chooseMarkdownSavePath(suggestedName: string): Promise<string | null> {
    return save({ defaultPath: suggestedName, filters: MARKDOWN_FILTER })
  }
}
