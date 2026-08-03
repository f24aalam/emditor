import { onMounted, onUnmounted, type Ref } from "vue"
import { basicSetup } from "codemirror"
import {
  redo as redoCommand,
  redoDepth,
  undo as undoCommand,
  undoDepth,
} from "@codemirror/commands"
import { markdown } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { EditorState, Transaction } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import type { EditorViewportState } from "@/features/tabs"

interface UseCodeMirrorEditorOptions {
  root: Ref<HTMLElement | null>
  getValue: () => string
  onChange: (value: string) => void
  getEditorState: () => EditorViewportState
  onEditorStateChange: (state: EditorViewportState) => void
  onHistoryStateChange: () => void
}

export interface CodeMirrorEditorController {
  setValue: (value: string) => void
  undo: () => boolean
  redo: () => boolean
  canUndo: () => boolean
  canRedo: () => boolean
}

export function useCodeMirrorEditor(
  options: UseCodeMirrorEditorOptions,
): CodeMirrorEditorController {
  let view: EditorView | null = null

  function captureState(): EditorViewportState | null {
    if (!view) return null
    const selection = view.state.selection.main
    return {
      selection: { anchor: selection.anchor, head: selection.head },
      scrollTop: view.scrollDOM.scrollTop,
      scrollLeft: view.scrollDOM.scrollLeft,
    }
  }

  function persistState(): void {
    const state = captureState()
    if (state) options.onEditorStateChange(state)
  }

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
    options.onHistoryStateChange()
  }

  function undo(): boolean {
    const handled = view ? undoCommand(view) : false
    options.onHistoryStateChange()
    return handled
  }

  function redo(): boolean {
    const handled = view ? redoCommand(view) : false
    options.onHistoryStateChange()
    return handled
  }

  function canUndo(): boolean {
    return view ? undoDepth(view.state) > 0 : false
  }

  function canRedo(): boolean {
    return view ? redoDepth(view.state) > 0 : false
  }

  onMounted(() => {
    if (!options.root.value) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const value = update.state.doc.toString()
        if (value !== options.getValue()) options.onChange(value)
        options.onHistoryStateChange()
      }
      if (update.selectionSet) persistState()
    })

    const savedState = options.getEditorState()
    const documentLength = options.getValue().length
    const anchor = Math.min(savedState.selection.anchor, documentLength)
    const head = Math.min(savedState.selection.head, documentLength)

    view = new EditorView({
      parent: options.root.value,
      state: EditorState.create({
        doc: options.getValue(),
        selection: { anchor, head },
        extensions: [
          basicSetup,
          markdown({ codeLanguages: languages }),
          EditorView.lineWrapping,
          updateListener,
        ],
      }),
    })
    view.scrollDOM.addEventListener("scroll", persistState, { passive: true })
    options.onHistoryStateChange()
    requestAnimationFrame(() => {
      if (!view) return
      view.scrollDOM.scrollTop = savedState.scrollTop
      view.scrollDOM.scrollLeft = savedState.scrollLeft
    })
  })

  onUnmounted(() => {
    persistState()
    view?.scrollDOM.removeEventListener("scroll", persistState)
    view?.destroy()
    view = null
    options.onHistoryStateChange()
  })

  return { setValue, undo, redo, canUndo, canRedo }
}
