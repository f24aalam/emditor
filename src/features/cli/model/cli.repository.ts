import type { OpenRequest } from "@/features/cli/model/cli.types"

export interface CliRepository {
  listen(handler: (request: OpenRequest) => void): Promise<() => void>
  drain(): Promise<OpenRequest[]>
  completeWait(token: string, failed: boolean): Promise<void>
}
