import type { SavedMarkdownFile } from "@/features/tabs"

export type { FileDialogRepository } from "@/features/files/model/dialog.repository"
export type { FileRepository } from "@/features/files/model/file.repository"

export interface ResolvedFilePath extends SavedMarkdownFile {}

export interface RecentFile {
  title: string
  filePath: string
  pathKey: string
}
