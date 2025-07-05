// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn test_openai_connection() -> Result<String, String> {
    use tauri_plugin_http::reqwest;
    
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.openai.com/v1/models")
        .header("Authorization", format!("Bearer {}", std::env::var("VITE_OPENAI_API_KEY").unwrap_or_default()))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let status = response.status();
    let text = response.text().await.map_err(|e| e.to_string())?;
    
    Ok(format!("Status: {}, Response: {}", status, text))
}

#[tauri::command]
async fn test_http_connection() -> Result<String, String> {
    use tauri_plugin_http::reqwest;
    
    let client = reqwest::Client::new();
    let response = client
        .get("https://httpbin.org/get")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    let status = response.status();
    let text = response.text().await.map_err(|e| e.to_string())?;
    
    Ok(format!("HTTP Test - Status: {}, Response length: {} chars", status, text.len()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, test_openai_connection, test_http_connection]);

    // Add devtools in debug mode (includes its own logging)
    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(tauri_plugin_devtools::init());
    }
    // Add logging only in release mode
    #[cfg(not(debug_assertions))]
    {
        builder = builder.plugin(tauri_plugin_log::Builder::new().build());
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
