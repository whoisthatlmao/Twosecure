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

/// Outer wrapper file stored as vault.enc JSON
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VaultContainer {
    /// Encrypted VaultData bytes using MasterKey
    pub encrypted_vault: EncryptedData,
    /// Encrypted MasterKey bytes using RecoveryKey (derived from recovery phrase)
    #[serde(default)]
    pub recovery_payload: Option<EncryptedData>,
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
    save_vault_with_recovery(data, master_key, salt, None)
}

pub fn save_vault_with_recovery(
    data: &VaultData,
    master_key: &MasterKey,
    salt: &[u8],
    recovery_phrase: Option<&str>,
) -> Result<(), String> {
    let json_bytes = serde_json::to_vec(data).map_err(|e| format!("Erreur sérialisation vault: {}", e))?;
    let encrypted_vault = encrypt_bytes(&json_bytes, master_key, salt)?;

    let path = get_vault_file_path()?;
    
    // Si un recovery_phrase est fourni, on calcule le recovery_payload
    // Sinon, on préserve l'ancien s'il existait déjà dans le fichier vault.enc !
    let mut existing_recovery_payload = None;
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(container) = serde_json::from_str::<VaultContainer>(&content) {
                existing_recovery_payload = container.recovery_payload;
            }
        }
    }

    let recovery_payload = if let Some(phrase) = recovery_phrase {
        if !phrase.trim().is_empty() {
            let normalized = phrase.trim().replace('-', " ").to_uppercase();
            let (rec_key, rec_salt) = derive_key(&normalized, None)?;
            Some(encrypt_bytes(&master_key.key_bytes, &rec_key, &rec_salt)?)
        } else {
            None
        }
    } else {
        existing_recovery_payload
    };

    let container = VaultContainer {
        encrypted_vault,
        recovery_payload,
    };

    let payload = serde_json::to_string_pretty(&container).map_err(|e| format!("Erreur sérialisation payload: {}", e))?;
    fs::write(path, payload).map_err(|e| format!("Erreur écriture fichier vault: {}", e))?;
    Ok(())
}

