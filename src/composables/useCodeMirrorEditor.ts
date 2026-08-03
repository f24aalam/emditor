import { onMounted, onUnmounted, type Ref } from "vue"
import { basicSetup } from "codemirror"
import { redo as redoCommand, undo as undoCommand } from "@codemirror/commands"
import { markdown } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { EditorState, Transaction } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

interface UseCodeMirrorEditorOptions {
  root: Ref<HTMLElement | null>
  getValue: () => string
  onChange: (value: string) => void
}

export interface CodeMirrorEditorController {
  setValue: (value: string) => void
  undo: () => boolean
  redo: () => boolean
}

export function useCodeMirrorEditor(
  options: UseCodeMirrorEditorOptions,
): CodeMirrorEditorController {
  let view: EditorView | null = null

  function setValue(value: string): void {
    if (!view || view.state.doc.toString() === value) return

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value,
      },
      // Store-driven replacements should not become user undo entries.
      annotations: Transaction.addToHistory.of(false),
    })
  }

  function undo(): boolean {
    return view ? undoCommand(view) : false
  }

  function redo(): boolean {
    return view ? redoCommand(view) : false
  }

  onMounted(() => {
    if (!options.root.value) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return

      const value = update.state.doc.toString()
      if (value !== options.getValue()) options.onChange(value)
    })

    view = new EditorView({
      parent: options.root.value,
      state: EditorState.create({
        doc: options.getValue(),
        extensions: [
          basicSetup,
          markdown({ codeLanguages: languages }),
          EditorView.lineWrapping,
          updateListener,
        ],
      }),
    })
  })

  onUnmounted(() => {
    view?.destroy()
    view = null
  })

  return { setValue, undo, redo }
}
