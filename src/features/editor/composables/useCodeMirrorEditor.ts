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

import type { EditorViewportState } from "@/features/editor/model/editor.types"

const VIEWPORT_THROTTLE_MS = 150

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
  let persistTimer: ReturnType<typeof setTimeout> | null = null
  let lastCanUndo = false
  let lastCanRedo = false

  function captureState(): EditorViewportState | null {
    if (!view) return null
    const selection = view.state.selection.main
    return {
      selection: { anchor: selection.anchor, head: selection.head },
      scrollTop: view.scrollDOM.scrollTop,
      scrollLeft: view.scrollDOM.scrollLeft,
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
    if (persistTimer || !view) return
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
    notifyHistoryIfChanged()
  }

  function undo(): boolean {
    const handled = view ? undoCommand(view) : false
    notifyHistoryIfChanged(true)
    return handled
  }

  function redo(): boolean {
    const handled = view ? redoCommand(view) : false
    notifyHistoryIfChanged(true)
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
        notifyHistoryIfChanged()
      }
      if (update.selectionSet) schedulePersistState()
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
    view.scrollDOM.addEventListener("scroll", schedulePersistState, { passive: true })
    notifyHistoryIfChanged(true)
    requestAnimationFrame(() => {
      if (!view) return
      view.scrollDOM.scrollTop = savedState.scrollTop
      view.scrollDOM.scrollLeft = savedState.scrollLeft
    })
  })

  onUnmounted(() => {
    flushState()
    view?.scrollDOM.removeEventListener("scroll", schedulePersistState)
    view?.destroy()
    view = null
    notifyHistoryIfChanged(true)
  })

  return { setValue, undo, redo, canUndo, canRedo }
}
