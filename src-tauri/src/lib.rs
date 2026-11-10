// use std::fs::DirEntry;
// use std::fs::ReadDir;
// use std::fs::read_dir;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// #[tauri::command]
// fn read_directory(name: &str) -> Vec<DirEntry> {
//     // read_dir(name).unwrap().collect::<Vec<DirEntry>>() // unwrap_or_else(|_| std::iter::empty()).collect()
//     read_dir(name).unwrap().collect()
// }

#[derive(Debug, serde::Serialize)]
struct FileSystemEntry {
    name: String,
    is_directory: bool,
    size: u64,
    time_modified: u64,
}

#[tauri::command]
fn read_directory(path: &str) -> String {
    let result = std::fs::read_dir(path);
    if result.is_err() {
        let error_message = format!("Failed to read directory: {}", result.err().unwrap());
        return serde_json::to_string(&error_message).unwrap();
    }
    let mut entries = Vec::new();
    for entry in result.unwrap() {
        let entry = entry.unwrap();
        let meta = entry.path().metadata();
        if meta.is_ok() {
            let meta = meta.unwrap();
            if !meta.is_symlink() {
                entries.push(FileSystemEntry {
                    name: entry.file_name().to_string_lossy().into_owned(),
                    is_directory: meta.is_dir(),
                    size: meta.len(),
                    time_modified: meta
                        .modified()
                        .ok()
                        .expect("No time")
                        .duration_since(std::time::SystemTime::UNIX_EPOCH)
                        .expect("Failed to calculate duration")
                        .as_secs(),
                });
            }
        }
    }
    serde_json::to_string(&entries).unwrap()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, read_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
