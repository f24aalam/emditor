# Emditor Architecture Guide

This file explains how to structure and extend the Emditor codebase.

Emditor is a desktop Markdown editor built with:

- Vue 3
- TypeScript
- Pinia
- Vite
- Tauri
- Rust

## Architecture

Use a feature-first architecture.

```text
Vue components
    ↓
Feature composables
    ↓
Pinia stores
    ↓
Repository interfaces
    ↓
Tauri adapters
    ↓
Rust commands and services
```

Each feature should contain the components, stores, composables, types, and logic that belong to it.

## Project Structure

```text
src/
├── app/
│   ├── App.vue
│   ├── main.ts
│   ├── router/
│   └── layouts/
│
├── views/
│   ├── WelcomeView.vue
│   ├── EditorView.vue
│   └── SettingsView.vue
│
├── features/
│   ├── editor/
│   ├── preview/
│   ├── tabs/
│   ├── workspace/
│   ├── file-system/
│   ├── search/
│   └── settings/
│
├── shared/
│   ├── components/
│   ├── composables/
│   ├── types/
│   ├── utils/
│   └── constants/
│
└── infrastructure/
    ├── tauri/
    └── persistence/

src-tauri/
└── src/
    ├── commands/
    ├── services/
    ├── models/
    ├── error.rs
    ├── lib.rs
    └── main.rs
```

## Feature Structure

A feature may use the following structure:

```text
features/editor/
├── components/
├── composables/
├── stores/
├── model/
└── index.ts
```

Only create folders that are needed. Avoid empty folders.

Use `index.ts` as the public API of a feature.

```ts
export { useEditorStore } from './stores/editor.store'
export { useEditor } from './composables/useEditor'
export type { EditorMode } from './model/editor.types'
```

Import from the feature root:

```ts
import { useEditorStore } from '@/features/editor'
```

Avoid importing internal files from another feature.

## Pinia Rules

Use Pinia only for shared application state.

Good Pinia state:

- Open documents
- Active document
- Tabs
- Workspace information
- User settings
- Recent files
- Save status

Keep local UI state inside components or composables.

Do not store these objects in Pinia:

- DOM elements
- Editor library instances
- Tauri window objects
- `AbortController`
- Other complex runtime objects

Prefer several small domain stores over one large global store.

```text
editor.store.ts
tabs.store.ts
workspace.store.ts
settings.store.ts
recent-files.store.ts
```

## Component Rules

Components should focus on presentation and user interaction.

A component may:

- Render data
- Emit events
- Call feature composables
- Read state from Pinia

A component should not:

- Call Tauri APIs directly
- Contain filesystem logic
- Contain large business rules
- Import another feature's internal files

Move reusable behavior into a composable.

## Composable Rules

Use composables for reusable frontend behavior.

Examples:

```text
useEditor.ts
useAutosave.ts
useFileOperations.ts
useKeyboardShortcuts.ts
useSearch.ts
```

Editor instances such as Milkdown or CodeMirror should live inside composables, not Pinia.

## Tauri Boundary

Vue components must not call `invoke`, filesystem APIs, dialogs, or window APIs directly.

Define an interface first:

```ts
export interface FileRepository {
  read(path: string): Promise<string>
  write(path: string, content: string): Promise<void>
  exists(path: string): Promise<boolean>
}
```

Implement the interface inside `infrastructure/tauri`.

```ts
export class TauriFileRepository implements FileRepository {
  read(path: string): Promise<string> {
    return invoke<string>('read_text_file', { path })
  }

  write(path: string, content: string): Promise<void> {
    return invoke('write_text_file', { path, content })
  }

  exists(path: string): Promise<boolean> {
    return invoke<boolean>('file_exists', { path })
  }
}
```

This keeps features independent from Tauri and makes testing easier.

## Rust Rules

Tauri commands should be small.

Commands should:

- Validate command input
- Call a Rust service
- Convert errors into a frontend-safe result
- Return the result

Business logic and filesystem logic should live in services.

```text
commands/file_commands.rs
services/file_service.rs
```

Example:

```rust
#[tauri::command]
pub async fn read_text_file(path: String) -> Result<String, String> {
    file_service::read_text_file(&path)
        .await
        .map_err(|error| error.to_string())
}
```

## Data Flow

Use one-directional data flow.

```text
User action
    ↓
Vue component
    ↓
Feature composable
    ↓
Pinia action or repository
    ↓
Tauri command
    ↓
Rust service
    ↓
Pinia state update
    ↓
UI update
```

Example save flow:

```text
Ctrl+S
    ↓
useKeyboardShortcuts()
    ↓
useFileOperations().saveActiveDocument()
    ↓
FileRepository.write()
    ↓
Tauri command
    ↓
Rust file service
    ↓
editorStore.markSaved()
```

## Router Rules

Use Vue Router only for real application screens.

Recommended routes:

```text
/           Welcome screen
/editor     Editor screen
/settings   Settings screen
/about      About screen
```

Do not use routes for editor modes such as source, preview, or split.

Store editor mode as state:

```ts
export type EditorMode = 'source' | 'preview' | 'split'
```

## Dependency Rules

Follow these import boundaries:

```text
views
  may import features and shared

features
  may import shared and repository interfaces

infrastructure
  may implement feature repository interfaces

shared
  must not import features

components
  must not call Tauri directly

stores
  must not contain editor or DOM instances

Rust commands
  must not contain large business logic
```

## TypeScript Rules

- Use strict TypeScript.
- Avoid `any`.
- Prefer explicit return types for exported functions.
- Use interfaces for repository contracts.
- Keep feature-specific types inside the feature.
- Put truly reusable types inside `shared/types`.
- Validate data received from external sources.

## Naming

Use clear and consistent names.

```text
MarkdownEditor.vue
EditorToolbar.vue
editor.store.ts
useEditor.ts
file.repository.ts
tauri-file.repository.ts
file_commands.rs
file_service.rs
```

Recommended conventions:

- Vue components: `PascalCase.vue`
- Composables: `useSomething.ts`
- Pinia stores: `something.store.ts`
- TypeScript types: `something.types.ts`
- Repository interfaces: `something.repository.ts`
- Tauri implementations: `tauri-something.repository.ts`

## Testing

Test important logic outside Vue components.

Prioritize tests for:

- Store actions
- Dirty-state detection
- Autosave behavior
- File repository implementations
- Markdown transformations
- Search and replace
- Rust services

Repository interfaces should be replaceable with mock implementations in tests.

## Adding a New Feature

When adding a feature:

1. Create a folder inside `src/features`.
2. Add only the folders the feature needs.
3. Keep its UI, state, types, and behavior together.
4. Expose its public API through `index.ts`.
5. Use repository interfaces for external operations.
6. Keep Tauri-specific code in `infrastructure`.
7. Keep Rust commands thin.
8. Add tests for important behavior.

## Keep It Simple

Do not introduce extra layers without a clear need.

Start with:

```text
components
composables
stores
model
repository interface
Tauri implementation
Rust command
Rust service
```

Split a module only when it becomes difficult to understand or maintain.
