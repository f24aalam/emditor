import { ref } from "vue"
import { defineStore } from "pinia"

import type { RecentFile } from "@/features/files/model/file.types"

const MAX_RECENT_FILES = 10

export const useFilesStore = defineStore("files", () => {
  const recentFiles = ref<RecentFile[]>([])
  const errorMessage = ref<string | null>(null)
  const busyTabIds = ref<string[]>([])

  function addRecentFile(file: RecentFile): void {
    recentFiles.value = [
      file,
      ...recentFiles.value.filter((recent) => recent.pathKey !== file.pathKey),
    ].slice(0, MAX_RECENT_FILES)
  }

  function addRecentFiles(files: readonly RecentFile[]): void {
    if (files.length === 0) return
    const seen = new Set<string>()
    const merged: RecentFile[] = []

    for (let index = files.length - 1; index >= 0; index -= 1) {
      const file = files[index]
      if (!file || seen.has(file.pathKey)) continue
      seen.add(file.pathKey)
      merged.push(file)
    }
    for (const recent of recentFiles.value) {
      if (seen.has(recent.pathKey)) continue
      seen.add(recent.pathKey)
      merged.push(recent)
    }
    recentFiles.value = merged.slice(0, MAX_RECENT_FILES)
  }

  function removeRecentFile(pathKey: string): void {
    recentFiles.value = recentFiles.value.filter((file) => file.pathKey !== pathKey)
  }

  function replaceRecentFiles(files: RecentFile[]): void {
    recentFiles.value = files.slice(0, MAX_RECENT_FILES)
  }

  function setError(message: string): void {
    errorMessage.value = message
  }

  function clearError(): void {
    errorMessage.value = null
  }

  function setBusy(tabId: string, busy: boolean): void {
    const set = new Set(busyTabIds.value)
    if (busy) set.add(tabId)
    else set.delete(tabId)
    busyTabIds.value = [...set]
  }

  return {
    recentFiles,
    errorMessage,
    busyTabIds,
    addRecentFile,
    addRecentFiles,
    removeRecentFile,
    replaceRecentFiles,
    setError,
    clearError,
    setBusy,
  }
})
