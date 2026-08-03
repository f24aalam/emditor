mod commands;
mod error;
mod models;
mod services;

use commands::file_commands::{read_markdown_file, resolve_file_path, write_markdown_file};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_markdown_file,
            resolve_file_path,
            write_markdown_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
