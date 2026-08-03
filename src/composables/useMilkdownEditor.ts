import { onMounted, onUnmounted, ref, type Ref } from "vue"
import { Crepe } from "@milkdown/crepe"
import { commandsCtx } from "@milkdown/kit/core"
import { redoCommand, undoCommand } from "@milkdown/kit/plugin/history"
import { replaceAll } from "@milkdown/kit/utils"

interface UseMilkdownEditorOptions {
  root: Ref<HTMLElement | null>
  getMarkdown: () => string
  getReadonly: () => boolean
  onMarkdownChange: (markdown: string) => void
}

export interface MilkdownEditorController {
  error: Ref<string | null>
  isReady: Ref<boolean>
  setMarkdown: (markdown: string) => void
  setReadonly: (readonly: boolean) => void
  undo: () => boolean
  redo: () => boolean
}

export function useMilkdownEditor(
  options: UseMilkdownEditorOptions,
): MilkdownEditorController {
  const error = ref<string | null>(null)
  const isReady = ref(false)

  let crepe: Crepe | null = null
  let creation: Promise<void> | null = null
  let disposed = false

  function setMarkdown(markdown: string): void {
    if (!isReady.value || !crepe || crepe.getMarkdown() === markdown) return

    // Milkdown's listener will run for this action. The equality check in the
    // listener keeps this external synchronization from echoing back to Pinia.
    crepe.editor.action(replaceAll(markdown))
  }

  function setReadonly(readonly: boolean): void {
    if (!isReady.value || !crepe || crepe.readonly === readonly) return
    crepe.setReadonly(readonly)
  }

  function runHistoryCommand(command: typeof undoCommand | typeof redoCommand): boolean {
    if (!isReady.value || !crepe || crepe.readonly) return false

    return crepe.editor.action((ctx) =>
      ctx.get(commandsCtx).call(command.key),
    )
  }

  function undo(): boolean {
    return runHistoryCommand(undoCommand)
  }

  function redo(): boolean {
    return runHistoryCommand(redoCommand)
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
    } catch (cause: unknown) {
      if (disposed) return
      error.value = "The Markdown editor could not be initialized."
      console.error("Failed to initialize Milkdown", cause)
    }
  }

  async function destroy(): Promise<void> {
    disposed = true

    try {
      await creation
    } catch {
      // Initialization already exposed a user-facing error.
    }

    const instance = crepe
    crepe = null
    isReady.value = false

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
  }
}