pub fn load_vault(input_secret: &str) -> Result<(VaultData, MasterKey, Vec<u8>), String> {
    let path = get_vault_file_path()?;
    if !path.exists() {
        return Err("Fichier de coffre-fort inexistant".to_string());
    }

    let payload_str = fs::read_to_string(path).map_err(|e| format!("Erreur lecture vault: {}", e))?;
    
    // Tenter d'abord de lire avec la nouvelle structure VaultContainer
    let container: VaultContainer = match serde_json::from_str(&payload_str) {
        Ok(c) => c,
        Err(_) => {
            // Compatibilité ascendante si le fichier était l'ancienne version (EncryptedData direct)
            if let Ok(enc_direct) = serde_json::from_str::<EncryptedData>(&payload_str) {
                VaultContainer {
                    encrypted_vault: enc_direct,
                    recovery_payload: None,
                }
            } else {
                return Err("Format coffre invalide".to_string());
            }
        }
    };

    let salt_bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &container.encrypted_vault.salt)
        .map_err(|e| format!("Salt invalide: {}", e))?;

    // 1. Tenter le déchiffrement direct avec le Mot de Passe Maître
    if let Ok((master_key, _)) = derive_key(input_secret, Some(&salt_bytes)) {
        if let Ok(decrypted_bytes) = decrypt_bytes(&container.encrypted_vault, &master_key) {
            if let Ok(vault_data) = serde_json::from_slice::<VaultData>(&decrypted_bytes) {
                return Ok((vault_data, master_key, salt_bytes));
            }
        }
    }

    // 2. Si échec direct, générer toutes les candidates de la phrase de secours
    let raw_upper = input_secret.trim().to_uppercase();
    let mut candidates = Vec::new();

    let v1 = raw_upper.replace('-', " ").split_whitespace().collect::<Vec<_>>().join(" ");
    candidates.push(v1);

    let word_list = [
        "ALPHA", "BRAVO", "COBALT", "DELTA", "ECHO", "FALCON", "GALAXY", "HORIZON",
        "INDIGO", "JAGUAR", "KRYPTON", "LUNAR", "MATRIX", "NEBULA", "ORION", "PHOENIX",
        "QUANTUM", "RUBY", "SILVER", "TITAN", "ULTRA", "VIPER", "ZENITH", "SHIELD",
        "AURORA", "CYBER", "DRAGON", "ECLIPSE", "FUSION", "HYDRA", "LEGEND", "OMEGA"
    ];

    let clean_alphanumeric: String = raw_upper.chars().filter(|c| c.is_alphanumeric()).collect();
    
    for w1 in &word_list {
        if clean_alphanumeric.starts_with(w1) {
            let rest = &clean_alphanumeric[w1.len()..];
            for w2 in &word_list {
                if rest.starts_with(w2) {
                    let num_part = &rest[w2.len()..];
                    if !num_part.is_empty() {
                        let candidate_split = format!("{} {} {}", w1, w2, num_part);
                        candidates.push(candidate_split);
                    }
                }
            }
        }
    }

    // Tester si une candidate déchiffre la recovery_payload (ou directement le coffre)
    if let Some(ref rec_payload) = container.recovery_payload {
        let rec_salt_bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &rec_payload.salt).ok();
        for candidate in &candidates {
            if candidate.is_empty() {
                continue;
            }
            if let Ok((rec_key, _)) = derive_key(candidate, rec_salt_bytes.as_deref()) {
                // Tenter de déchiffrer la master_key stockée dans recovery_payload
                if let Ok(master_key_bytes) = decrypt_bytes(rec_payload, &rec_key) {
                    if master_key_bytes.len() == 32 {
                        let mut array = [0u8; 32];
                        array.copy_from_slice(&master_key_bytes);
                        let master_key = MasterKey::new(array);
                        if let Ok(decrypted_bytes) = decrypt_bytes(&container.encrypted_vault, &master_key) {
                            if let Ok(vault_data) = serde_json::from_slice::<VaultData>(&decrypted_bytes) {
                                return Ok((vault_data, master_key, salt_bytes));
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Fallback : au cas où le coffre entier aurait été chiffré directement avec la phrase de secours
    for candidate in &candidates {
        if candidate.is_empty() {
            continue;
        }
        if let Ok((rec_key, _)) = derive_key(candidate, Some(&salt_bytes)) {
            if let Ok(decrypted_bytes) = decrypt_bytes(&container.encrypted_vault, &rec_key) {
                if let Ok(vault_data) = serde_json::from_slice::<VaultData>(&decrypted_bytes) {
                    return Ok((vault_data, rec_key, salt_bytes));
                }
            }
        }
    }

    Err("Mot de passe maître ou code de récupération incorrect".to_string())
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dual_key_unlock() {
        let master_pass = "SuperMasterPassword123!";
        let recovery_phrase = "QUANTUM COBALT 428";

        let (master_key, salt) = derive_key(master_pass, None).unwrap();
        let test_vault = VaultData::default();

        // Sauvegarder avec recovery phrase
        save_vault_with_recovery(&test_vault, &master_key, &salt, Some(recovery_phrase)).unwrap();

        // 1. Tester le déchiffrement avec le Mot de Passe Maître
        let (loaded_master, _, _) = load_vault(master_pass).expect("Doit se déverrouiller avec le Mot de Passe Maître");
        assert_eq!(loaded_master.entries.len(), 0);

        // 2. Tester le déchiffrement avec la Phrase de Secours
        let (loaded_rec, _, _) = load_vault(recovery_phrase).expect("Doit se déverrouiller avec la Phrase de Secours");
        assert_eq!(loaded_rec.entries.len(), 0);

        // 3. Tester avec minuscules / espaces / tirets sur la phrase de secours
        let (loaded_formatted, _, _) = load_vault("quantum-cobalt-428").expect("Doit se déverrouiller avec la phrase formatée avec tirets");
        assert_eq!(loaded_formatted.entries.len(), 0);

        // Nettoyer
        let _ = fs::remove_file(get_vault_file_path().unwrap());
    }
}


