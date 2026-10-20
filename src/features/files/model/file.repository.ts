import type { OpenedMarkdownFile, SavedMarkdownFile } from "@/features/tabs"
import type { ResolvedFilePath } from "@/features/files/model/file.types"

export interface FileRepository {
  read(path: string, allowMissing?: boolean): Promise<OpenedMarkdownFile>
  resolve(path: string): Promise<ResolvedFilePath>
  write(path: string, content: string): Promise<SavedMarkdownFile>
}
