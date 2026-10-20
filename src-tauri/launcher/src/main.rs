use emditor_cli_protocol::{request_args, wait_status_path, OpenRequest};
use std::{
    env,
    ffi::OsString,
    fs::{self, OpenOptions},
    io::{self, Read, Write},
    path::{Path, PathBuf},
    process::{Command, ExitCode, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread,
    time::{Duration, Instant},
};
use uuid::Uuid;

const VERSION: &str = env!("CARGO_PKG_VERSION");
const USAGE: &str = "Usage: emditor [OPTIONS] [FILE...]\n\nOptions:\n  -w, --wait     Wait until every requested tab is closed\n  -h, --help     Print help\n  -V, --version  Print version";

#[derive(Debug, Eq, PartialEq)]
struct Cli {
    wait: bool,
    files: Vec<OsString>,
    action: Action,
}

#[derive(Debug, Eq, PartialEq)]
enum Action {
    Launch,
    Help,
    Version,
}

fn parse_cli<I>(arguments: I) -> Result<Cli, String>
where
    I: IntoIterator<Item = OsString>,
{
    let mut wait = false;
    let mut files = Vec::new();
    let mut positional = false;
    let mut action = Action::Launch;

    for argument in arguments {
        if positional {
            files.push(argument);
            continue;
        }
        match argument.to_str() {
            Some("--") => positional = true,
            Some("-w" | "--wait") => wait = true,
            Some("-h" | "--help") => action = Action::Help,
            Some("-V" | "--version") => action = Action::Version,
            Some(value) if value.starts_with('-') => {
                return Err(format!("unknown option: {value}"));
            }
            _ => files.push(argument),
        }
    }

    if action == Action::Launch && wait && files.is_empty() {
        return Err("--wait requires at least one Markdown file".into());
    }
    Ok(Cli {
        wait,
        files,
        action,
    })
}

fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            matches!(
                extension.to_ascii_lowercase().as_str(),
                "md" | "markdown" | "mdown" | "mkd"
            )
        })
}

fn resolve_file(path: &Path, cwd: &Path) -> Result<PathBuf, String> {
    let absolute = if path.is_absolute() {
        path.to_path_buf()
    } else {
        cwd.join(path)
    };
    if absolute.is_dir() {
        return Err(format!("path is a directory: {}", path.display()));
    }
    if !is_markdown(path) {
        return Err(format!(
            "unsupported Markdown extension: {}",
            path.display()
        ));
    }
    if absolute.exists() {
        return absolute
            .canonicalize()
            .map_err(|error| format!("cannot resolve {}: {error}", path.display()));
    }
    let parent = absolute
        .parent()
        .ok_or_else(|| format!("path has no parent directory: {}", path.display()))?;
    let parent = parent
        .canonicalize()
        .map_err(|error| format!("cannot resolve parent of {}: {error}", path.display()))?;
    let filename = absolute
        .file_name()
        .ok_or_else(|| format!("path has no filename: {}", path.display()))?;
    Ok(parent.join(filename))
}

fn app_executable() -> Result<PathBuf, String> {
    if let Some(path) = env::var_os("EMDITOR_APP_PATH") {
        return Ok(PathBuf::from(path));
    }
    let launcher =
        env::current_exe().map_err(|error| format!("cannot locate launcher: {error}"))?;
    let launcher = launcher.canonicalize().unwrap_or(launcher);
    let directory = launcher
        .parent()
        .ok_or_else(|| "cannot locate the Emditor installation directory".to_owned())?;
    let filename = if cfg!(windows) {
        "emditor-app.exe"
    } else {
        "emditor-app"
    };
    let sibling = directory.join(filename);
    if sibling.is_file() {
        return Ok(sibling);
    }
    if directory
        .file_name()
        .is_some_and(|name| name == "resources")
    {
        let parent = directory.parent().unwrap_or(directory).join(filename);
        if parent.is_file() {
            return Ok(parent);
        }
    }
    Err(format!(
        "cannot find {filename} next to the Emditor launcher"
    ))
}

