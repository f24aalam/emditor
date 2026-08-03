<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface Props {
  open: boolean
  title: string
  processing: boolean
}

defineProps<Props>()
defineEmits<{ save: []; discard: []; cancel: [] }>()
</script>

<template>
  <AlertDialog :open="open">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription>
          Your changes will be lost if you close without saving.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button
          type="button"
          variant="outline"
          :disabled="processing"
          @click="$emit('cancel')"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          :disabled="processing"
          @click="$emit('discard')"
        >
          Don’t Save
        </Button>
        <Button
          type="button"
          :disabled="processing"
          @click="$emit('save')"
        >
          Save
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
