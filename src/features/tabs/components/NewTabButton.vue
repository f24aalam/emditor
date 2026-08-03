<script setup lang="ts">
import { Plus } from "@lucide/vue"

defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="new-tab-button"
    aria-label="New document tab"
    title="New tab (Ctrl/Cmd+N)"
    @click="$emit('click')"
  >
    <Plus class="size-4" />
  </button>
</template>