fn create_wait_file(token: &str) -> Result<PathBuf, String> {
    let path = wait_status_path(token).ok_or_else(|| "invalid wait token".to_owned())?;
    let directory = path.parent().expect("wait status path has a parent");
    fs::create_dir_all(directory)
        .map_err(|error| format!("cannot create wait directory: {error}"))?;
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::{MetadataExt, OpenOptionsExt, PermissionsExt};
        let metadata = fs::symlink_metadata(directory)
            .map_err(|error| format!("cannot inspect wait directory: {error}"))?;
        if !metadata.file_type().is_dir()
            || metadata.file_type().is_symlink()
            || metadata.uid() != unsafe { libc::geteuid() }
        {
            return Err("wait directory is not a private user directory".into());
        }
        fs::set_permissions(directory, fs::Permissions::from_mode(0o700))
            .map_err(|error| format!("cannot secure wait directory: {error}"))?;
        options.custom_flags(libc::O_NOFOLLOW).mode(0o600);
    }
    let mut file = options
        .open(&path)
        .map_err(|error| format!("cannot create wait status: {error}"))?;
    file.write_all(b"pending\n")
        .map_err(|error| format!("cannot initialize wait status: {error}"))?;
    Ok(path)
}

fn read_status(path: &Path) -> io::Result<String> {
    let mut content = String::new();
    OpenOptions::new()
        .read(true)
        .open(path)?
        .read_to_string(&mut content)?;
    Ok(content)
}

#[cfg(unix)]
fn process_is_alive(pid: u32) -> bool {
    if pid == 0 || pid > i32::MAX as u32 {
        return false;
    }
    let result = unsafe { libc::kill(pid as libc::pid_t, 0) };
    result == 0 || io::Error::last_os_error().raw_os_error() == Some(libc::EPERM)
}

#[cfg(unix)]
fn configure_detached(command: &mut Command) {
    use std::os::unix::process::CommandExt;
    unsafe {
        command.pre_exec(|| {
            if libc::setsid() == -1 {
                Err(io::Error::last_os_error())
            } else {
                Ok(())
            }
        });
    }
}

#[cfg(windows)]
fn configure_detached(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    use windows_sys::Win32::System::Threading::{CREATE_NEW_PROCESS_GROUP, DETACHED_PROCESS};
    command.creation_flags(CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS);
}

#[cfg(windows)]
fn process_is_alive(pid: u32) -> bool {
    use windows_sys::Win32::{
        Foundation::{CloseHandle, STILL_ACTIVE},
        System::Threading::{GetExitCodeProcess, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION},
    };
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle.is_null() {
            return false;
        }
        let mut code: u32 = 0;
        let alive = GetExitCodeProcess(handle, &mut code) != 0 && code == STILL_ACTIVE as u32;
        CloseHandle(handle);
        alive
    }
}

fn wait_for_completion(path: &Path, interrupted: Arc<AtomicBool>) -> u8 {
    let started = Instant::now();
    let mut gui_pid = None;
    loop {
        if interrupted.load(Ordering::SeqCst) {
            return 130;
        }
        if let Ok(status) = read_status(path) {
            let fields: Vec<_> = status.split_whitespace().collect();
            match fields.as_slice() {
                ["waiting", pid] => gui_pid = pid.parse().ok(),
                ["complete", _, "0"] => return 0,
                ["complete", _, _] => return 1,
                _ => {}
            }
        }
        if let Some(pid) = gui_pid {
            if !process_is_alive(pid) {
                return 1;
            }
        } else if started.elapsed() > Duration::from_secs(30) {
            return 1;
        }
        thread::sleep(Duration::from_millis(100));
    }
}

