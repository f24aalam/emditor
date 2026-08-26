mod cli_requests;
mod commands;
mod error;
mod models;
mod services;
mod shell_commands;

use cli_requests::{complete_cli_wait, drain_open_requests, OpenRequestQueue, WaitRegistry};
use commands::file_commands::{read_markdown_file, resolve_file_path, write_markdown_file};
use shell_commands::manage_shell_commands;
use std::path::PathBuf;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let startup_request = cli_requests::request_from_args(
        &std::env::args().collect::<Vec<_>>(),
        &std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")),
    );

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            if let Some(request) =
                cli_requests::request_from_args(&args, std::path::Path::new(&cwd))
            {
                cli_requests::enqueue(app, request, true);
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .manage(OpenRequestQueue::default())
        .manage(WaitRegistry::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            if let Some(request) = startup_request {
                cli_requests::enqueue(app.handle(), request, false);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            complete_cli_wait,
            drain_open_requests,
            manage_shell_commands,
            read_markdown_file,
            resolve_file_path,
            write_markdown_file
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|handle, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            handle.state::<WaitRegistry>().complete_all();
        }
    });
}
