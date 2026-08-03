<script setup lang="ts">
import { FilePlus2, FolderOpen } from "@lucide/vue"

import { Button } from "@/components/ui/button"

defineEmits<{ new: []; open: [] }>()
</script>

<template>
  <main class="empty-workspace">
    <div class="empty-workspace__content">
      <h1>No documents open</h1>
      <p>Create a Markdown document or open one from your computer.</p>
      <div class="empty-workspace__actions">
        <Button @click="$emit('new')"><FilePlus2 />New document</Button>
        <Button variant="outline" @click="$emit('open')"><FolderOpen />Open file</Button>
      </div>
    </div>
  </main>
</template>