fn launch(cli: Cli) -> Result<u8, String> {
    let cwd =
        env::current_dir().map_err(|error| format!("cannot read current directory: {error}"))?;
    let paths = cli
        .files
        .iter()
        .map(|path| resolve_file(Path::new(path), &cwd))
        .collect::<Result<Vec<_>, _>>()?
        .into_iter()
        .map(|path| {
            path.into_os_string()
                .into_string()
                .map_err(|_| "Markdown paths must be valid Unicode".to_owned())
        })
        .collect::<Result<Vec<_>, _>>()?;

    let executable = app_executable()?;
    let token = cli.wait.then(|| Uuid::new_v4().to_string());
    let wait_path = token.as_deref().map(create_wait_file).transpose()?;
    let request = OpenRequest {
        id: Uuid::new_v4().to_string(),
        paths,
        wait_token: token,
    };
    let mut command = Command::new(executable);
    command
        .args(request_args(&request))
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    configure_detached(&mut command);
    let spawn = command.spawn();
    if let Err(error) = spawn {
        if let Some(path) = &wait_path {
            let _ = fs::remove_file(path);
        }
        return Err(format!("cannot start Emditor: {error}"));
    }

    let Some(path) = wait_path else {
        return Ok(0);
    };
    let interrupted = Arc::new(AtomicBool::new(false));
    let signal_flag = Arc::clone(&interrupted);
    if let Err(error) = ctrlc::set_handler(move || signal_flag.store(true, Ordering::SeqCst)) {
        let _ = fs::remove_file(&path);
        return Err(format!("cannot install Ctrl+C handler: {error}"));
    }
    let status = wait_for_completion(&path, interrupted);
    let _ = fs::remove_file(path);
    Ok(status)
}

fn run() -> Result<u8, (u8, String)> {
    let cli = parse_cli(env::args_os().skip(1)).map_err(|message| (2, message))?;
    match cli.action {
        Action::Help => {
            println!("{USAGE}");
            Ok(0)
        }
        Action::Version => {
            println!("emditor {VERSION}");
            Ok(0)
        }
        Action::Launch => launch(cli).map_err(|message| (1, message)),
    }
}

fn main() -> ExitCode {
    match run() {
        Ok(code) => ExitCode::from(code),
        Err((code, message)) => {
            eprintln!("emditor: {message}");
            eprintln!("Try 'emditor --help' for more information.");
            ExitCode::from(code)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_multiple_files_and_wait_alias() {
        let cli = parse_cli(["-w", "one.md", "two.markdown"].map(OsString::from)).unwrap();
        assert!(cli.wait);
        assert_eq!(cli.files, ["one.md", "two.markdown"].map(OsString::from));
    }

    #[test]
    fn wait_without_files_is_a_usage_error() {
        assert_eq!(
            parse_cli([OsString::from("--wait")]),
            Err("--wait requires at least one Markdown file".into())
        );
    }

    #[test]
    fn unknown_options_are_rejected_before_any_gui_launch() {
        assert_eq!(
            parse_cli([OsString::from("--unknown")]),
            Err("unknown option: --unknown".into())
        );
    }

    #[test]
    fn accepts_supported_extensions_case_insensitively() {
        for path in ["a.md", "a.MARKDOWN", "a.Mdown", "a.MKD"] {
            assert!(is_markdown(Path::new(path)), "{path}");
        }
        assert!(!is_markdown(Path::new("a.txt")));
    }

    #[test]
    fn rejects_directories_before_starting_the_gui() {
        let directory = env::current_dir().unwrap();
        let error = resolve_file(&directory, &directory).unwrap_err();
        assert!(error.contains("directory"));
    }

    #[test]
    fn parses_success_and_failure_wait_statuses() {
        for (failed, expected) in [(false, 0), (true, 1)] {
            let token = Uuid::new_v4().to_string();
            let path = create_wait_file(&token).unwrap();
            fs::write(
                &path,
                format!("complete {} {}\n", std::process::id(), u8::from(failed)),
            )
            .unwrap();
            assert_eq!(
                wait_for_completion(&path, Arc::new(AtomicBool::new(false))),
                expected
            );
            fs::remove_file(path).unwrap();
        }
    }

    #[test]
    fn detects_the_current_process_and_a_nonexistent_process() {
        assert!(process_is_alive(std::process::id()));
        assert!(!process_is_alive(u32::MAX));
    }
}
