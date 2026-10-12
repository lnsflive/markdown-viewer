use std::{path::PathBuf, sync::Mutex};
use tauri::{Emitter, Manager, State};

mod shell_integration;

const MARKDOWN_EXTENSIONS: &[&str] = &["md", "markdown", "mdown", "mkd", "mkdn"];
const OPENED_FILES_EVENT: &str = "markdown-files-opened";

#[derive(Default)]
struct PendingOpenedFiles(Mutex<Vec<String>>);

fn is_markdown_path(path: &str) -> bool {
    let lower = path.to_lowercase();
    MARKDOWN_EXTENSIONS
        .iter()
        .any(|ext| lower.ends_with(&format!(".{}", ext)))
}

fn cli_markdown_paths() -> Vec<String> {
    std::env::args()
        .skip(1)
        .filter(|arg| !arg.starts_with('-') && is_markdown_path(arg))
        .collect()
}

fn queue_opened_files(app: &tauri::AppHandle, paths: impl IntoIterator<Item = PathBuf>) {
    let paths = paths
        .into_iter()
        .map(|path| path.to_string_lossy().into_owned())
        .filter(|path| is_markdown_path(path))
        .collect::<Vec<_>>();

    if paths.is_empty() {
        return;
    }

    app.state::<PendingOpenedFiles>()
        .0
        .lock()
        .expect("pending opened files lock poisoned")
        .extend(paths);
    let _ = app.emit(OPENED_FILES_EVENT, ());
}

#[tauri::command]
fn take_opened_file_paths(state: State<'_, PendingOpenedFiles>) -> Vec<String> {
    std::mem::take(&mut *state.0.lock().expect("pending opened files lock poisoned"))
}

#[tauri::command]
fn list_roots() -> Vec<String> {
    #[cfg(target_os = "windows")]
    {
        list_windows_roots()
    }
    #[cfg(not(target_os = "windows"))]
    {
        vec!["/".to_string()]
    }
}

#[cfg(target_os = "windows")]
fn list_windows_roots() -> Vec<String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows::Win32::Storage::FileSystem::{GetDriveTypeW, GetLogicalDrives};

    const DRIVE_FIXED: u32 = 3;
    const DRIVE_REMOTE: u32 = 4;
    const DRIVE_CDROM: u32 = 5;

    let mask = unsafe { GetLogicalDrives() };
    let mut roots = Vec::new();

    for i in 0..26u32 {
        if (mask & (1 << i)) == 0 {
            continue;
        }
        let letter = (b'A' + i as u8) as char;
        let path = format!("{}:\\", letter);
        let wide: Vec<u16> = OsStr::new(&path)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let drive_type = unsafe { GetDriveTypeW(windows::core::PCWSTR(wide.as_ptr())) };
        // Skip removable drives to avoid "insert disk" prompts on empty media.
        if drive_type == DRIVE_FIXED || drive_type == DRIVE_REMOTE || drive_type == DRIVE_CDROM {
            roots.push(path);
        }
    }

    roots
}

#[derive(serde::Serialize)]
pub struct DirEntry {
    name: String,
    path: String,
    is_dir: bool,
}

#[tauri::command]
fn read_directory(path: String) -> Result<Vec<DirEntry>, String> {
    let mut entries = Vec::new();
    let read = std::fs::read_dir(&path).map_err(|e| e.to_string())?;

    for entry in read.flatten() {
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let name = entry.file_name().to_string_lossy().to_string();
        let full_path = entry.path().to_string_lossy().to_string();
        entries.push(DirEntry {
            name,
            path: full_path,
            is_dir: meta.is_dir(),
        });
    }

    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

#[tauri::command]
fn get_home_dir() -> Option<String> {
    dirs::home_dir().map(|p| p.to_string_lossy().to_string())
}

/// The package format this binary was bundled as, used to decide whether
/// the in-app updater can install updates. `None` for dev builds.
#[tauri::command]
fn install_bundle_type() -> Option<&'static str> {
    use tauri::utils::{config::BundleType, platform::bundle_type};

    if std::env::var_os("APPIMAGE").is_some() {
        return Some("appimage");
    }
    Some(match bundle_type()? {
        BundleType::Deb => "deb",
        BundleType::Rpm => "rpm",
        BundleType::AppImage => "appimage",
        BundleType::Msi => "msi",
        BundleType::Nsis => "nsis",
        BundleType::App | BundleType::Dmg => "app",
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            take_opened_file_paths,
            list_roots,
            read_directory,
            get_home_dir,
            install_bundle_type,
            shell_integration::shell_integration_status,
            shell_integration::set_shell_integration,
        ])
        .setup(|app| {
            app.manage(PendingOpenedFiles(Mutex::new(cli_markdown_paths())));
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            let _ = app;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app, event| {
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Opened { urls } = event {
            queue_opened_files(
                app,
                urls.into_iter().filter_map(|url| url.to_file_path().ok()),
            );

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    });
}
