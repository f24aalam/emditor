#[cfg(target_os = "macos")]
use std::process::Command;

#[cfg(target_os = "macos")]
fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

#[cfg(target_os = "macos")]
fn apple_script_string(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

#[cfg(target_os = "macos")]
fn manage(install: bool) -> Result<(), String> {
    let executable =
        std::env::current_exe().map_err(|error| format!("Could not locate Emditor: {error}"))?;
    let directory = executable
        .parent()
        .ok_or_else(|| "Could not locate Emditor's command directory.".to_owned())?;
    let source = directory.join("emditor");
    let alias = directory.join("emd");
    if !source.is_file() || !alias.is_file() {
        return Err("The shell launchers are not included in this application bundle.".into());
    }

    let pairs = [
        (
            source.to_string_lossy().into_owned(),
            "/usr/local/bin/emditor",
        ),
        (alias.to_string_lossy().into_owned(), "/usr/local/bin/emd"),
    ];
    let command = if install {
        let guards = pairs
            .iter()
            .map(|(target, link)| format!(
                "if [ -e {link} ] || [ -L {link} ]; then [ \"$(readlink {link})\" = {target} ] || exit 17; fi",
                link = shell_quote(link),
                target = shell_quote(target),
            ))
            .collect::<Vec<_>>()
            .join("; ");
        let links = pairs
            .iter()
            .map(|(target, link)| {
                format!(
                    "ln -sfn {target} {link}",
                    target = shell_quote(target),
                    link = shell_quote(link),
                )
            })
            .collect::<Vec<_>>()
            .join("; ");
        format!("mkdir -p /usr/local/bin; {guards}; {links}")
    } else {
        pairs
            .iter()
            .map(|(target, link)| {
                format!(
                    "if [ -L {link} ] && [ \"$(readlink {link})\" = {target} ]; then rm {link}; fi",
                    link = shell_quote(link),
                    target = shell_quote(target),
                )
            })
            .collect::<Vec<_>>()
            .join("; ")
    };
    let expression = format!(
        "do shell script \"{}\" with administrator privileges",
        apple_script_string(&command)
    );
    let output = Command::new("osascript")
        .args(["-e", &expression])
        .output()
        .map_err(|error| format!("Could not show the administrator prompt: {error}"))?;
    if output.status.success() {
        Ok(())
    } else {
        let detail = String::from_utf8_lossy(&output.stderr);
        if install && detail.contains("17") {
            Err("An unrelated emditor or emd command already exists in /usr/local/bin.".into())
        } else {
            Err(format!("Shell command update failed: {}", detail.trim()))
        }
    }
}

#[tauri::command]
pub fn manage_shell_commands(install: bool) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        manage(install)
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = install;
        Err("Shell command installation is available only on macOS.".into())
    }
}

#[cfg(all(test, target_os = "macos"))]
mod tests {
    use super::*;

    #[test]
    fn quotes_shell_and_apple_script_values() {
        assert_eq!(shell_quote("a'b"), "'a'\\''b'");
        assert_eq!(apple_script_string("a\\\"b"), "a\\\\\\\"b");
    }
}
