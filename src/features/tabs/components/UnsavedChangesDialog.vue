<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
        <AlertDialogCancel :disabled="processing" @click="$emit('cancel')">
          Cancel
        </AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          :disabled="processing"
          @click="$emit('discard')"
        >
          Don’t Save
        </AlertDialogAction>
        <AlertDialogAction :disabled="processing" @click="$emit('save')">
          Save
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
