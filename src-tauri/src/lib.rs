use tauri::Manager;

mod api;
mod commands;
mod state;

pub use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load environment variables from .env file
    dotenvy::dotenv().ok();

    // Initialize tracing for logging
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize app state with API clients
            let state = AppState::new();
            app.manage(state);

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Voice commands
            commands::voice::transcribe_audio,
            commands::voice::text_to_speech,
            commands::voice::get_voice_status,
            commands::voice::list_voices,
            // Agent commands
            commands::agents::parse_intent,
            commands::agents::validate_data,
            commands::agents::recommend_config,
            commands::agents::chat_with_agent,
            // Data commands
            commands::data::generate_synthetic_data,
            commands::data::upload_dataset,
            commands::data::preview_dataset,
            commands::data::get_dataset_stats,
            // Research commands
            commands::research::research_domain,
            commands::research::get_research_status,
            // Training commands
            commands::training::create_training_run,
            commands::training::get_training_run,
            commands::training::list_training_runs,
            commands::training::get_training_status,
            commands::training::cancel_training_run,
            // Settings commands
            commands::settings::get_api_keys_status,
            commands::settings::set_api_key,
            commands::settings::test_api_connection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
