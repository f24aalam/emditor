import { onMounted, onUnmounted, ref, type Ref } from "vue"
import { Crepe } from "@milkdown/crepe"
import { commandsCtx, editorViewCtx } from "@milkdown/kit/core"
import { redoCommand, undoCommand } from "@milkdown/kit/plugin/history"
import { redoDepth, undoDepth } from "@milkdown/kit/prose/history"
import { TextSelection } from "@milkdown/kit/prose/state"
import { replaceAll } from "@milkdown/kit/utils"

import type { EditorViewportState } from "@/features/editor/model/editor.types"

const VIEWPORT_THROTTLE_MS = 150

interface UseMilkdownEditorOptions {
  root: Ref<HTMLElement | null>
  getMarkdown: () => string
  getReadonly: () => boolean
  onMarkdownChange: (markdown: string) => void
  getEditorState: () => EditorViewportState
  onEditorStateChange: (state: EditorViewportState) => void
  onHistoryStateChange: () => void
}

export interface MilkdownEditorController {
  error: Ref<string | null>
  isReady: Ref<boolean>
  setMarkdown: (markdown: string) => void
  setReadonly: (readonly: boolean) => void
  undo: () => boolean
  redo: () => boolean
  canUndo: () => boolean
  canRedo: () => boolean
}

export function useMilkdownEditor(
  options: UseMilkdownEditorOptions,
): MilkdownEditorController {
  const error = ref<string | null>(null)
  const isReady = ref(false)

  let crepe: Crepe | null = null
  let creation: Promise<void> | null = null
  let disposed = false
  let syncingExternal = false
  let persistTimer: ReturnType<typeof setTimeout> | null = null
  let lastCanUndo = false
  let lastCanRedo = false

  function scrollContainer(): HTMLElement | null {
    return options.root.value?.parentElement ?? null
  }

  function captureState(): EditorViewportState | null {
    if (!isReady.value || !crepe || options.getReadonly()) return null
    const selection = crepe.editor.action((ctx) => {
      const current = ctx.get(editorViewCtx).state.selection
      return { anchor: current.anchor, head: current.head }
    })
    const container = scrollContainer()
    return {
      selection,
      scrollTop: container?.scrollTop ?? 0,
      scrollLeft: container?.scrollLeft ?? 0,
    }
  }

  function flushState(): void {
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
    const state = captureState()
    if (state) options.onEditorStateChange(state)
  }

  function schedulePersistState(): void {
    if (persistTimer || disposed || options.getReadonly()) return
    persistTimer = setTimeout(() => {
      persistTimer = null
      const state = captureState()
      if (state) options.onEditorStateChange(state)
    }, VIEWPORT_THROTTLE_MS)
  }

  function notifyHistoryIfChanged(force = false): void {
    const nextUndo = canUndo()
    const nextRedo = canRedo()
    if (!force && nextUndo === lastCanUndo && nextRedo === lastCanRedo) return
    lastCanUndo = nextUndo
    lastCanRedo = nextRedo
    options.onHistoryStateChange()
  }

  function restoreState(): void {
    if (!crepe || options.getReadonly()) return
    const saved = options.getEditorState()
    crepe.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const max = view.state.doc.content.size
      const anchor = Math.min(saved.selection.anchor, max)
      const head = Math.min(saved.selection.head, max)
      view.dispatch(
        view.state.tr
          .setSelection(TextSelection.create(view.state.doc, anchor, head))
          .setMeta("addToHistory", false),
      )
    })
    requestAnimationFrame(() => {
      const container = scrollContainer()
      if (!container) return
      container.scrollTop = saved.scrollTop
      container.scrollLeft = saved.scrollLeft
    })
  }

  function setMarkdown(markdown: string): void {
    if (!isReady.value || !crepe || crepe.getMarkdown() === markdown) return

    syncingExternal = true
    try {
      // Passing flush = true resets ProseMirror state so external store updates
      // do not pollute the user's undo stack.
      crepe.editor.action(replaceAll(markdown, true))
    } finally {
      syncingExternal = false
    }
    notifyHistoryIfChanged()
  }

  function setReadonly(readonly: boolean): void {
    if (!isReady.value || !crepe || crepe.readonly === readonly) return
    crepe.setReadonly(readonly)
    notifyHistoryIfChanged()
  }

  function runHistoryCommand(command: typeof undoCommand | typeof redoCommand): boolean {
    if (!isReady.value || !crepe || crepe.readonly) return false

    const handled = crepe.editor.action((ctx) =>
      ctx.get(commandsCtx).call(command.key),
    )
    notifyHistoryIfChanged(true)
    return handled
  }

  function undo(): boolean {
    return runHistoryCommand(undoCommand)
  }

  function redo(): boolean {
    return runHistoryCommand(redoCommand)
  }

  function canUndo(): boolean {
    if (!isReady.value || !crepe || crepe.readonly) return false
    return crepe.editor.action((ctx) => undoDepth(ctx.get(editorViewCtx).state) > 0)
  }

  function canRedo(): boolean {
    if (!isReady.value || !crepe || crepe.readonly) return false
    return crepe.editor.action((ctx) => redoDepth(ctx.get(editorViewCtx).state) > 0)
  }

  async function initialize(): Promise<void> {
    if (!options.root.value) {
      error.value = "The Markdown editor could not find its container."
      return
    }

    const instance = new Crepe({
      root: options.root.value,
      defaultValue: options.getMarkdown(),
    })
    crepe = instance

    instance.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => {
        if (disposed || !isReady.value || syncingExternal || options.getReadonly()) {
          return
        }
        notifyHistoryIfChanged()
        if (markdown === options.getMarkdown()) return
        options.onMarkdownChange(markdown)
      })
    })

    try {
      syncingExternal = true
      await instance.create()
      if (disposed) return

      instance.setReadonly(options.getReadonly())
      isReady.value = true

      // Synchronize if props changed while asynchronous creation was in flight.
      const latestMarkdown = options.getMarkdown()
      if (instance.getMarkdown() !== latestMarkdown) {
        instance.editor.action(replaceAll(latestMarkdown, true))
      }
      restoreState()
    } catch (cause: unknown) {
      if (disposed) return
      error.value = "The Markdown editor could not be initialized."
      console.error("Failed to initialize Milkdown", cause)
      return
    } finally {
      syncingExternal = false
    }

    if (!options.getReadonly()) {
      const container = scrollContainer()
      container?.addEventListener("scroll", schedulePersistState, { passive: true })
      options.root.value?.addEventListener("keyup", schedulePersistState)
      options.root.value?.addEventListener("mouseup", schedulePersistState)
    }
    notifyHistoryIfChanged(true)
  }

  async function destroy(): Promise<void> {
    flushState()
    scrollContainer()?.removeEventListener("scroll", schedulePersistState)
    options.root.value?.removeEventListener("keyup", schedulePersistState)
    options.root.value?.removeEventListener("mouseup", schedulePersistState)
    disposed = true

    try {
      await creation
    } catch {
      // Initialization already exposed a user-facing error.
    }

    const instance = crepe
    crepe = null
    isReady.value = false
    notifyHistoryIfChanged(true)

    if (instance) {
      try {
        await instance.destroy()
      } catch (cause: unknown) {
        console.error("Failed to destroy Milkdown", cause)
      }
    }
  }

  onMounted(() => {
    creation = initialize()
  })

  onUnmounted(() => {
    void destroy()
  })

  return {
    error,
    isReady,
    setMarkdown,
    setReadonly,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
