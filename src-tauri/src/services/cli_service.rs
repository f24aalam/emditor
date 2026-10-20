pub use emditor_cli_protocol::OpenRequest;
use emditor_cli_protocol::{parse_request_args, valid_token, wait_status_path};
use std::{
    collections::{HashMap, VecDeque},
    fs::{self, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{AppHandle, Emitter, Manager};

pub const OPEN_REQUEST_EVENT: &str = "emditor://open-request";

#[derive(Default)]
pub struct OpenRequestQueue(Mutex<VecDeque<OpenRequest>>);

impl OpenRequestQueue {
    pub fn push(&self, request: OpenRequest) {
        self.0
            .lock()
            .expect("open request queue poisoned")
            .push_back(request);
    }

    pub fn drain(&self) -> Vec<OpenRequest> {
        self.0
            .lock()
            .expect("open request queue poisoned")
            .drain(..)
            .collect()
    }
}

#[derive(Default)]
pub struct WaitRegistry(Mutex<HashMap<String, bool>>);

impl WaitRegistry {
    pub fn register(&self, token: &str) -> Result<(), String> {
        let path = secure_status_path(token)?;
        write_status(&path, &format!("waiting {}\n", std::process::id()))?;
        self.0
            .lock()
            .map_err(|_| "wait registry is unavailable".to_owned())?
            .insert(token.to_owned(), false);
        Ok(())
    }

    pub fn complete(&self, token: &str, failed: bool) -> Result<(), String> {
        let mut waits = self
            .0
            .lock()
            .map_err(|_| "wait registry is unavailable".to_owned())?;
        let recorded_failure = waits
            .remove(token)
            .ok_or_else(|| "unknown or completed wait token".to_owned())?;

        match secure_status_path_optional(token)? {
            Some(path) => write_status(
                &path,
                &format!(
                    "complete {} {}\n",
                    std::process::id(),
                    u8::from(failed || recorded_failure)
                ),
            ),
            // The CLI waiter may have exited early (e.g. via Ctrl+C) and removed its status file.
            None => Ok(()),
        }
    }

    pub fn complete_all(&self) {
        let tokens = self
            .0
            .lock()
            .map(|mut waits| waits.drain().collect::<Vec<_>>())
            .unwrap_or_default();
        for (token, failed) in tokens {
            if let Ok(Some(path)) = secure_status_path_optional(&token) {
                let _ = write_status(
                    &path,
                    &format!("complete {} {}\n", std::process::id(), u8::from(failed)),
                );
            }
        }
    }
}

fn secure_status_path_optional(token: &str) -> Result<Option<PathBuf>, String> {
    if !valid_token(token) {
        return Err("invalid wait token".into());
    }
    let path = wait_status_path(token).ok_or_else(|| "invalid wait token".to_owned())?;
    let directory = path
        .parent()
        .ok_or_else(|| "invalid wait directory".to_owned())?;
    let directory_metadata = match fs::symlink_metadata(directory) {
        Ok(meta) => meta,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("wait directory is unavailable: {error}")),
    };
    if !directory_metadata.file_type().is_dir() || directory_metadata.file_type().is_symlink() {
        return Err("wait directory must be a real directory".into());
    }
    let metadata = match fs::symlink_metadata(&path) {
        Ok(meta) => meta,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("wait status is unavailable: {error}")),
    };
    if !metadata.file_type().is_file() || metadata.file_type().is_symlink() {
        return Err("wait status must be a regular file".into());
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        let user = unsafe { libc::geteuid() };
        if directory_metadata.uid() != user || metadata.uid() != user {
            return Err("wait status is owned by another user".into());
        }
        if directory_metadata.mode() & 0o077 != 0 || metadata.mode() & 0o077 != 0 {
            return Err("wait status permissions are not user-private".into());
        }
    }
    Ok(Some(path))
}

