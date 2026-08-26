export interface OpenRequest {
  id: string
  paths: string[]
  waitToken: string | null
}

export interface CliRepository {
  listen(handler: (request: OpenRequest) => void): Promise<() => void>
  drain(): Promise<OpenRequest[]>
  completeWait(token: string, failed: boolean): Promise<void>
}
