mod crypto;
mod vault;
pub mod telegram;

use std::sync::Mutex;
use tauri::{State, Manager};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButtonState, MouseButton};

use vault::{VaultData, VaultEntry, TotpResponse, vault_exists, save_vault, save_vault_with_recovery, load_vault, generate_totp_code, get_current_timestamp, export_vault_to_file, import_vault_from_file};
use crypto::{MasterKey, derive_key, generate_secure_password};
use telegram::{TelegramConfig, send_telegram_auth_prompt, send_linking_code, send_telegram_message, poll_telegram_approval, TelegramAuthStatus, DEFAULT_BOT_TOKEN, DEFAULT_CHAT_ID};

pub struct AppState {
    pub master_key: Mutex<Option<MasterKey>>,
    pub salt: Mutex<Option<Vec<u8>>>,
    pub vault_data: Mutex<Option<VaultData>>,
    /// Temporary linking code stored in memory during the setup process
    pub pending_link_code: Mutex<Option<String>>,
}

#[tauri::command]
fn is_vault_initialized() -> bool {
    vault_exists()
}

#[tauri::command]
fn get_username() -> String {
    std::env::var("USERNAME")
        .or_else(|_| std::env::var("USER"))
        .unwrap_or_else(|_| "Utilisateur".to_string())
}

#[tauri::command]
fn create_vault(state: State<'_, AppState>, master_password: String, recovery_phrase: Option<String>) -> Result<String, String> {
    if vault_exists() {
        return Err("Le coffre-fort existe déjà sur cette machine".to_string());
    }

    if master_password.len() < 8 {
        return Err("Le mot de passe maître doit comporter au moins 8 caractères".to_string());
    }

    // 1. Toujours dériver la clé principale du mot de passe maître
    let (master_key, salt) = derive_key(&master_password, None)?;
    let initial_vault = VaultData::default();

    save_vault_with_recovery(&initial_vault, &master_key, &salt, recovery_phrase.as_deref())?;

    *state.master_key.lock().unwrap() = Some(master_key);
    *state.salt.lock().unwrap() = Some(salt);
    *state.vault_data.lock().unwrap() = Some(initial_vault);

    Ok("Coffre-fort créé et verrouillé avec succès".to_string())
}

#[tauri::command]
fn unlock_vault(state: State<'_, AppState>, master_password: String) -> Result<usize, String> {
    let (vault_data, master_key, salt) = load_vault(&master_password)?;
    let count = vault_data.entries.len();

    *state.master_key.lock().unwrap() = Some(master_key);
    *state.salt.lock().unwrap() = Some(salt);
    *state.vault_data.lock().unwrap() = Some(vault_data);

    Ok(count)
}

