import { load, type Store } from "@tauri-apps/plugin-store"

import type { SessionRepository, SessionSnapshot } from "@/features/session"

const SESSION_KEY = "session"

export class TauriSessionRepository implements SessionRepository {
  private storePromise: Promise<Store> | null = null

  private store(): Promise<Store> {
    this.storePromise ??= load("emditor-state.json", { autoSave: 200 })
    return this.storePromise
  }

  async load(): Promise<unknown> {
    return (await this.store()).get<unknown>(SESSION_KEY)
  }

  async save(snapshot: SessionSnapshot): Promise<void> {
    const store = await this.store()
    await store.set(SESSION_KEY, snapshot)
    await store.save()
  }
}
