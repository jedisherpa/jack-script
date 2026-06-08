use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::PathBuf,
    process::{Child, Command},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
#[cfg(not(debug_assertions))]
use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    process::Stdio,
    thread,
    time::Duration,
};
use tauri::{
    menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Emitter, Manager, Url,
};

const MENU_SETUP_MODEL: &str = "setup-local-model";
const MENU_OPEN_DATA_DIR: &str = "open-data-folder";
const MENU_CREATE_BACKUP: &str = "create-local-backup";
const MENU_OPEN_BACKUPS: &str = "open-backups-folder";
const MENU_START_OLLAMA: &str = "start-ollama";
const MENU_OPEN_OLLAMA_DOWNLOAD: &str = "open-ollama-download";
const MENU_RELOAD: &str = "reload-window";

#[derive(Serialize)]
struct OllamaStatus {
    installed: bool,
    running: bool,
    version: Option<String>,
    message: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct DesktopRoleSelection {
    #[serde(default)]
    provider: Option<String>,
    #[serde(default)]
    model: Option<String>,
    #[serde(default, rename = "baseUrl")]
    base_url: Option<String>,
    #[serde(default, rename = "apiKey")]
    api_key: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct DesktopSettings {
    #[serde(default)]
    provider: Option<String>,
    #[serde(default = "default_model")]
    model: String,
    #[serde(default, rename = "baseUrl")]
    base_url: Option<String>,
    #[serde(default)]
    roles: HashMap<String, DesktopRoleSelection>,
}

fn default_model() -> String {
    "llama3.2".into()
}

#[derive(Serialize)]
struct DesktopRuntimeStatus {
    local_first: bool,
    server_url: Option<String>,
    data_dir: String,
    database_path: String,
    settings_path: String,
    bundled_node_path: Option<String>,
}

#[derive(Clone, Serialize)]
struct BackupResult {
    path: String,
}

struct DesktopServer {
    child: Mutex<Option<Child>>,
    ollama_child: Mutex<Option<Child>>,
    port: Mutex<Option<u16>>,
    #[cfg(not(debug_assertions))]
    scheduler_started: Mutex<bool>,
}

impl DesktopServer {
    fn new() -> Self {
        Self {
            child: Mutex::new(None),
            ollama_child: Mutex::new(None),
            port: Mutex::new(None),
            #[cfg(not(debug_assertions))]
            scheduler_started: Mutex::new(false),
        }
    }
}

impl Drop for DesktopServer {
    fn drop(&mut self) {
        if let Ok(child_slot) = self.child.get_mut() {
            if let Some(child) = child_slot {
                let _ = child.kill();
            }
        }
        if let Ok(child_slot) = self.ollama_child.get_mut() {
            if let Some(child) = child_slot {
                let _ = child.kill();
            }
        }
    }
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("desktop-settings.json"))
}

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("jack-script.sqlite3"))
}

fn backups_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_data_dir(app)?.join("backups");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn storage_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_data_dir(app)?.join("storage");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn init_database_at(path: &PathBuf) -> Result<(), String> {
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute_batch(include_str!("../../db/local-sqlite-schema.sql"))
        .map_err(|e| e.to_string())
}

#[cfg(not(debug_assertions))]
fn reserve_local_port() -> Result<u16, String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    listener
        .local_addr()
        .map(|addr| addr.port())
        .map_err(|e| e.to_string())
}

#[cfg(not(debug_assertions))]
fn wait_for_server(port: u16) -> bool {
    for _ in 0..80 {
        if TcpStream::connect(("127.0.0.1", port)).is_ok() {
            return true;
        }
        thread::sleep(Duration::from_millis(250));
    }
    false
}

fn bundled_node_path(app: &AppHandle) -> Option<PathBuf> {
    let resource_dir = app.path().resource_dir().ok()?;
    let bin_name = if cfg!(windows) { "node.exe" } else { "node" };
    let candidate = resource_dir
        .join("resources")
        .join("node")
        .join("bin")
        .join(bin_name);
    candidate.exists().then_some(candidate)
}

fn open_path(path: PathBuf) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut cmd = Command::new("open");
        cmd.arg(path);
        cmd
    };

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut cmd = Command::new("explorer");
        cmd.arg(path);
        cmd
    };

    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = {
        let mut cmd = Command::new("xdg-open");
        cmd.arg(path);
        cmd
    };

    command.spawn().map(|_| ()).map_err(|e| e.to_string())
}

