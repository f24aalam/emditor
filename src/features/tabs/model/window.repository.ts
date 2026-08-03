export interface WindowRepository {
  onCloseRequested(handler: () => void): Promise<() => void>
  destroy(): Promise<void>
}
