import { computed, ref } from "vue"
import { defineStore } from "pinia"

import {
  createDefaultEditorState,
  type DocumentEditorState,
  type DocumentTab,
  type OpenedMarkdownFile,
  type SavedMarkdownFile,
  type WorkspaceMode,
} from "@/features/tabs/model/tab.types"

export const STARTER_MARKDOWN = `# Welcome to Emditor

Start writing your Markdown document.

## Code example

\`\`\`ts
const message = 'Hello from Emditor'
console.log(message)
\`\`\`
`

export const useTabsStore = defineStore("tabs", () => {
  const tabs = ref<DocumentTab[]>([])
  const activeTabId = ref<string | null>(null)

  const activeTab = computed(
    () => tabs.value.find((tab) => tab.id === activeTabId.value) ?? null,
  )
  const hasModifiedTabs = computed(
    () => tabs.value.some((tab) => isModified(tab.id)),
  )

  function isModified(tabId: string): boolean {
    const tab = tabs.value.find((candidate) => candidate.id === tabId)
    return tab ? tab.content !== tab.lastSavedContent : false
  }

  function nextUntitledTitle(): string {
    const titles = new Set(tabs.value.map((tab) => tab.title))
    if (!titles.has("Untitled")) return "Untitled"

    let suffix = 2
    while (titles.has(`Untitled ${suffix}`)) suffix += 1
    return `Untitled ${suffix}`
  }

  function createTab(content = "", lastSavedContent = content): string {
    const id = crypto.randomUUID()
    tabs.value.push({
      id,
      title: nextUntitledTitle(),
      filePath: null,
      pathKey: null,
      content,
      lastSavedContent,
      mode: "editor",
      editorState: createDefaultEditorState(),
    })
    activeTabId.value = id
    return id
  }

  function activateTab(tabId: string): void {
    if (tabs.value.some((tab) => tab.id === tabId)) activeTabId.value = tabId
  }

  function activateRelative(offset: 1 | -1): void {
    if (tabs.value.length === 0) return
    const currentIndex = tabs.value.findIndex((tab) => tab.id === activeTabId.value)
    const baseIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = (baseIndex + offset + tabs.value.length) % tabs.value.length
    activeTabId.value = tabs.value[nextIndex]?.id ?? null
  }

  function activateByPosition(position: number): void {
    const tab = tabs.value[position]
    if (tab) activeTabId.value = tab.id
  }

  function updateContent(tabId: string, content: string): void {
    const tab = tabs.value.find((candidate) => candidate.id === tabId)
    if (tab && tab.content !== content) tab.content = content
  }

  function setMode(tabId: string, mode: WorkspaceMode): void {
    const tab = tabs.value.find((candidate) => candidate.id === tabId)
    if (tab) tab.mode = mode
  }

  function updateEditorState(
    tabId: string,
    area: keyof DocumentEditorState,
    state: DocumentEditorState[keyof DocumentEditorState],
  ): void {
    const tab = tabs.value.find((candidate) => candidate.id === tabId)
    if (!tab) return

    if (area === "preview") {
      tab.editorState.preview = state as DocumentEditorState["preview"]
      return
    }
    tab.editorState[area] = state as DocumentEditorState["source"]
  }

  function openFile(file: OpenedMarkdownFile): { id: string; created: boolean } {
    const existing = tabs.value.find((tab) => tab.pathKey === file.pathKey)
    if (existing) {
      activeTabId.value = existing.id
      return { id: existing.id, created: false }
    }

    const id = crypto.randomUUID()
    tabs.value.push({
      id,
      title: file.title,
      filePath: file.filePath,
      pathKey: file.pathKey,
      content: file.content,
      lastSavedContent: file.content,
      mode: "editor",
      editorState: createDefaultEditorState(),
    })
    activeTabId.value = id
    return { id, created: true }
  }

  function completeSave(tabId: string, file?: SavedMarkdownFile): void {
    const tab = tabs.value.find((candidate) => candidate.id === tabId)
    if (!tab) return
    if (file) {
      tab.title = file.title
      tab.filePath = file.filePath
      tab.pathKey = file.pathKey
    }
    tab.lastSavedContent = tab.content
  }

  function discardChanges(tabId: string): void {
    const tab = tabs.value.find((candidate) => candidate.id === tabId)
    if (tab) tab.content = tab.lastSavedContent
  }

  function closeTab(tabId: string): void {
    const index = tabs.value.findIndex((tab) => tab.id === tabId)
    if (index < 0) return
    const wasActive = activeTabId.value === tabId
    tabs.value.splice(index, 1)

    if (!wasActive) return
    activeTabId.value = tabs.value[index]?.id ?? tabs.value[index - 1]?.id ?? null
  }

  function reorderTabs(fromIndex: number, toIndex: number): void {
    if (
      fromIndex === toIndex
      || fromIndex < 0
      || toIndex < 0
      || fromIndex >= tabs.value.length
      || toIndex >= tabs.value.length
    ) return

    const [moved] = tabs.value.splice(fromIndex, 1)
    if (moved) tabs.value.splice(toIndex, 0, moved)
  }

  function replaceTabs(restoredTabs: DocumentTab[], restoredActiveId: string | null): void {
    tabs.value = restoredTabs
    activeTabId.value = restoredTabs.some((tab) => tab.id === restoredActiveId)
      ? restoredActiveId
      : restoredTabs[0]?.id ?? null
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    hasModifiedTabs,
    isModified,
    createTab,
    activateTab,
    activateRelative,
    activateByPosition,
    updateContent,
    setMode,
    updateEditorState,
    openFile,
    completeSave,
    discardChanges,
    closeTab,
    reorderTabs,
    replaceTabs,
  }
})
