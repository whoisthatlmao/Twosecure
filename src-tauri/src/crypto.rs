use argon2::{password_hash::rand_core::OsRng, Argon2, Params};

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rand::{Rng, RngCore};
use serde::{Deserialize, Serialize};
use zeroize::{Zeroize, ZeroizeOnDrop};

/// Structure holding a secure key in memory with automatic zeroization on drop.
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct MasterKey {
    pub key_bytes: [u8; 32],
}

impl Clone for MasterKey {
    fn clone(&self) -> Self {
        Self { key_bytes: self.key_bytes }
    }
}

impl MasterKey {
    pub fn new(bytes: [u8; 32]) -> Self {
        Self { key_bytes: bytes }
    }
}

/// Encrypted payload structure containing cipher text, salt, and nonce encoded in base64.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EncryptedData {
    pub ciphertext: String,
    pub nonce: String,
    pub salt: String,
}

/// Derive a 256-bit key from a master password using Argon2id.
pub fn derive_key(
    master_password: &str,
    salt_bytes: Option<&[u8]>,
) -> Result<(MasterKey, Vec<u8>), String> {
    let salt_vec: Vec<u8> = match salt_bytes {
        Some(s) => s.to_vec(),
        None => {
            let mut s = [0u8; 16];
            OsRng.fill_bytes(&mut s);
            s.to_vec()
        }
    };

    // Argon2id parameters: 19MB memory, 2 iterations, 1 parallelism
    let params =
        Params::new(19456, 2, 1, Some(32)).map_err(|e| format!("Argon2 params error: {}", e))?;
    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);

    let mut key_output = [0u8; 32];
    argon2
        .hash_password_into(master_password.as_bytes(), &salt_vec, &mut key_output)
        .map_err(|e| format!("Argon2 derivation error: {}", e))?;

    let master_key = MasterKey::new(key_output);
    Ok((master_key, salt_vec))
}

/// Encrypt plaintext string using AES-256-GCM.
pub fn encrypt_bytes(
    data: &[u8],
    key: &MasterKey,
    salt_vec: &[u8],
) -> Result<EncryptedData, String> {
    let cipher_key = Key::<Aes256Gcm>::from_slice(&key.key_bytes);
    let cipher = Aes256Gcm::new(cipher_key);

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, data)
        .map_err(|e| format!("AES-GCM encryption error: {}", e))?;

    Ok(EncryptedData {
        ciphertext: BASE64.encode(&ciphertext),
        nonce: BASE64.encode(&nonce_bytes),
        salt: BASE64.encode(salt_vec),
    })
}

/// Decrypt ciphertext using AES-256-GCM and derived key.
pub fn decrypt_bytes(encrypted: &EncryptedData, key: &MasterKey) -> Result<Vec<u8>, String> {
    let cipher_key = Key::<Aes256Gcm>::from_slice(&key.key_bytes);
    let cipher = Aes256Gcm::new(cipher_key);

    let nonce_bytes = BASE64
        .decode(&encrypted.nonce)
        .map_err(|e| format!("Invalid nonce base64: {}", e))?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext_bytes = BASE64
        .decode(&encrypted.ciphertext)
        .map_err(|e| format!("Invalid ciphertext base64: {}", e))?;

    let plaintext = cipher
        .decrypt(nonce, ciphertext_bytes.as_ref())
        .map_err(|_| {
            "Déchiffrement échoué : Mot de passe maître incorrect ou coffre altéré".to_string()
        })?;

    Ok(plaintext)
}

/// Generate a cryptographically secure random password based on custom criteria.
pub fn generate_secure_password(
    length: usize,
    include_upper: bool,
    include_lower: bool,
    include_digits: bool,
    include_symbols: bool,
) -> String {
    let mut charset = String::new();
    if include_upper {
        charset.push_str("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }
    if include_lower {
        charset.push_str("abcdefghijklmnopqrstuvwxyz");
    }
    if include_digits {
        charset.push_str("0123456789");
    }
    if include_symbols {
        charset.push_str("!@#$%^&*()_+-=[]{}|;:,.<>?");
    }

    if charset.is_empty() {
        charset
            .push_str("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()");
    }

    let charset_bytes = charset.as_bytes();
    let mut rng = rand::thread_rng();
    (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..charset_bytes.len());
            charset_bytes[idx] as char
        })
        .collect()
}