#[tauri::command]
fn lock_vault(state: State<'_, AppState>) -> Result<(), String> {
    *state.master_key.lock().unwrap() = None;
    *state.salt.lock().unwrap() = None;
    *state.vault_data.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
fn get_entries(state: State<'_, AppState>) -> Result<Vec<VaultEntry>, String> {
    let guard = state.vault_data.lock().unwrap();
    let vault = guard.as_ref().ok_or_else(|| "Coffre-fort verrouillé".to_string())?;
    Ok(vault.entries.clone())
}

#[tauri::command]
fn add_entry(state: State<'_, AppState>, mut entry: VaultEntry) -> Result<VaultEntry, String> {
    let mut vault_guard = state.vault_data.lock().unwrap();
    let vault = vault_guard.as_mut().ok_or_else(|| "Coffre-fort verrouillé".to_string())?;
    let key_guard = state.master_key.lock().unwrap();
    let key = key_guard.as_ref().ok_or_else(|| "Clé maître non disponible".to_string())?;
    let salt_guard = state.salt.lock().unwrap();
    let salt = salt_guard.as_ref().ok_or_else(|| "Sel non disponible".to_string())?;

    let now = get_current_timestamp();
    entry.created_at = now;
    entry.updated_at = now;

    vault.entries.push(entry.clone());
    save_vault(vault, key, salt)?;

    Ok(entry)
}

#[tauri::command]
fn update_entry(state: State<'_, AppState>, mut entry: VaultEntry) -> Result<VaultEntry, String> {
    let mut vault_guard = state.vault_data.lock().unwrap();
    let vault = vault_guard.as_mut().ok_or_else(|| "Coffre-fort verrouillé".to_string())?;
    let key_guard = state.master_key.lock().unwrap();
    let key = key_guard.as_ref().ok_or_else(|| "Clé maître non disponible".to_string())?;
    let salt_guard = state.salt.lock().unwrap();
    let salt = salt_guard.as_ref().ok_or_else(|| "Sel non disponible".to_string())?;

    if let Some(existing) = vault.entries.iter_mut().find(|e| e.id == entry.id) {
        entry.updated_at = get_current_timestamp();
        *existing = entry.clone();
        save_vault(vault, key, salt)?;
        Ok(entry)
    } else {
        Err("Entrée non trouvée".to_string())
    }
}

#[tauri::command]
fn delete_entry(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let mut vault_guard = state.vault_data.lock().unwrap();
    let vault = vault_guard.as_mut().ok_or_else(|| "Coffre-fort verrouillé".to_string())?;
    let key_guard = state.master_key.lock().unwrap();
    let key = key_guard.as_ref().ok_or_else(|| "Clé maître non disponible".to_string())?;
    let salt_guard = state.salt.lock().unwrap();
    let salt = salt_guard.as_ref().ok_or_else(|| "Sel non disponible".to_string())?;

    if let Some(pos) = vault.entries.iter().position(|e| e.id == id) {
        let removed = vault.entries.remove(pos);
        vault.trash_entries.push(removed);
        save_vault(vault, key, salt)?;
    }
    Ok(())
}

#[tauri::command]
fn get_trash_entries(state: State<'_, AppState>) -> Result<Vec<VaultEntry>, String> {
    let guard = state.vault_data.lock().unwrap();
    let vault = guard.as_ref().ok_or_else(|| "Coffre-fort verrouillé".to_string())?;
    Ok(vault.trash_entries.clone())
}

#[tauri::command]
fn restore_entry(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let mut vault_guard = state.vault_data.lock().unwrap();
    let vault = vault_guard.as_mut().ok_or_else(|| "Coffre-fort verrouillé".to_string())?;
    let key_guard = state.master_key.lock().unwrap();
    let key = key_guard.as_ref().ok_or_else(|| "Clé maître non disponible".to_string())?;
    let salt_guard = state.salt.lock().unwrap();
    let salt = salt_guard.as_ref().ok_or_else(|| "Sel non disponible".to_string())?;

    if let Some(pos) = vault.trash_entries.iter().position(|e| e.id == id) {
        let restored = vault.trash_entries.remove(pos);
        vault.entries.push(restored);
        save_vault(vault, key, salt)?;
    }
    Ok(())
}

#[tauri::command]
fn purge_trash_entry(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let mut vault_guard = state.vault_data.lock().unwrap();
    let vault = vault_guard.as_mut().ok_or_else(|| "Coffre-fort verrouillé".to_string())?;
    let key_guard = state.master_key.lock().unwrap();
    let key = key_guard.as_ref().ok_or_else(|| "Clé maître non disponible".to_string())?;
    let salt_guard = state.salt.lock().unwrap();
    let salt = salt_guard.as_ref().ok_or_else(|| "Sel non disponible".to_string())?;

    vault.trash_entries.retain(|e| e.id != id);
    save_vault(vault, key, salt)?;
    Ok(())
}

#[tauri::command]
fn empty_trash(state: State<'_, AppState>) -> Result<(), String> {
    let mut vault_guard = state.vault_data.lock().unwrap();
    let vault = vault_guard.as_mut().ok_or_else(|| "Coffre-fort verrouillé".to_string())?;
    let key_guard = state.master_key.lock().unwrap();
    let key = key_guard.as_ref().ok_or_else(|| "Clé maître non disponible".to_string())?;
    let salt_guard = state.salt.lock().unwrap();
    let salt = salt_guard.as_ref().ok_or_else(|| "Sel non disponible".to_string())?;

    vault.trash_entries.clear();
    save_vault(vault, key, salt)?;
    Ok(())
}

#[tauri::command]
fn generate_totp(secret: String) -> Result<TotpResponse, String> {
    generate_totp_code(&secret)
}

#[tauri::command]
fn generate_password(length: usize, upper: bool, lower: bool, digits: bool, symbols: bool) -> String {
    generate_secure_password(length, upper, lower, digits, symbols)
}

#[tauri::command]
fn export_vault(state: State<'_, AppState>, file_path: String) -> Result<(), String> {
    let vault_guard = state.vault_data.lock().unwrap();
    let vault = vault_guard.as_ref().ok_or_else(|| "Coffre-fort verrouillé".to_string())?;
    let key_guard = state.master_key.lock().unwrap();
    let key = key_guard.as_ref().ok_or_else(|| "Clé maître non disponible".to_string())?;
    let salt_guard = state.salt.lock().unwrap();
    let salt = salt_guard.as_ref().ok_or_else(|| "Sel non disponible".to_string())?;

    export_vault_to_file(&file_path, key, salt, vault)
}

#[tauri::command]
fn import_vault(state: State<'_, AppState>, file_path: String, master_password: String) -> Result<usize, String> {
    let (imported_data, master_key, salt) = import_vault_from_file(&file_path, &master_password)?;
    let count = imported_data.entries.len();

    // Save imported vault as current vault
    save_vault(&imported_data, &master_key, &salt)?;

    *state.master_key.lock().unwrap() = Some(master_key);
    *state.salt.lock().unwrap() = Some(salt);
    *state.vault_data.lock().unwrap() = Some(imported_data);

    Ok(count)
}

// ════════════ TELEGRAM 2FA COMMANDS ════════════

/// Step 1 of setup: generate a random 6-digit code and send it to user's Telegram
#[tauri::command]
async fn initiate_telegram_link(
    state: State<'_, AppState>,
    bot_token: Option<String>,
    chat_id: Option<String>,
) -> Result<(), String> {
    let token = bot_token
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_BOT_TOKEN.to_string());
    let id = chat_id
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_CHAT_ID.to_string());

    // Generate a random 6-digit code
    let code: u32 = {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        use std::time::{SystemTime, UNIX_EPOCH};
        let mut h = DefaultHasher::new();
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().subsec_nanos().hash(&mut h);
        std::thread::current().id().hash(&mut h);
        100000 + (h.finish() % 900000) as u32
    };
    let code_str = code.to_string();

    // Store in memory (not on disk — no vault needed yet)
    *state.pending_link_code.lock().unwrap() = Some(code_str.clone());

    // Send code to Telegram
    send_linking_code(&token, &id, &code_str).await?;

    Ok(())
}

