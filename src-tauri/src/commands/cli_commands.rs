use tauri::State;

use crate::services::cli_service::{OpenRequest, OpenRequestQueue, WaitRegistry};

#[tauri::command]
pub fn drain_open_requests(queue: State<'_, OpenRequestQueue>) -> Vec<OpenRequest> {
    queue.drain()
}

#[tauri::command]
pub async fn complete_cli_wait(
    token: String,
    failed: bool,
    waits: State<'_, WaitRegistry>,
) -> Result<(), String> {
    waits.complete(&token, failed)
}