fn secure_status_path(token: &str) -> Result<PathBuf, String> {
    secure_status_path_optional(token)?
        .ok_or_else(|| "wait status is unavailable: file does not exist".to_owned())
}

fn write_status(path: &Path, status: &str) -> Result<(), String> {
    let mut options = OpenOptions::new();
    options.write(true).truncate(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NOFOLLOW);
    }
    let mut file = options
        .open(path)
        .map_err(|error| format!("cannot update wait status: {error}"))?;
    file.write_all(status.as_bytes())
        .and_then(|_| file.flush())
        .map_err(|error| format!("cannot update wait status: {error}"))
}

pub fn request_from_args(args: &[String], cwd: &Path) -> Option<OpenRequest> {
    parse_request_args(args, cwd)
}

pub fn enqueue(app: &AppHandle, mut request: OpenRequest, notify: bool) {
    if let Some(token) = request.wait_token.clone() {
        if let Err(error) = app.state::<WaitRegistry>().register(&token) {
            eprintln!("Failed to register CLI wait token {token}: {error}");
            request.wait_token = None;
        }
    }
    app.state::<OpenRequestQueue>().push(request.clone());
    if notify {
        let _ = app.emit(OPEN_REQUEST_EVENT, request);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn queue_preserves_startup_and_forwarded_order() {
        let queue = OpenRequestQueue::default();
        for id in ["startup", "forwarded-1", "forwarded-2"] {
            queue.push(OpenRequest {
                id: id.into(),
                paths: vec![],
                wait_token: None,
            });
        }
        assert_eq!(
            queue
                .drain()
                .into_iter()
                .map(|request| request.id)
                .collect::<Vec<_>>(),
            ["startup", "forwarded-1", "forwarded-2"]
        );
        assert!(queue.drain().is_empty());
    }

    #[test]
    fn ignores_arguments_without_the_private_protocol_marker() {
        assert!(request_from_args(&["emditor-app".into()], &PathBuf::from("/tmp")).is_none());
    }

    #[cfg(unix)]
    #[test]
    fn status_files_must_be_private_regular_files() {
        use emditor_cli_protocol::wait_directory;
        use std::{
            os::unix::fs::{OpenOptionsExt, PermissionsExt},
            time::{SystemTime, UNIX_EPOCH},
        };

        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos() as u64;
        let token = format!(
            "{:08x}-0000-4000-8000-{:012x}",
            std::process::id(),
            suffix & 0xffffffffffff
        );
        let directory = wait_directory();
        fs::create_dir_all(&directory).unwrap();
        fs::set_permissions(&directory, fs::Permissions::from_mode(0o700)).unwrap();
        let path = wait_status_path(&token).unwrap();
        OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(&path)
            .unwrap();
        assert_eq!(secure_status_path(&token).unwrap(), path);

        fs::set_permissions(&path, fs::Permissions::from_mode(0o644)).unwrap();
        assert!(secure_status_path(&token).is_err());
        fs::remove_file(path).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn completing_a_wait_after_status_file_was_removed_by_ctrl_c_succeeds() {
        use emditor_cli_protocol::wait_directory;
        use std::{
            os::unix::fs::{OpenOptionsExt, PermissionsExt},
            time::{SystemTime, UNIX_EPOCH},
        };

        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos() as u64;
        let token = format!(
            "{:08x}-1111-4000-8000-{:012x}",
            std::process::id(),
            suffix & 0xffffffffffff
        );
        let directory = wait_directory();
        fs::create_dir_all(&directory).unwrap();
        fs::set_permissions(&directory, fs::Permissions::from_mode(0o700)).unwrap();
        let path = wait_status_path(&token).unwrap();
        OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(&path)
            .unwrap();

        let registry = WaitRegistry::default();
        registry.register(&token).unwrap();
        // Simulate the CLI launcher deleting its wait status file after Ctrl+C
        fs::remove_file(&path).unwrap();

        assert!(registry.complete(&token, false).is_ok());
    }
}