/// Step 2 of setup: user enters the code they received on Telegram to confirm link
#[tauri::command]
async fn verify_telegram_link(
    state: State<'_, AppState>,
    code: String,
    bot_token: Option<String>,
    chat_id: Option<String>,
) -> Result<bool, String> {
    let token = bot_token
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_BOT_TOKEN.to_string());
    let id = chat_id
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_CHAT_ID.to_string());

    let expected = state.pending_link_code.lock().unwrap().clone();
    match expected {
        None => Err("Aucun code de liaison en attente. Cliquez d'abord sur 'Envoyer le code'.".to_string()),
        Some(expected_code) => {
            if code.trim() == expected_code {
                // Clear the pending code
                *state.pending_link_code.lock().unwrap() = None;

                // Mark linked in vault if it's already unlocked
                {
                    let mut vault_guard = state.vault_data.lock().unwrap();
                    if let Some(vault) = vault_guard.as_mut() {
                        let key_guard = state.master_key.lock().unwrap();
                        let salt_guard = state.salt.lock().unwrap();
                        if let (Some(key), Some(salt)) = (key_guard.as_ref(), salt_guard.as_ref()) {
                            let config = vault.telegram_config.get_or_insert_with(TelegramConfig::default);
                            config.linked = true;
                            config.bot_token = token.clone();
                            config.chat_id = id.clone();
                            let _ = save_vault(vault, key, salt);
                        }
                    }
                }

                // Send confirmation message to Telegram
                let _ = send_telegram_message(
                    &token,
                    &id,
                    "✅ <b>Compte lié avec succès !</b>\n\nVotre PC est maintenant lié à ce compte Telegram.\nÀ chaque déverrouillage de 2Secure, vous recevrez une notification d'approbation ici."
                ).await;

                Ok(true)
            } else {
                Ok(false)
            }
        }
    }
}

