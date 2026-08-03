import { invoke } from "@tauri-apps/api/core"

import type {
  FileRepository,
  ResolvedFilePath,
} from "@/features/files"
import type { OpenedMarkdownFile, SavedMarkdownFile } from "@/features/tabs"

export class TauriFileRepository implements FileRepository {
  read(path: string): Promise<OpenedMarkdownFile> {
    return invoke<OpenedMarkdownFile>("read_markdown_file", { path })
  }

  resolve(path: string): Promise<ResolvedFilePath> {
    return invoke<ResolvedFilePath>("resolve_file_path", { path })
  }

  write(path: string, content: string): Promise<SavedMarkdownFile> {
    return invoke<SavedMarkdownFile>("write_markdown_file", { path, content })
  }
}
