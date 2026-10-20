<script setup lang="ts">
import { CircleAlert, X } from "@lucide/vue"

import { useApplicationBootstrap } from "@/app/useApplicationBootstrap"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { APPLICATION_COMMAND_IDS } from "@/features/commands"
import { EditorModeSwitcher } from "@/features/editor"
import {
  ActiveDocumentWorkspace,
  EmptyWorkspace,
  TabBar,
  UnsavedChangesDialog,
} from "@/features/tabs"

const {
  tabsStore,
  filesStore,
  workspace,
  ready,
  closeGuard,
  run,
  selectMode,
  notifyHistoryStateChange,
} = useApplicationBootstrap()
</script>

<template>
  <div class="app-shell">
    <TabBar
      @new="run(APPLICATION_COMMAND_IDS.newTab)"
      @close="closeGuard.requestClose"
    >
      <template #actions>
        <EditorModeSwitcher
          :active-mode="tabsStore.activeTab?.mode ?? null"
          @select="selectMode"
        />
      </template>
    </TabBar>

    <Alert v-if="filesStore.errorMessage" variant="destructive" class="file-error-banner">
      <CircleAlert />
      <AlertTitle>Document operation failed</AlertTitle>
      <AlertDescription>{{ filesStore.errorMessage }}</AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Dismiss error"
        @click="filesStore.clearError"
      >
        <X />
      </Button>
    </Alert>

    <div v-if="!ready" class="workspace-loading" role="status">Restoring workspace…</div>
    <ActiveDocumentWorkspace
      v-else-if="tabsStore.activeTab"
      ref="workspace"
      @history-state-change="notifyHistoryStateChange"
    />
    <EmptyWorkspace
      v-else
      @new="run(APPLICATION_COMMAND_IDS.newTab)"
      @open="run(APPLICATION_COMMAND_IDS.open)"
    />

    <UnsavedChangesDialog
      v-if="closeGuard.dialogOpen.value"
      :open="closeGuard.dialogOpen.value"
      :title="closeGuard.dialogTitle.value"
      :processing="closeGuard.processing.value"
      @save="closeGuard.saveAndContinue"
      @discard="closeGuard.discardAndContinue"
      @cancel="closeGuard.cancel"
    />
  </div>
</template>
