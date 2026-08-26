use crate::{
    models::{OpenedMarkdownFile, SavedMarkdownFile},
    services::file_service,
};

#[tauri::command]
pub fn read_markdown_file(path: String, allow_missing: bool) -> Result<OpenedMarkdownFile, String> {
    file_service::read(&path, allow_missing).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn resolve_file_path(path: String) -> Result<SavedMarkdownFile, String> {
    file_service::resolve(&path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn write_markdown_file(path: String, content: String) -> Result<SavedMarkdownFile, String> {
    file_service::write(&path, &content).map_err(|error| error.to_string())
}
