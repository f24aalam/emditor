import type { RecentFile } from "@/features/files"
import type { DocumentTab } from "@/features/tabs"

export interface SessionSnapshot {
  version: 1
  tabs: DocumentTab[]
  activeTabId: string | null
  recentFiles: RecentFile[]
}

export interface SessionRepository {
  load(): Promise<unknown>
  save(snapshot: SessionSnapshot): Promise<void>
}