fn open_url(url: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut cmd = Command::new("open");
        cmd.arg(url);
        cmd
    };

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut cmd = Command::new("cmd");
        cmd.args(["/C", "start", "", url]);
        cmd
    };

    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = {
        let mut cmd = Command::new("xdg-open");
        cmd.arg(url);
        cmd
    };

    command.spawn().map(|_| ()).map_err(|e| e.to_string())
}

fn ollama_bin() -> PathBuf {
    if let Some(path) = std::env::var_os("OLLAMA_BIN").map(PathBuf::from) {
        if path.exists() {
            return path;
        }
    }

    #[cfg(target_os = "macos")]
    let candidates = [
        "/opt/homebrew/bin/ollama",
        "/usr/local/bin/ollama",
        "/Applications/Ollama.app/Contents/Resources/ollama",
    ];

    #[cfg(target_os = "windows")]
    let candidates = [
        r"C:\Program Files\Ollama\ollama.exe",
        r"C:\Users\Public\AppData\Local\Programs\Ollama\ollama.exe",
    ];

    #[cfg(all(unix, not(target_os = "macos")))]
    let candidates = ["/usr/local/bin/ollama", "/usr/bin/ollama"];

    for candidate in candidates {
        let path = PathBuf::from(candidate);
        if path.exists() {
            return path;
        }
    }

    PathBuf::from(if cfg!(windows) {
        "ollama.exe"
    } else {
        "ollama"
    })
}

fn ollama_command() -> Command {
    Command::new(ollama_bin())
}

