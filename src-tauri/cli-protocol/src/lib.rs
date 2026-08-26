use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

pub const CLI_MARKER: &str = "--emditor-cli";
pub const REQUEST_ID_FLAG: &str = "--request-id";
pub const WAIT_TOKEN_FLAG: &str = "--wait-token";
pub const WAIT_DIRECTORY: &str = "emditor-cli";

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenRequest {
    pub id: String,
    pub paths: Vec<String>,
    pub wait_token: Option<String>,
}

pub fn request_args(request: &OpenRequest) -> Vec<String> {
    let mut args = vec![
        CLI_MARKER.to_owned(),
        REQUEST_ID_FLAG.to_owned(),
        request.id.clone(),
    ];
    if let Some(token) = &request.wait_token {
        args.push(WAIT_TOKEN_FLAG.to_owned());
        args.push(token.clone());
    }
    args.push("--".to_owned());
    args.extend(request.paths.iter().cloned());
    args
}

pub fn parse_request_args(args: &[String], cwd: &Path) -> Option<OpenRequest> {
    let marker = args.iter().position(|arg| arg == CLI_MARKER)?;
    let mut id = None;
    let mut wait_token = None;
    let mut paths = Vec::new();
    let mut index = marker + 1;

    while index < args.len() {
        match args[index].as_str() {
            REQUEST_ID_FLAG => {
                index += 1;
                id = args.get(index).cloned();
            }
            WAIT_TOKEN_FLAG => {
                index += 1;
                wait_token = args.get(index).cloned();
            }
            "--" => {
                paths.extend(args[index + 1..].iter().map(|path| {
                    let candidate = Path::new(path);
                    if candidate.is_absolute() {
                        candidate.to_path_buf()
                    } else {
                        cwd.join(candidate)
                    }
                    .to_string_lossy()
                    .into_owned()
                }));
                break;
            }
            _ => return None,
        }
        index += 1;
    }

    Some(OpenRequest {
        id: id?,
        paths,
        wait_token,
    })
}

pub fn wait_directory() -> PathBuf {
    std::env::temp_dir().join(WAIT_DIRECTORY)
}

pub fn valid_token(token: &str) -> bool {
    token.len() == 36
        && token
            .chars()
            .enumerate()
            .all(|(index, character)| match index {
                8 | 13 | 18 | 23 => character == '-',
                _ => character.is_ascii_hexdigit(),
            })
}

pub fn wait_status_path(token: &str) -> Option<PathBuf> {
    valid_token(token).then(|| wait_directory().join(format!("{token}.status")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_round_trips_through_process_arguments() {
        let request = OpenRequest {
            id: "request-1".into(),
            paths: vec!["/tmp/one.md".into(), "/tmp/two.markdown".into()],
            wait_token: Some("01234567-89ab-cdef-0123-456789abcdef".into()),
        };
        let mut args = vec!["emditor-app".into()];
        args.extend(request_args(&request));
        assert_eq!(
            parse_request_args(&args, Path::new("/ignored")),
            Some(request)
        );
    }

    #[test]
    fn relative_forwarded_paths_use_the_forwarding_working_directory() {
        let args = vec![
            CLI_MARKER.into(),
            REQUEST_ID_FLAG.into(),
            "id".into(),
            "--".into(),
            "notes.md".into(),
        ];
        let request = parse_request_args(&args, Path::new("/work")).unwrap();
        assert_eq!(request.paths, vec!["/work/notes.md"]);
    }

    #[test]
    fn tokens_cannot_escape_the_private_wait_directory() {
        assert!(wait_status_path("01234567-89ab-cdef-0123-456789abcdef").is_some());
        assert!(wait_status_path("../outside").is_none());
        assert!(wait_status_path("01234567-89ab-cdef-0123-456789abcdeg").is_none());
    }
}