/// Check if Telegram is configured and linked
#[tauri::command]
fn get_telegram_config(state: State<'_, AppState>) -> TelegramConfig {
    let guard = state.vault_data.lock().unwrap();
    if let Some(vault) = guard.as_ref() {
        if let Some(config) = &vault.telegram_config {
            return config.clone();
        }
    }
    TelegramConfig::default()
}

/// Update Telegram config (enable/disable, edit token/chat_id)
#[tauri::command]
fn save_telegram_config(state: State<'_, AppState>, config: TelegramConfig) -> Result<(), String> {
    let mut vault_guard = state.vault_data.lock().unwrap();
    let vault = vault_guard.as_mut().ok_or_else(|| "Coffre-fort verrouillé".to_string())?;
    let key_guard = state.master_key.lock().unwrap();
    let key = key_guard.as_ref().ok_or_else(|| "Clé maître non disponible".to_string())?;
    let salt_guard = state.salt.lock().unwrap();
    let salt = salt_guard.as_ref().ok_or_else(|| "Sel non disponible".to_string())?;

    vault.telegram_config = Some(config);
    save_vault(vault, key, salt)?;
    Ok(())
}

/// Reset Telegram linking state so next login triggers setup flow again
#[tauri::command]
fn unlink_telegram(state: State<'_, AppState>) -> Result<(), String> {
    let mut vault_guard = state.vault_data.lock().unwrap();
    let vault = vault_guard.as_mut().ok_or_else(|| "Coffre-fort verrouillé".to_string())?;
    let key_guard = state.master_key.lock().unwrap();
    let key = key_guard.as_ref().ok_or_else(|| "Clé maître non disponible".to_string())?;
    let salt_guard = state.salt.lock().unwrap();
    let salt = salt_guard.as_ref().ok_or_else(|| "Sel non disponible".to_string())?;

    if let Some(cfg) = &mut vault.telegram_config {
        cfg.linked = false;
    } else {
        vault.telegram_config = Some(TelegramConfig {
            enabled: true,
            bot_token: String::new(),
            chat_id: String::new(),
            linked: false,
        });
    }
    save_vault(vault, key, salt)?;
    Ok(())
}

/// Send the approval prompt (inline keyboard) to Telegram
#[tauri::command]
async fn send_telegram_prompt(
    state: State<'_, AppState>,
    auth_code: String,
) -> Result<(), String> {
    let (token, id) = {
        let guard = state.vault_data.lock().unwrap();
        if let Some(vault) = guard.as_ref() {
            if let Some(cfg) = &vault.telegram_config {
                (cfg.bot_token.clone(), cfg.chat_id.clone())
            } else {
                (DEFAULT_BOT_TOKEN.to_string(), DEFAULT_CHAT_ID.to_string())
            }
        } else {
            (DEFAULT_BOT_TOKEN.to_string(), DEFAULT_CHAT_ID.to_string())
        }
    };

    send_telegram_auth_prompt(&token, &id, &auth_code).await
}

/// Poll for the user's response (approved / denied / pending)
#[tauri::command]
async fn check_telegram_prompt(
    state: State<'_, AppState>,
    auth_code: String,
) -> Result<String, String> {
    let (token, id) = {
        let guard = state.vault_data.lock().unwrap();
        if let Some(vault) = guard.as_ref() {
            if let Some(cfg) = &vault.telegram_config {
                (cfg.bot_token.clone(), cfg.chat_id.clone())
            } else {
                (DEFAULT_BOT_TOKEN.to_string(), DEFAULT_CHAT_ID.to_string())
            }
        } else {
            (DEFAULT_BOT_TOKEN.to_string(), DEFAULT_CHAT_ID.to_string())
        }
    };

    let status = poll_telegram_approval(&token, &auth_code).await?;
    match status {
        TelegramAuthStatus::Approved => {
            let _ = send_telegram_message(
                &token,
                &id,
                "✅ <b>Déverrouillage approuvé !</b>\nVotre coffre-fort 2Secure est maintenant déverrouillé."
            ).await;
            Ok("approved".to_string())
        },
        TelegramAuthStatus::Denied => {
            let _ = send_telegram_message(
                &token,
                &id,
                "❌ <b>Accès refusé.</b>\nLe déverrouillage de 2Secure a été bloqué."
            ).await;
            Ok("denied".to_string())
        },
        TelegramAuthStatus::Pending => Ok("pending".to_string()),
    }
}