fn copy_dir_recursive(from: &PathBuf, to: &PathBuf) -> Result<(), String> {
    if !from.exists() {
        return Ok(());
    }
    fs::create_dir_all(to).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(from).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let from_path = entry.path();
        let to_path = to.join(entry.file_name());
        if from_path.is_dir() {
            copy_dir_recursive(&from_path, &to_path)?;
        } else {
            fs::copy(&from_path, &to_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn create_backup_at(app: &AppHandle) -> Result<PathBuf, String> {
    init_database_at(&database_path(app)?)?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();
    let backup_dir = backups_dir(app)?.join(format!("jack-script-backup-{stamp}"));
    fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;

    let db = database_path(app)?;
    if db.exists() {
        let backup_db = backup_dir.join("jack-script.sqlite3");
        let conn = Connection::open(&db).map_err(|e| e.to_string())?;
        conn.execute("VACUUM INTO ?1", [backup_db.to_string_lossy().as_ref()])
            .map_err(|e| e.to_string())?;
    }
    let settings = settings_path(app)?;
    if settings.exists() {
        fs::copy(&settings, backup_dir.join("desktop-settings.json")).map_err(|e| e.to_string())?;
    }
    copy_dir_recursive(&storage_dir(app)?, &backup_dir.join("storage"))?;

    Ok(backup_dir)
}

fn build_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let about = AboutMetadata {
        name: Some("Jack Script".into()),
        version: Some(env!("CARGO_PKG_VERSION").into()),
        comments: Some("Local-first screenwriting and video production workstation.".into()),
        website: Some("https://ollama.com/download".into()),
        website_label: Some("Local model setup".into()),
        ..Default::default()
    };

    Menu::with_items(
        app,
        &[
            &Submenu::with_items(
                app,
                "Jack Script",
                true,
                &[
                    &PredefinedMenuItem::about(app, Some("About Jack Script"), Some(about))?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(
                        app,
                        MENU_SETUP_MODEL,
                        "Set Up Local Model...",
                        true,
                        Some("CmdOrCtrl+,"),
                    )?,
                    &MenuItem::with_id(
                        app,
                        MENU_OPEN_DATA_DIR,
                        "Open Data Folder",
                        true,
                        Some("CmdOrCtrl+Shift+O"),
                    )?,
                    &MenuItem::with_id(
                        app,
                        MENU_CREATE_BACKUP,
                        "Create Local Backup",
                        true,
                        Some("CmdOrCtrl+Shift+B"),
                    )?,
                    &MenuItem::with_id(
                        app,
                        MENU_OPEN_BACKUPS,
                        "Open Backups Folder",
                        true,
                        None::<&str>,
                    )?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, None)?,
                    &PredefinedMenuItem::hide_others(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(app, None)?,
                    &PredefinedMenuItem::redo(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "View",
                true,
                &[
                    &MenuItem::with_id(app, MENU_RELOAD, "Reload", true, Some("CmdOrCtrl+R"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::fullscreen(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "Window",
                true,
                &[
                    &PredefinedMenuItem::minimize(app, None)?,
                    &PredefinedMenuItem::maximize(app, None)?,
                    &PredefinedMenuItem::close_window(app, None)?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "Help",
                true,
                &[
                    &MenuItem::with_id(app, MENU_START_OLLAMA, "Start Ollama", true, None::<&str>)?,
                    &MenuItem::with_id(
                        app,
                        MENU_OPEN_OLLAMA_DOWNLOAD,
                        "Install Ollama...",
                        true,
                        None::<&str>,
                    )?,
                    &MenuItem::with_id(
                        app,
                        MENU_SETUP_MODEL,
                        "Set Up Local Model...",
                        true,
                        None::<&str>,
                    )?,
                ],
            )?,
        ],
    )
}

fn handle_menu_event(app: &AppHandle, id: &str) {
    match id {
        MENU_SETUP_MODEL => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
            let _ = app.emit("jackscript:show-model-setup", ());
        }
        MENU_OPEN_DATA_DIR => {
            if let Ok(path) = app_data_dir(app) {
                let _ = open_path(path);
            }
        }
        MENU_CREATE_BACKUP => {
            if let Ok(path) = create_backup_at(app) {
                let _ = open_path(path.clone());
                let _ = app.emit(
                    "jackscript:backup-created",
                    BackupResult {
                        path: path.to_string_lossy().to_string(),
                    },
                );
            }
        }
        MENU_OPEN_BACKUPS => {
            if let Ok(path) = backups_dir(app) {
                let _ = open_path(path);
            }
        }
        MENU_START_OLLAMA => {
            let _ = start_ollama_service(app.clone());
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
            let _ = app.emit("jackscript:show-model-setup", ());
        }
        MENU_OPEN_OLLAMA_DOWNLOAD => {
            let _ = open_url("https://ollama.com/download");
        }
        MENU_RELOAD => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.eval("window.location.reload()");
            }
        }
        _ => {}
    }
}

#[cfg(not(debug_assertions))]
fn post_local_json(port: u16, path: &str) -> Result<String, String> {
    let mut stream = TcpStream::connect(("127.0.0.1", port)).map_err(|e| e.to_string())?;
    let body = "{}";
    let req = format!(
        "POST {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nContent-Type: application/json\r\nAccept: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    stream
        .write_all(req.as_bytes())
        .map_err(|e| e.to_string())?;
    let mut resp = String::new();
    stream
        .read_to_string(&mut resp)
        .map_err(|e| e.to_string())?;
    if resp.starts_with("HTTP/1.1 2") || resp.starts_with("HTTP/1.0 2") {
        Ok(resp)
    } else {
        Err(resp
            .lines()
            .next()
            .unwrap_or("scheduler request failed")
            .to_string())
    }
}

fn start_gather_scheduler(app: &AppHandle) -> Result<(), String> {
    #[cfg(debug_assertions)]
    {
        let _ = app;
        return Ok(());
    }

    #[cfg(not(debug_assertions))]
    {
        let server = app.state::<DesktopServer>();
        let mut started = server.scheduler_started.lock().map_err(|e| e.to_string())?;
        if *started {
            return Ok(());
        }
        let port = match *server.port.lock().map_err(|e| e.to_string())? {
            Some(port) => port,
            None => return Ok(()),
        };
        *started = true;
        thread::spawn(move || {
            thread::sleep(Duration::from_secs(10));
            loop {
                let _ = post_local_json(port, "/api/gather/schedules/run-due");
                thread::sleep(Duration::from_secs(60));
            }
        });
        Ok(())
    }
}

fn start_packaged_server(app: &AppHandle) -> Result<Option<String>, String> {
    #[cfg(debug_assertions)]
    {
        let _ = app;
        return Ok(None);
    }

    #[cfg(not(debug_assertions))]
    {
        let port = reserve_local_port()?;
        let data_dir = app_data_dir(app)?;
        let db_path = database_path(app)?;
        let storage_path = storage_dir(app)?;
        let settings = settings_path(app)?;
        init_database_at(&db_path)?;

        let resource_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
        let server_dir = resource_dir.join("resources").join("desktop-server");
        let server_entry = server_dir.join("server.js");
        if !server_entry.exists() {
            return Err(format!(
                "Packaged desktop server was not found at {}.",
                server_entry.to_string_lossy()
            ));
        }

        let node_bin = std::env::var_os("JACK_SCRIPT_NODE_BIN")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("KINGS_PRESS_NODE_BIN").map(PathBuf::from))
            .or_else(|| bundled_node_path(app))
            .unwrap_or_else(|| PathBuf::from("node"));
        let mut command = Command::new(node_bin);
        command
            .arg(&server_entry)
            .current_dir(&server_dir)
            .env("NODE_ENV", "production")
            .env("HOSTNAME", "127.0.0.1")
            .env("PORT", port.to_string())
            .env("JACK_SCRIPT_LOCAL_FIRST", "true")
            .env("KINGS_PRESS_LOCAL_FIRST", "true")
            .env("DATA_BACKEND", "sqlite")
            .env("STORAGE_PROVIDER", "local")
            .env("KINGS_PRESS_STORAGE", "local")
            .env("JACK_SCRIPT_DATA_DIR", &data_dir)
            .env("KINGS_PRESS_DATA_DIR", data_dir)
            .env("JACK_SCRIPT_DB_PATH", &db_path)
            .env("KINGS_PRESS_DB_PATH", db_path)
            .env("JACK_SCRIPT_STORAGE_DIR", &storage_path)
            .env("KINGS_PRESS_STORAGE_DIR", storage_path)
            .env("JACK_SCRIPT_LLM_SETTINGS_PATH", &settings)
            .env("KINGS_PRESS_LLM_SETTINGS_PATH", settings)
            .env("LLM_BASE_URL", "http://127.0.0.1:11434")
            .env("LLM_MODEL", "llama3.2")
            .stdout(Stdio::null())
            .stderr(Stdio::null());

        if std::env::var_os("LLM_PROVIDER").is_none()
            && std::env::var_os("ANTHROPIC_API_KEY").is_none()
        {
            command.env("LLM_PROVIDER", "ollama");
        }

        let child = command
            .spawn()
            .map_err(|e| format!("Could not start local Jack Script server: {e}"))?;
        if !wait_for_server(port) {
            return Err("Timed out waiting for the local Jack Script server to start.".into());
        }

        let server = app.state::<DesktopServer>();
        *server.child.lock().map_err(|e| e.to_string())? = Some(child);
        *server.port.lock().map_err(|e| e.to_string())? = Some(port);

        Ok(Some(format!("http://127.0.0.1:{port}")))
    }
}

#[tauri::command]
fn ollama_status() -> OllamaStatus {
    let version = ollama_command().arg("--version").output();
    match version {
        Ok(out) => {
            let text = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let running = ollama_command()
                .arg("list")
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false);
            OllamaStatus {
                installed: true,
                running,
                version: if text.is_empty() { None } else { Some(text) },
                message: if running {
                    None
                } else {
                    Some("Ollama is installed but not running.".into())
                },
            }
        }
        Err(_) => OllamaStatus {
            installed: false,
            running: false,
            version: None,
            message: Some("Ollama was not found on PATH.".into()),
        },
    }
}

fn is_ollama_running() -> bool {
    ollama_command()
        .arg("list")
        .output()
        .map(|out| out.status.success())
        .unwrap_or(false)
}

#[tauri::command]
fn start_ollama_service(app: AppHandle) -> Result<(), String> {
    if is_ollama_running() {
        return Ok(());
    }

    let version = ollama_command()
        .arg("--version")
        .output()
        .map_err(|_| "Ollama is not installed. Install it first, then reopen setup.".to_string())?;
    if !version.status.success() {
        return Err("Ollama is installed but could not be started from the command line.".into());
    }

    let server = app.state::<DesktopServer>();
    let mut child_slot = server.ollama_child.lock().map_err(|e| e.to_string())?;
    if child_slot.is_none() {
        let child = ollama_command()
            .arg("serve")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn()
            .map_err(|e| format!("Could not start Ollama: {e}"))?;
        *child_slot = Some(child);
    }
    drop(child_slot);

    for _ in 0..32 {
        if is_ollama_running() {
            return Ok(());
        }
        std::thread::sleep(std::time::Duration::from_millis(250));
    }

    Err("Ollama was started but did not become ready yet. Try again in a few seconds.".into())
}

#[tauri::command]
fn list_ollama_models() -> Result<Vec<String>, String> {
    let out = ollama_command()
        .arg("list")
        .output()
        .map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).trim().to_string());
    }
    let text = String::from_utf8_lossy(&out.stdout);
    Ok(text
        .lines()
        .skip(1)
        .filter_map(|line| line.split_whitespace().next())
        .filter(|name| !name.is_empty())
        .map(str::to_string)
        .collect())
}

#[tauri::command]
fn pull_ollama_model(model: String) -> Result<(), String> {
    let model = model.trim();
    if model.is_empty() {
        return Err("Choose a model first.".into());
    }
    let out = ollama_command()
        .args(["pull", model])
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

#[tauri::command]
fn save_model_choice(app: AppHandle, model: String) -> Result<(), String> {
    let model = model.trim();
    if model.is_empty() {
        return Err("Choose a model first.".into());
    }
    let mut roles = HashMap::new();
    for role in ["write", "review", "revise"] {
        roles.insert(
            role.into(),
            DesktopRoleSelection {
                provider: Some("ollama".into()),
                model: Some(model.into()),
                base_url: Some("http://127.0.0.1:11434".into()),
                api_key: None,
            },
        );
    }
    let settings = DesktopSettings {
        provider: Some("ollama".into()),
        model: model.into(),
        base_url: Some("http://127.0.0.1:11434".into()),
        roles,
    };
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(settings_path(&app)?, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_ai_roles(
    app: AppHandle,
    roles: HashMap<String, DesktopRoleSelection>,
) -> Result<(), String> {
    let write = roles.get("write");
    let provider = write
        .and_then(|row| row.provider.clone())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "ollama".into());
    let model = write
        .and_then(|row| row.model.clone())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(default_model);
    let base_url = write.and_then(|row| row.base_url.clone()).or_else(|| {
        if provider == "ollama" {
            Some("http://127.0.0.1:11434".into())
        } else {
            None
        }
    });
    let settings = DesktopSettings {
        provider: Some(provider),
        model,
        base_url,
        roles,
    };
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(settings_path(&app)?, json).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_model_choice(app: AppHandle) -> Result<Option<DesktopSettings>, String> {
    let path = settings_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let text = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&text)
        .map(Some)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn init_local_database(app: AppHandle) -> Result<String, String> {
    let path = database_path(&app)?;
    init_database_at(&path)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn create_local_backup(app: AppHandle) -> Result<BackupResult, String> {
    let path = create_backup_at(&app)?;
    Ok(BackupResult {
        path: path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
fn desktop_runtime_status(app: AppHandle) -> Result<DesktopRuntimeStatus, String> {
    let data_dir = app_data_dir(&app)?;
    let database_path = database_path(&app)?;
    let settings_path = settings_path(&app)?;
    let bundled_node_path = bundled_node_path(&app).map(|path| path.to_string_lossy().to_string());
    let server = app.state::<DesktopServer>();
    let port = *server.port.lock().map_err(|e| e.to_string())?;

    Ok(DesktopRuntimeStatus {
        local_first: true,
        server_url: port.map(|p| format!("http://127.0.0.1:{p}")),
        data_dir: data_dir.to_string_lossy().to_string(),
        database_path: database_path.to_string_lossy().to_string(),
        settings_path: settings_path.to_string_lossy().to_string(),
        bundled_node_path,
    })
}

fn main() {
    tauri::Builder::default()
        .menu(build_menu)
        .on_menu_event(|app, event| handle_menu_event(app, event.id().as_ref()))
        .manage(DesktopServer::new())
        .setup(|app| {
            if let Some(server_url) = start_packaged_server(app.handle())? {
                start_gather_scheduler(app.handle())?;
                if let Some(window) = app.get_webview_window("main") {
                    let url = Url::parse(&server_url).map_err(|e| e.to_string())?;
                    window.navigate(url).map_err(|e| e.to_string())?;
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ollama_status,
            start_ollama_service,
            list_ollama_models,
            pull_ollama_model,
            save_model_choice,
            save_ai_roles,
            get_model_choice,
            init_local_database,
            create_local_backup,
            desktop_runtime_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running Jack Script");
}
