use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use crate::{
    error::AppError,
    models::{OpenedMarkdownFile, SavedMarkdownFile},
};

const MAX_MARKDOWN_FILE_BYTES: u64 = 50 * 1024 * 1024;

fn display_title(path: &Path) -> Result<String, AppError> {
    path.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .filter(|name| !name.is_empty())
        .ok_or_else(|| AppError::new("The selected path has no filename."))
}

fn absolute_candidate(path: &Path) -> Result<PathBuf, AppError> {
    if path.is_absolute() {
        Ok(path.to_path_buf())
    } else {
        Ok(std::env::current_dir()?.join(path))
    }
}

fn normalized_path(path: &Path) -> Result<PathBuf, AppError> {
    if path.exists() {
        Ok(path.canonicalize()?)
    } else {
        let absolute = absolute_candidate(path)?;
        let parent = absolute
            .parent()
            .ok_or_else(|| AppError::new("The selected path has no parent directory."))?;
        let canonical_parent = parent.canonicalize()?;
        let name = absolute
            .file_name()
            .ok_or_else(|| AppError::new("The selected path has no filename."))?;
        Ok(canonical_parent.join(name))
    }
}

fn path_strings(path: &Path) -> (String, String) {
    let display = path.to_string_lossy().into_owned();
    #[cfg(any(target_os = "windows", target_os = "macos"))]
    let key = display.to_lowercase();
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let key = display.clone();
    (display, key)
}

pub fn resolve(path: &str) -> Result<SavedMarkdownFile, AppError> {
    let normalized = normalized_path(Path::new(path))?;
    let title = display_title(&normalized)?;
    let (file_path, path_key) = path_strings(&normalized);
    Ok(SavedMarkdownFile {
        title,
        file_path,
        path_key,
    })
}

pub fn read(path: &str, allow_missing: bool) -> Result<OpenedMarkdownFile, AppError> {
    let resolved = resolve(path)?;
    let file_path = Path::new(&resolved.file_path);
    if allow_missing && !file_path.exists() {
        return Ok(OpenedMarkdownFile {
            title: resolved.title,
            file_path: resolved.file_path,
            path_key: resolved.path_key,
            content: String::new(),
        });
    }
    let metadata = fs::metadata(file_path).map_err(|error| {
        AppError::new(format!(
            "Could not inspect the Markdown file metadata: {error}"
        ))
    })?;
    if metadata.len() > MAX_MARKDOWN_FILE_BYTES {
        return Err(AppError::new(
            "The selected file is too large to open in Emditor (maximum 50 MB).",
        ));
    }
    let content = fs::read_to_string(file_path).map_err(|error| {
        AppError::new(format!(
            "Could not read the file as UTF-8 Markdown: {error}"
        ))
    })?;
    Ok(OpenedMarkdownFile {
        title: resolved.title,
        file_path: resolved.file_path,
        path_key: resolved.path_key,
        content,
    })
}

fn atomic_write(target: &Path, content: &str) -> std::io::Result<()> {
    let parent = target.parent().ok_or_else(|| {
        std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "target path has no parent directory",
        )
    })?;
    let file_name = target
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("document.md");
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);
    let temp_path = parent.join(format!(
        ".{file_name}.emditor-{}-{nonce}.tmp",
        std::process::id()
    ));

    let write_result = (|| -> std::io::Result<()> {
        let mut temp_file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp_path)?;
        temp_file.write_all(content.as_bytes())?;
        temp_file.flush()?;
        drop(temp_file);
        fs::rename(&temp_path, target)
    })();

    if write_result.is_err() {
        let _ = fs::remove_file(&temp_path);
        fs::write(target, content)?;
    }
    Ok(())
}

pub fn write(path: &str, content: &str) -> Result<SavedMarkdownFile, AppError> {
    let resolved = resolve(path)?;
    atomic_write(Path::new(&resolved.file_path), content)
        .map_err(|error| AppError::new(format!("Could not write the Markdown file: {error}")))?;
    resolve(&resolved.file_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_directory() -> PathBuf {
        std::env::temp_dir().join(format!(
            "emditor-file-service-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
    }

    #[test]
    fn missing_cli_file_opens_blank_without_being_created() {
        let directory = test_directory();
        fs::create_dir_all(&directory).unwrap();
        let path = directory.join("future.md");

        let opened = read(path.to_str().unwrap(), true).unwrap();

        assert_eq!(opened.content, "");
        assert_eq!(opened.title, "future.md");
        assert!(!path.exists());
        fs::remove_dir(directory).unwrap();
    }

    #[test]
    fn normal_open_still_reports_a_missing_file() {
        let directory = test_directory();
        fs::create_dir_all(&directory).unwrap();
        let path = directory.join("missing.md");
        assert!(read(path.to_str().unwrap(), false).is_err());
        fs::remove_dir(directory).unwrap();
    }

    #[test]
    fn writes_and_overwrites_markdown_files_atomically() {
        let directory = test_directory();
        fs::create_dir_all(&directory).unwrap();
        let path = directory.join("notes.md");
        let path_str = path.to_str().unwrap();

        write(path_str, "# Initial").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "# Initial");

        write(path_str, "# Updated").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "# Updated");

        fs::remove_file(&path).unwrap();
        fs::remove_dir(directory).unwrap();
    }
}
