export interface FileDialogRepository {
  chooseMarkdownFile(): Promise<string | null>
  chooseMarkdownSavePath(suggestedName: string): Promise<string | null>
}
