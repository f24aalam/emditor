use crate::services::shell_service;

#[tauri::command]
pub async fn manage_shell_commands(install: bool) -> Result<(), String> {
    shell_service::manage(install)
}
