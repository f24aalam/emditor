export interface ShellCommandRepository {
  manage(install: boolean): Promise<void>
}
