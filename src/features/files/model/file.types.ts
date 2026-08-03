import type { OpenedMarkdownFile, SavedMarkdownFile } from "@/features/tabs"

export interface ResolvedFilePath extends SavedMarkdownFile {}

export interface FileRepository {
  read(path: string): Promise<OpenedMarkdownFile>
  resolve(path: string): Promise<ResolvedFilePath>
  write(path: string, content: string): Promise<SavedMarkdownFile>
}

export interface FileDialogRepository {
  chooseMarkdownFile(): Promise<string | null>
  chooseMarkdownSavePath(suggestedName: string): Promise<string | null>
}

export interface RecentFile {
  title: string
  filePath: string
  pathKey: string
}
