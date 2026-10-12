//! Opt-in "New → Markdown Document" entry in the OS file manager.

#[derive(serde::Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Unsupported,
    Enabled,
    Disabled,
}

#[tauri::command]
pub fn shell_integration_status() -> Status {
    platform::status()
}

#[tauri::command]
pub fn set_shell_integration(enabled: bool) -> Result<Status, String> {
    if enabled {
        platform::enable()?;
    } else {
        platform::disable()?;
    }
    Ok(platform::status())
}

#[cfg(target_os = "windows")]
mod platform {
    use super::Status;
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};

    const SHELL_NEW_KEY: &str = r"Software\Classes\.md\ShellNew";

    pub fn status() -> Status {
        match RegKey::predef(HKEY_CURRENT_USER).open_subkey(SHELL_NEW_KEY) {
            Ok(_) => Status::Enabled,
            Err(_) => Status::Disabled,
        }
    }

    pub fn enable() -> Result<(), String> {
        let (key, _) = RegKey::predef(HKEY_CURRENT_USER)
            .create_subkey(SHELL_NEW_KEY)
            .map_err(|e| e.to_string())?;
        key.set_value("NullFile", &"").map_err(|e| e.to_string())?;
        notify_shell();
        Ok(())
    }

    pub fn disable() -> Result<(), String> {
        match RegKey::predef(HKEY_CURRENT_USER).delete_subkey_all(SHELL_NEW_KEY) {
            Ok(()) => {}
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(e.to_string()),
        }
        notify_shell();
        Ok(())
    }

    fn notify_shell() {
        use windows::Win32::UI::Shell::{SHChangeNotify, SHCNE_ASSOCCHANGED, SHCNF_IDLIST};
        unsafe { SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, None, None) };
    }
}

#[cfg(target_os = "linux")]
mod platform {
    use super::Status;
    use std::path::{Path, PathBuf};

    const TEMPLATE_NAME: &str = "Markdown Document.md";
    const KDE_ENTRY_NAME: &str = "markdown-viewer-markdown.desktop";

    pub fn status() -> Status {
        match templates_dir() {
            Some(dir) if dir.join(TEMPLATE_NAME).is_file() => Status::Enabled,
            Some(_) => Status::Disabled,
            None => Status::Unsupported,
        }
    }

    pub fn enable() -> Result<(), String> {
        let dir = templates_dir().ok_or("Could not find your home directory")?;
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let template = dir.join(TEMPLATE_NAME);
        if !template.exists() {
            std::fs::write(&template, "").map_err(|e| e.to_string())?;
        }
        if is_kde() {
            write_kde_entry().map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn disable() -> Result<(), String> {
        if let Some(dir) = templates_dir() {
            remove_if_empty(&dir.join(TEMPLATE_NAME))?;
        }
        if let Some(dir) = kde_templates_dir() {
            remove_file(&dir.join(KDE_ENTRY_NAME))?;
            remove_if_empty(&dir.join(".source").join(TEMPLATE_NAME))?;
        }
        Ok(())
    }

    /// Only removes the template if it is still the empty file we created,
    /// so a template the user has edited is left alone.
    fn remove_if_empty(path: &Path) -> Result<(), String> {
        match std::fs::metadata(path) {
            Ok(meta) if meta.is_file() && meta.len() == 0 => remove_file(path),
            _ => Ok(()),
        }
    }

    fn remove_file(path: &Path) -> Result<(), String> {
        match std::fs::remove_file(path) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.to_string()),
        }
    }

    fn templates_dir() -> Option<PathBuf> {
        let home = dirs::home_dir()?;
        // dirs reads user-dirs.dirs and returns None when XDG_TEMPLATES_DIR
        // is unset or points at $HOME, which disables templates in Nautilus.
        Some(match dirs::template_dir() {
            Some(dir) if dir != home => dir,
            _ => home.join("Templates"),
        })
    }

    fn kde_templates_dir() -> Option<PathBuf> {
        dirs::data_dir().map(|dir| dir.join("templates"))
    }

    fn is_kde() -> bool {
        std::env::var("XDG_CURRENT_DESKTOP")
            .map(|v| v.split(':').any(|d| d.eq_ignore_ascii_case("KDE")))
            .unwrap_or(false)
    }

    fn write_kde_entry() -> std::io::Result<()> {
        let dir = kde_templates_dir().ok_or(std::io::ErrorKind::NotFound)?;
        let source_dir = dir.join(".source");
        std::fs::create_dir_all(&source_dir)?;
        let source = source_dir.join(TEMPLATE_NAME);
        if !source.exists() {
            std::fs::write(&source, "")?;
        }
        std::fs::write(
            dir.join(KDE_ENTRY_NAME),
            format!(
                "[Desktop Entry]\nType=Link\nName=Markdown Document...\nIcon=text-markdown\nURL=.source/{TEMPLATE_NAME}\n"
            ),
        )
    }
}

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
mod platform {
    use super::Status;

    pub fn status() -> Status {
        Status::Unsupported
    }

    pub fn enable() -> Result<(), String> {
        Err("Not supported on this platform".into())
    }

    pub fn disable() -> Result<(), String> {
        Ok(())
    }
}
