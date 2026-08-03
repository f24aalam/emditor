<script setup lang="ts">
import { FolderOpen, Redo2, Save, SaveAll, Undo2 } from "@lucide/vue"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { useFilesStore } from "@/features/files"
import { useTabsStore } from "@/features/tabs"

const emit = defineEmits<{
  undo: []
  redo: []
  open: []
  save: []
  saveAs: []
  openRecent: [path: string]
}>()

const tabsStore = useTabsStore()
const filesStore = useFilesStore()
</script>

<template>
  <header class="editor-toolbar">
    <div class="editor-toolbar__document">
      <span class="editor-toolbar__app-name">Emditor</span>
      <span v-if="tabsStore.activeTab" class="editor-toolbar__document-name">
        {{ tabsStore.activeTab.filePath ?? tabsStore.activeTab.title }}
      </span>
    </div>

    <div class="editor-toolbar__actions">
      <ButtonGroup aria-label="Edit history">
        <Button variant="outline" size="icon" aria-label="Undo" @click="emit('undo')">
          <Undo2 />
        </Button>
        <Button variant="outline" size="icon" aria-label="Redo" @click="emit('redo')">
          <Redo2 />
        </Button>
      </ButtonGroup>

      <Separator orientation="vertical" class="mx-1 h-5" />

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm"><FolderOpen />Open</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-64">
          <DropdownMenuItem @select="emit('open')">Open file…</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Recent documents</DropdownMenuLabel>
          <DropdownMenuItem v-if="filesStore.recentFiles.length === 0" disabled>
            No recent documents
          </DropdownMenuItem>
          <DropdownMenuItem
            v-for="file in filesStore.recentFiles"
            :key="file.pathKey"
            :title="file.filePath"
            @select="emit('openRecent', file.filePath)"
          >
            <span class="truncate">{{ file.title }}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        :disabled="!tabsStore.activeTab"
        @click="emit('save')"
      >
        <Save />Save
      </Button>
      <Button
        variant="outline"
        size="icon"
        :disabled="!tabsStore.activeTab"
        aria-label="Save As"
        title="Save As (Ctrl/Cmd+Shift+S)"
        @click="emit('saveAs')"
      >
        <SaveAll />
      </Button>
    </div>
  </header>
</template>
