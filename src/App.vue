<script setup lang="ts">
import {
  computed,
  nextTick,
  ref,
} from "vue"
import {
  Bold,
  Check,
  Code2,
  FilePenLine,
  FileText,
  Italic,
  Link,
  List,
  ListOrdered,
  Menu,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Quote,
  Save,
} from "@lucide/vue"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DocumentItem {
  id: number
  title: string
  content: string
  saved: boolean
}

const documents = ref<DocumentItem[]>([
  {
    id: 1,
    title: "Welcome.md",
    saved: true,
    content: `# Welcome to Emditor

A calm, focused place for your Markdown notes.

## Start writing

- Create documents from the sidebar
- Use the toolbar for common Markdown formatting
- Keep your ideas close and distraction-free

> Simple on the surface. Powerful when you need it.
`,
  },
  {
    id: 2,
    title: "Product notes.md",
    saved: true,
    content: `# Product notes

Emditor is designed for fast, focused Markdown editing across desktop and mobile.
`,
  },
  {
    id: 3,
    title: "Ideas.md",
    saved: true,
    content: `# Ideas

- Command palette
- Live Markdown preview
- Local-first document storage
`,
  },
])

const activeDocumentId = ref(1)
const sidebarOpen = ref(false)
let nextDocumentId = 4

const activeDocument = computed(() =>
  documents.value.find((document) => document.id === activeDocumentId.value),
)

const editorContent = computed({
  get: () => activeDocument.value?.content ?? "",
  set: (value: string) => {
    if (!activeDocument.value) return
    activeDocument.value.content = value
    activeDocument.value.saved = false
  },
})

const wordCount = computed(() => {
  const text = editorContent.value.trim()
  return text ? text.split(/\s+/).length : 0
})

const lineCount = computed(() => editorContent.value.split("\n").length)

function selectDocument(id: number) {
  activeDocumentId.value = id
  sidebarOpen.value = false
}

function createDocument() {
  const id = nextDocumentId++
  documents.value.push({
    id,
    title: `Untitled ${id - 3}.md`,
    content: "# Untitled\n\nStart writing...\n",
    saved: false,
  })
  selectDocument(id)
}

function saveDocument() {
  if (activeDocument.value) activeDocument.value.saved = true
}

function duplicateDocument() {
  if (!activeDocument.value) return

  const id = nextDocumentId++
  documents.value.push({
    ...activeDocument.value,
    id,
    title: activeDocument.value.title.replace(/\.md$/, " copy.md"),
    saved: false,
  })
  selectDocument(id)
}

function deleteDocument() {
  if (!activeDocument.value || documents.value.length === 1) return

  const activeIndex = documents.value.findIndex(
    (document) => document.id === activeDocumentId.value,
  )
  documents.value.splice(activeIndex, 1)
  const nextActive = documents.value[Math.min(activeIndex, documents.value.length - 1)]
  activeDocumentId.value = nextActive.id
}

async function applyFormat(prefix: string, suffix = prefix, placeholder = "text") {
  const textarea = document.getElementById("markdown-editor") as HTMLTextAreaElement | null
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = editorContent.value.slice(start, end) || placeholder
  editorContent.value =
    editorContent.value.slice(0, start) +
    prefix +
    selectedText +
    suffix +
    editorContent.value.slice(end)

  await nextTick()
  textarea.focus()
  textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length)
}

async function applyLinePrefix(prefix: string) {
  const textarea = document.getElementById("markdown-editor") as HTMLTextAreaElement | null
  if (!textarea) return

  const start = textarea.selectionStart
  const lineStart = editorContent.value.lastIndexOf("\n", Math.max(0, start - 1)) + 1
  editorContent.value =
    editorContent.value.slice(0, lineStart) + prefix + editorContent.value.slice(lineStart)

  await nextTick()
  textarea.focus()
  textarea.setSelectionRange(start + prefix.length, start + prefix.length)
}
</script>

