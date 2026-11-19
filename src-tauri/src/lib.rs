use std::collections::HashMap;
use std::sync::LazyLock;
use std::sync::Mutex;
use std::io::Error;

/*
   Shared state between calls to read_directory

   A HashMap of id -> bool to track whether a particular id is tracked (and canceled)

    MUTEX_TASK_MAP.lock().unwrap() yields the HashMap in a thread-safe way
*/
static MUTEX_TASK_MAP: LazyLock<Mutex<HashMap<i32, bool>>> = LazyLock::new(|| Mutex::new(HashMap::new()));

#[tauri::command]
fn cancel_task(id: i32) -> () {
    // Obtain the task list. Warning: unwrap() may fail if another task has panic-ed while locking the Mutex
    let mut task_map = MUTEX_TASK_MAP.lock().unwrap();
    match (*task_map).get(&id) {
        // We know this id
        Some(canceled) => { 
            if *canceled {
                println!("Error: unable to cancel task #{id}: task was already canceled")
            } else { 
                // Set the task to canceled
                (*task_map).insert(id, true);
                println!("Canceled task #{id}"); 
            } 
        },
        None => println!("Error: unable to cancel task #{id}: task not found"),
    }
}

#[derive(Debug, serde::Serialize)]
struct FileSystemEntry {
    name: String,
    is_directory: bool,
    size: u64,
    time_modified: u64,
}

fn read_directory_impl(path: &str, task_id: i32) -> Result<Vec<FileSystemEntry>, Error> {
    let result = std::fs::read_dir(path);
    if result.is_err() {
        let error_message = format!(
            "[{task_id}]: Failed to read directory: {}",
            result.err().unwrap()
        );
        return Err(Error::other(error_message)); // serde_json::to_string(&error_message).unwrap();
    }
    let mut entries = Vec::new();
    for entry in result.unwrap() {
        // Try to lock:
        {
            let task_map = MUTEX_TASK_MAP.lock().unwrap();
            match (*task_map).get(&task_id) {
                Some(canceled) => {
                    if *canceled {
                        println!("Aborting read of '{path}' because task was canceled");
                        return Ok(Vec::new());
                    }
                    // println!("Canceled = {canceled}");
                },
                None => println!("Error: task #{task_id} not found"),
            }
        }
        let entry = entry.unwrap();
        let meta = entry.path().metadata();
        if meta.is_ok() {
            let meta = meta.unwrap();
            if !meta.is_symlink() {
                let name = entry.file_name().to_string_lossy().into_owned();
                entries.push(FileSystemEntry {
                    name: name,
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
    Ok(entries)
}

#[tauri::command]
fn read_directory(path: &str, id: i32) -> String {
    // Add the supplied ID to the task map
    {
        let mut task_map = MUTEX_TASK_MAP.lock().unwrap();
        (*task_map).insert(id, false);
    }
    println!("Reading directory '{path}' with id #{id}");

    let entries = read_directory_impl(path, id);
    // Remove ourselves from the task map
    {
        let mut task_map = MUTEX_TASK_MAP.lock().unwrap();
        match (*task_map).remove(&id) {
            Some(canceled) => println!("Removed task #{id}, canceled was {canceled}"),
            None => println!("Error: failed to remove task #{id}")
        }
    }

    // Return the entries or an error
    match entries {
        Ok(entries) => serde_json::to_string(&entries).unwrap(),
        Err(e) => serde_json::to_string(&format!("{e}")).unwrap()
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![read_directory, cancel_task])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
