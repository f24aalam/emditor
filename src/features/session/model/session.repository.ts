import type { SessionSnapshot } from "@/features/session/model/session.types"

export interface SessionRepository {
  load(): Promise<unknown>
  save(snapshot: SessionSnapshot): Promise<void>
}
