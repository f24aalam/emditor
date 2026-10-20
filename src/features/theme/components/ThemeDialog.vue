<script setup lang="ts">
import { Check, Monitor, Moon, Sun } from "@lucide/vue"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  THEME_PRESET_OPTIONS,
  type ThemeMode,
  type ThemePreset,
} from "@/features/theme/model/theme.types"

interface Props {
  open: boolean
  mode: ThemeMode
  preset: ThemePreset
}

const props = defineProps<Props>()
const emit = defineEmits<{
  "update:open": [open: boolean]
  "select-mode": [mode: ThemeMode]
  "select-preset": [preset: ThemePreset]
}>()

const modeOptions: ReadonlyArray<{
  value: ThemeMode
  label: string
  icon: typeof Sun
}> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

function onOpenChange(nextOpen: boolean): void {
  emit("update:open", nextOpen)
}
</script>

<template>
  <AlertDialog :open="props.open" @update:open="onOpenChange">
    <AlertDialogContent class="sm:max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle>Appearance &amp; Theme</AlertDialogTitle>
        <AlertDialogDescription>
          Choose how Emditor looks across the workspace, WYSIWYG editor, and Markdown source view.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div class="grid gap-4 py-1">
        <div class="grid gap-2">
          <span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Mode
          </span>
          <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Appearance mode">
            <button
              v-for="option in modeOptions"
              :key="option.value"
              type="button"
              role="radio"
              :aria-checked="props.mode === option.value"
              class="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :class="
                props.mode === option.value
                  ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                  : 'border-border bg-background text-foreground hover:bg-muted'
              "
              @click="emit('select-mode', option.value)"
            >
              <component :is="option.icon" class="size-3.5 shrink-0" />
              <span>{{ option.label }}</span>
            </button>
          </div>
        </div>

        <div class="grid gap-2">
          <span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Color Preset
          </span>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Color preset">
            <button
              v-for="item in THEME_PRESET_OPTIONS"
              :key="item.value"
              type="button"
              role="radio"
              :aria-checked="props.preset === item.value"
              class="flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :class="
                props.preset === item.value
                  ? 'border-foreground bg-accent/70 text-foreground ring-1 ring-foreground/20'
                  : 'border-border bg-background text-foreground hover:bg-muted/60'
              "
              @click="emit('select-preset', item.value)"
            >
              <div class="flex w-full items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span
                    class=" inline-flex h-4 w-7 overflow-hidden rounded-full border border-black/15 shadow-2xs dark:border-white/20"
                    aria-hidden="true"
                  >
                    <span
                      class="h-full w-1/2"
                      :style="{ backgroundColor: item.swatches.lightBg }"
                    />
                    <span
                      class="h-full w-1/2"
                      :style="{ backgroundColor: item.swatches.darkBg }"
                    />
                  </span>
                  <span class="text-xs font-semibold">{{ item.label }}</span>
                </div>
                <Check
                  v-if="props.preset === item.value"
                  class="size-3.5 shrink-0 text-foreground"
                />
              </div>
              <p class="text-[11px] leading-snug text-muted-foreground">
                {{ item.description }}
              </p>
            </button>
          </div>
        </div>
      </div>

      <AlertDialogFooter>
        <Button type="button" @click="emit('update:open', false)">
          Done
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