/// Delete the vault file to reset everything (for testing)
#[tauri::command]
fn reset_vault(state: State<'_, AppState>) -> Result<(), String> {
    // Lock the vault first
    *state.master_key.lock().unwrap() = None;
    *state.salt.lock().unwrap() = None;
    *state.vault_data.lock().unwrap() = None;
    *state.pending_link_code.lock().unwrap() = None;

    // Delete the vault file
    let vault_path = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("twosecure")
        .join("vault.enc");

    if vault_path.exists() {
        std::fs::remove_file(&vault_path)
            .map_err(|e| format!("Erreur suppression vault: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
fn change_master_password(
    state: State<'_, AppState>,
    current_password: String,
    new_password: String,
) -> Result<(), String> {
    if new_password.len() < 8 {
        return Err("Le nouveau mot de passe maître doit comporter au moins 8 caractères".to_string());
    }

    let (vault_data, _old_key, _old_salt) = load_vault(&current_password)?;
    let (new_key, new_salt) = derive_key(&new_password, None)?;

    save_vault(&vault_data, &new_key, &new_salt)?;

    *state.master_key.lock().unwrap() = Some(new_key);
    *state.salt.lock().unwrap() = Some(new_salt);
    *state.vault_data.lock().unwrap() = Some(vault_data);

    Ok(())
}

#[tauri::command]
fn force_reset_master_password(
    state: State<'_, AppState>,
    _new_password: String,
    recovery_phrase: Option<String>,
) -> Result<(), String> {
    if _new_password.len() < 8 {
        return Err("Le nouveau mot de passe maître doit comporter au moins 8 caractères".to_string());
    }

    let mut vault_guard = state.vault_data.lock().unwrap();
    let vault_data = vault_guard
        .as_ref()
        .cloned()
        .ok_or_else(|| "Coffre-fort non déverrouillé en mémoire".to_string())?;

    // Dériver la nouvelle clé principale directement depuis le NOUVEAU MOT DE PASSE MAÎTRE
    let (new_key, new_salt) = derive_key(&_new_password, None)?;

    save_vault_with_recovery(&vault_data, &new_key, &new_salt, recovery_phrase.as_deref())?;

    *state.master_key.lock().unwrap() = Some(new_key);
    *state.salt.lock().unwrap() = Some(new_salt.clone());
    *vault_guard = Some(vault_data);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Capture les panics et les écrit dans un fichier log pour le debug
    std::panic::set_hook(Box::new(|info| {
        let msg = format!("PANIC: {:?}", info);
        let _ = std::fs::write("twosecure_crash.log", &msg);
        eprintln!("{}", msg);
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState {
            master_key: Mutex::new(None),
            salt: Mutex::new(None),
            vault_data: Mutex::new(None),
            pending_link_code: Mutex::new(None),
        })
        .setup(|app| {
            let show_i = MenuItem::with_id(app, "show", "Afficher TwoSecure", true, None::<&str>)?;
            let lock_i = MenuItem::with_id(app, "lock", "Verrouiller le coffre-fort", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quitter", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &lock_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "lock" => {
                        let state = app.state::<AppState>();
                        let _ = lock_vault(state);
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.center();
                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })

        .invoke_handler(tauri::generate_handler![
            is_vault_initialized,
            create_vault,
            unlock_vault,
            lock_vault,
            get_entries,
            add_entry,
            update_entry,
            delete_entry,
            get_trash_entries,
            restore_entry,
            purge_trash_entry,
            empty_trash,
            generate_totp,
            generate_password,
            export_vault,
            import_vault,
            initiate_telegram_link,
            verify_telegram_link,
            send_telegram_prompt,
            check_telegram_prompt,
            get_telegram_config,
            save_telegram_config,
            unlink_telegram,
            reset_vault,
            change_master_password,
            force_reset_master_password,
            get_username,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}



