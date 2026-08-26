use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{
    error::AppError,
    models::{OpenedMarkdownFile, SavedMarkdownFile},
};

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
    #[cfg(target_os = "windows")]
    let key = display.to_lowercase();
    #[cfg(not(target_os = "windows"))]
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
    if allow_missing && !Path::new(&resolved.file_path).exists() {
        return Ok(OpenedMarkdownFile {
            title: resolved.title,
            file_path: resolved.file_path,
            path_key: resolved.path_key,
            content: String::new(),
        });
    }
    let content = fs::read_to_string(&resolved.file_path).map_err(|error| {
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

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
}

pub fn write(path: &str, content: &str) -> Result<SavedMarkdownFile, AppError> {
    let resolved = resolve(path)?;
    fs::write(&resolved.file_path, content)
        .map_err(|error| AppError::new(format!("Could not write the Markdown file: {error}")))?;
    resolve(&resolved.file_path)
}