<template>
  <TooltipProvider :delay-duration="250">
    <div class="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header class="flex h-14 shrink-0 items-center border-b px-3 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          class="mr-1 md:hidden"
          aria-label="Open document sidebar"
          @click="sidebarOpen = true"
        >
          <Menu class="size-4" />
        </Button>

        <div class="flex min-w-0 items-center gap-2">
          <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FilePenLine class="size-4" />
          </div>
          <span class="hidden font-semibold tracking-tight sm:inline">Emditor</span>
          <Separator orientation="vertical" class="mx-1 hidden h-5 sm:block" />
          <span class="truncate text-sm text-muted-foreground">
            {{ activeDocument?.title }}
          </span>
          <span
            v-if="activeDocument && !activeDocument.saved"
            class="size-1.5 shrink-0 rounded-full bg-amber-500"
            title="Unsaved draft"
          />
        </div>

        <div class="ml-auto flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="sm"
                :disabled="activeDocument?.saved"
                class="gap-2"
                @click="saveDocument"
              >
                <Check v-if="activeDocument?.saved" class="size-4" />
                <Save v-else class="size-4" />
                <span class="hidden sm:inline">{{ activeDocument?.saved ? "Saved" : "Save" }}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mark this draft as saved</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon" aria-label="Document actions">
                <MoreHorizontal class="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click="duplicateDocument">Duplicate document</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                class="text-destructive focus:text-destructive"
                :disabled="documents.length === 1"
                @click="deleteDocument"
              >
                Delete document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div class="flex min-h-0 flex-1">
        <button
          v-if="sidebarOpen"
          class="fixed inset-0 top-14 z-20 bg-black/35 md:hidden"
          aria-label="Close document sidebar"
          @click="sidebarOpen = false"
        />

        <aside
          :class="[
            'fixed inset-y-0 left-0 top-14 z-30 flex w-72 flex-col border-r bg-background transition-transform md:static md:z-auto md:w-64 md:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          ]"
        >
          <div class="flex items-center justify-between px-3 py-3">
            <div class="flex items-center gap-2 text-sm font-medium">
              <PanelLeft class="size-4 text-muted-foreground" />
              Documents
            </div>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon" class="size-8" aria-label="New document" @click="createDocument">
                  <Plus class="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New document</TooltipContent>
            </Tooltip>
          </div>
          <Separator />

          <ScrollArea class="min-h-0 flex-1 px-2 py-2">
            <div class="space-y-1">
              <Button
                v-for="item in documents"
                :key="item.id"
                :variant="item.id === activeDocumentId ? 'secondary' : 'ghost'"
                class="h-9 w-full justify-start gap-2 px-2 font-normal"
                @click="selectDocument(item.id)"
              >
                <FileText class="size-4 shrink-0 text-muted-foreground" />
                <span class="min-w-0 flex-1 truncate text-left">{{ item.title }}</span>
                <span v-if="!item.saved" class="size-1.5 shrink-0 rounded-full bg-amber-500" />
              </Button>
            </div>
          </ScrollArea>

          <div class="border-t px-3 py-3 text-xs text-muted-foreground">
            {{ documents.length }} {{ documents.length === 1 ? "document" : "documents" }}
          </div>
        </aside>

        <main class="flex min-w-0 flex-1 flex-col bg-muted/15">
          <div class="flex h-12 shrink-0 items-center gap-0.5 overflow-x-auto border-b bg-background px-2 sm:px-3">
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon" class="size-8" aria-label="Bold" @click="applyFormat('**')">
                  <Bold class="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bold</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon" class="size-8" aria-label="Italic" @click="applyFormat('_')">
                  <Italic class="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Italic</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon" class="size-8" aria-label="Inline code" @click="applyFormat('`', '`', 'code')">
                  <Code2 class="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Inline code</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon" class="size-8" aria-label="Link" @click="applyFormat('[', '](https://)', 'link text')">
                  <Link class="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Link</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" class="mx-1 h-5" />

            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon" class="size-8" aria-label="Bullet list" @click="applyLinePrefix('- ')">
                  <List class="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bullet list</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon" class="size-8" aria-label="Numbered list" @click="applyLinePrefix('1. ')">
                  <ListOrdered class="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Numbered list</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger as-child>
                <Button variant="ghost" size="icon" class="size-8" aria-label="Blockquote" @click="applyLinePrefix('> ')">
                  <Quote class="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Blockquote</TooltipContent>
            </Tooltip>
          </div>

          <div class="min-h-0 flex-1 bg-background">
            <Textarea
              id="markdown-editor"
              v-model="editorContent"
              spellcheck="true"
              aria-label="Markdown editor"
              class="h-full min-h-full resize-none rounded-none border-0 bg-transparent px-5 py-5 font-mono text-[15px] leading-7 shadow-none focus-visible:ring-0 sm:px-8 sm:py-7 lg:px-12 xl:px-20"
            />
          </div>

          <footer class="flex h-8 shrink-0 items-center gap-3 border-t bg-background px-3 text-xs text-muted-foreground sm:px-4">
            <span>Markdown</span>
            <span class="ml-auto">{{ lineCount }} lines</span>
            <span>{{ wordCount }} words</span>
          </footer>
        </main>
      </div>
    </div>
  </TooltipProvider>
</template>
