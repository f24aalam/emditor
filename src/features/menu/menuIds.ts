export const NATIVE_MENU_IDS = {
  app: "app_menu",
  file: "file_menu",
  fileOpenRecent: "file_open_recent",
  edit: "edit_menu",
  view: "view_menu",
  window: "window_menu",
  settings: "settings_menu",
  help: "help_menu",
  placeholderSettings: "settings_no_actions",
  placeholderHelp: "help_no_actions",
  placeholderRecent: "file_no_recent",
} as const

export function recentFileMenuId(pathKey: string): string {
  return `file_open_recent_${encodeURIComponent(pathKey)}`
}
