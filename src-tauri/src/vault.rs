use serde::{Serialize, Deserialize};
use std::fs;
use std::path::PathBuf;
use totp_rs::{Algorithm, TOTP, Secret};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::crypto::{EncryptedData, MasterKey, derive_key, encrypt_bytes, decrypt_bytes};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum EntryCategory {
    Password,
    Totp,
    Card,
    Note,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VaultEntry {
    pub id: String,
    pub title: String,
    pub username: String,
    pub password: String,
    pub url: String,
    pub totp_secret: Option<String>,
    pub notes: Option<String>,
    pub category: EntryCategory,
    pub favorite: bool,
    pub created_at: u64,
    pub updated_at: u64,
    // Dedicated card fields (all optional for backwards compatibility)
    pub card_holder: Option<String>,
    pub card_number: Option<String>,
    pub card_expiry: Option<String>,
    pub card_cvv: Option<String>,
}


#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct VaultData {
    pub entries: Vec<VaultEntry>,
    #[serde(default)]
    pub trash_entries: Vec<VaultEntry>,
    #[serde(default)]
    pub telegram_config: Option<crate::telegram::TelegramConfig>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TotpResponse {
    pub code: String,
    pub seconds_remaining: u64,
}

pub fn get_current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

pub fn get_vault_file_path() -> Result<PathBuf, String> {
    let mut dir = dirs::data_dir().ok_or_else(|| "Impossible de trouver le dossier de données de l'application".to_string())?;
    dir.push("twosecure");
    fs::create_dir_all(&dir).map_err(|e| format!("Erreur création dossier vault: {}", e))?;
    dir.push("vault.enc");
    Ok(dir)
}

pub fn vault_exists() -> bool {
    get_vault_file_path().map(|p| p.exists()).unwrap_or(false)
}

pub fn save_vault(data: &VaultData, master_key: &MasterKey, salt: &[u8]) -> Result<(), String> {
    let json_bytes = serde_json::to_vec(data).map_err(|e| format!("Erreur sérialisation vault: {}", e))?;
    let encrypted = encrypt_bytes(&json_bytes, master_key, salt)?;
    let path = get_vault_file_path()?;
    let payload = serde_json::to_string_pretty(&encrypted).map_err(|e| format!("Erreur sérialisation payload: {}", e))?;
    fs::write(path, payload).map_err(|e| format!("Erreur écriture fichier vault: {}", e))?;
    Ok(())
}

pub fn load_vault(master_password: &str) -> Result<(VaultData, MasterKey, Vec<u8>), String> {
    let path = get_vault_file_path()?;
    if !path.exists() {
        return Err("Fichier de coffre-fort inexistant".to_string());
    }

    let payload_str = fs::read_to_string(path).map_err(|e| format!("Erreur lecture vault: {}", e))?;
    let encrypted: EncryptedData = serde_json::from_str(&payload_str).map_err(|e| format!("Format coffre invalide: {}", e))?;

    let salt_bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &encrypted.salt)
        .map_err(|e| format!("Salt invalide: {}", e))?;

    let (master_key, _) = derive_key(master_password, Some(&salt_bytes))?;
    let decrypted_bytes = decrypt_bytes(&encrypted, &master_key)?;

    let vault_data: VaultData = serde_json::from_slice(&decrypted_bytes)
        .map_err(|e| format!("Erreur désérialisation vault: {}", e))?;

    Ok((vault_data, master_key, salt_bytes))
}

pub fn generate_totp_code(secret_raw: &str) -> Result<TotpResponse, String> {
    // Nettoyer le secret (enlever espaces, tirets et égalités de padding)
    let cleaned_secret = secret_raw.replace(' ', "").replace('-', "").replace('=', "").to_uppercase();
    let secret = Secret::Encoded(cleaned_secret)
        .to_bytes()
        .map_err(|e| format!("Secret TOTP base32 invalide: {:?}", e))?;

    let totp = TOTP::new_unchecked(
        Algorithm::SHA1,
        6,
        1,
        30,
        secret,
        None,
        "".to_string(),
    );



    let now = get_current_timestamp();
    let seconds_remaining = 30 - (now % 30);
    let code = totp.generate_current().map_err(|e| format!("Erreur génération code: {:?}", e))?;

    Ok(TotpResponse {
        code,
        seconds_remaining,
    })
}

pub fn export_vault_to_file(path_str: &str, master_key: &MasterKey, salt: &[u8], data: &VaultData) -> Result<(), String> {
    let mut path = PathBuf::from(path_str.trim());

    // If path is empty, default to user's Documents or desktop folder
    if path_str.trim().is_empty() {
        if let Some(mut doc_dir) = dirs::document_dir() {
            doc_dir.push("twosecure_backup.2secure");
            path = doc_dir;
        } else {
            path = PathBuf::from("twosecure_backup.2secure");
        }
    } else if path.is_dir() {
        // If user gave a folder (like C:\Users\kizza\Documents\alalaa), automatically save inside it!
        path.push("twosecure_backup.2secure");
    } else if path.extension().is_none() {
        // Auto-append .2secure extension if missing
        path.set_extension("2secure");
    }

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Impossible de créer le dossier de destination: {}", e))?;
        }
    }

    let json_bytes = serde_json::to_vec(data).map_err(|e| format!("Erreur sérialisation vault: {}", e))?;
    let encrypted = encrypt_bytes(&json_bytes, master_key, salt)?;
    let payload = serde_json::to_string_pretty(&encrypted).map_err(|e| format!("Erreur sérialisation payload: {}", e))?;
    
    fs::write(&path, payload).map_err(|e| format!("Erreur écriture fichier ({:?}): {}", path, e))?;
    Ok(())
}

pub fn import_vault_from_file(path_str: &str, master_password: &str) -> Result<(VaultData, MasterKey, Vec<u8>), String> {
    let mut path = PathBuf::from(path_str.trim());
    if !path.exists() && path.extension().is_none() {
        path.set_extension("2secure");
    }

    if !path.exists() {
        return Err(format!("Le fichier n'existe pas : {:?}", path));
    }

    let payload_str = fs::read_to_string(&path).map_err(|e| format!("Erreur lecture fichier d'import: {}", e))?;
    let encrypted: EncryptedData = serde_json::from_str(&payload_str).map_err(|e| format!("Format coffre d'import invalide: {}", e))?;

    let salt_bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &encrypted.salt)
        .map_err(|e| format!("Salt invalide: {}", e))?;

    let (master_key, _) = derive_key(master_password, Some(&salt_bytes))?;
    let decrypted_bytes = decrypt_bytes(&encrypted, &master_key)?;

    let imported_data: VaultData = serde_json::from_slice(&decrypted_bytes)
        .map_err(|e| format!("Erreur désérialisation vault importé: {}", e))?;

    Ok((imported_data, master_key, salt_bytes))
}


