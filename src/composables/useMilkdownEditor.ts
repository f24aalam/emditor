import { onMounted, onUnmounted, ref, type Ref } from "vue"
import { Crepe } from "@milkdown/crepe"
import { commandsCtx, editorViewCtx } from "@milkdown/kit/core"
import { redoCommand, undoCommand } from "@milkdown/kit/plugin/history"
import { redoDepth, undoDepth } from "@milkdown/kit/prose/history"
import { TextSelection } from "@milkdown/kit/prose/state"
import { replaceAll } from "@milkdown/kit/utils"

import type { EditorViewportState } from "@/features/tabs"

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

  function scrollContainer(): HTMLElement | null {
    return options.root.value?.parentElement ?? null
  }

  function captureState(): EditorViewportState | null {
    if (!isReady.value || !crepe) return null
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

  function persistState(): void {
    const state = captureState()
    if (state) options.onEditorStateChange(state)
  }

  function restoreState(): void {
    if (!crepe) return
    const saved = options.getEditorState()
    crepe.editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const max = view.state.doc.content.size
      const anchor = Math.min(saved.selection.anchor, max)
      const head = Math.min(saved.selection.head, max)
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, anchor, head)))
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

    // Milkdown's listener will run for this action. The equality check in the
    // listener keeps this external synchronization from echoing back to Pinia.
    crepe.editor.action(replaceAll(markdown))
    options.onHistoryStateChange()
  }

  function setReadonly(readonly: boolean): void {
    if (!isReady.value || !crepe || crepe.readonly === readonly) return
    crepe.setReadonly(readonly)
  }

  function runHistoryCommand(command: typeof undoCommand | typeof redoCommand): boolean {
    if (!isReady.value || !crepe || crepe.readonly) return false

    const handled = crepe.editor.action((ctx) =>
      ctx.get(commandsCtx).call(command.key),
    )
    options.onHistoryStateChange()
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
        options.onHistoryStateChange()
        if (disposed || markdown === options.getMarkdown()) return
        options.onMarkdownChange(markdown)
      })
    })

    try {
      await instance.create()
      if (disposed) return

      isReady.value = true
      instance.setReadonly(options.getReadonly())

      // Props may have changed while the asynchronous editor creation ran.
      setMarkdown(options.getMarkdown())
      restoreState()
      const container = scrollContainer()
      container?.addEventListener("scroll", persistState, { passive: true })
      options.root.value?.addEventListener("keyup", persistState)
      options.root.value?.addEventListener("mouseup", persistState)
      options.onHistoryStateChange()
    } catch (cause: unknown) {
      if (disposed) return
      error.value = "The Markdown editor could not be initialized."
      console.error("Failed to initialize Milkdown", cause)
    }
  }

  async function destroy(): Promise<void> {
    persistState()
    scrollContainer()?.removeEventListener("scroll", persistState)
    options.root.value?.removeEventListener("keyup", persistState)
    options.root.value?.removeEventListener("mouseup", persistState)
    disposed = true

    try {
      await creation
    } catch {
      // Initialization already exposed a user-facing error.
    }

    const instance = crepe
    crepe = null
    isReady.value = false
    options.onHistoryStateChange()

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
