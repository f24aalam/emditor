export type { CliRepository } from "@/features/cli/model/cli.repository"

export interface OpenRequest {
  id: string
  paths: string[]
  waitToken: string | null
}
