use serde::{Serialize, Deserialize};
use std::fs;
use std::path::PathBuf;
use std::io::{Read, Write};

use crate::crypto::{EncryptedData, MasterKey, encrypt_bytes, decrypt_bytes};
use crate::vault::get_current_timestamp;

// ──────────────────────────────────────────────────────────────────────────────
// FEATURE 2 — File Locker Chiffré
// ──────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LockerFileMeta {
    pub id: String,
    pub original_name: String,
    pub size_bytes: u64,
    pub mime_type: String,
    pub locked_at: u64,
    #[serde(default)]
    pub deleted_at: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct LockerIndex {
    files: Vec<LockerFileMeta>,
}

/// Retourne le dossier de stockage du locker
pub fn get_locker_dir() -> Result<PathBuf, String> {
    let mut dir = dirs::data_dir()
        .ok_or_else(|| "Impossible de trouver le dossier de données".to_string())?;
    dir.push("twosecure");
    dir.push("locker");
    fs::create_dir_all(&dir).map_err(|e| format!("Erreur création dossier locker: {}", e))?;
    Ok(dir)
}

fn get_locker_index_path() -> Result<PathBuf, String> {
    let mut dir = get_locker_dir()?;
    dir.push("index.enc");
    Ok(dir)
}

fn get_locker_file_path(id: &str) -> Result<PathBuf, String> {
    let mut dir = get_locker_dir()?;
    dir.push(format!("{}.enc", id));
    Ok(dir)
}

/// Charger l'index chiffré du locker
fn load_index(master_key: &MasterKey) -> Result<LockerIndex, String> {
    let path = get_locker_index_path()?;
    if !path.exists() {
        return Ok(LockerIndex::default());
    }
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Erreur lecture index locker: {}", e))?;
    let encrypted: EncryptedData = serde_json::from_str(&content)
        .map_err(|e| format!("Format index locker invalide: {}", e))?;
    let decrypted = decrypt_bytes(&encrypted, master_key)?;
    let index: LockerIndex = serde_json::from_slice(&decrypted)
        .map_err(|e| format!("Erreur désérialisation index locker: {}", e))?;
    Ok(index)
}

/// Sauvegarder l'index chiffré du locker
fn save_index(index: &LockerIndex, master_key: &MasterKey) -> Result<(), String> {
    let path = get_locker_index_path()?;
    // Utiliser un salt fixe dérivé d'un marqueur pour l'index
    let salt: Vec<u8> = b"locker_index_salt_v1".to_vec();
    let json_bytes = serde_json::to_vec(index)
        .map_err(|e| format!("Erreur sérialisation index locker: {}", e))?;
    let encrypted = encrypt_bytes(&json_bytes, master_key, &salt)?;
    let json = serde_json::to_string_pretty(&encrypted)
        .map_err(|e| format!("Erreur sérialisation index enc: {}", e))?;
    fs::write(path, json).map_err(|e| format!("Erreur écriture index locker: {}", e))?;
    Ok(())
}

/// Deviner le type MIME selon l'extension du fichier
fn guess_mime_type(filename: &str) -> String {
    let ext = std::path::Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        // Images
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        // Documents
        "pdf" => "application/pdf",
        "doc" | "docx" => "application/msword",
        "xls" | "xlsx" => "application/vnd.ms-excel",
        "ppt" | "pptx" => "application/vnd.ms-powerpoint",
        // Texte
        "txt" => "text/plain",
        "md" => "text/markdown",
        "csv" => "text/csv",
        "json" => "application/json",
        "xml" => "application/xml",
        // Archives
        "zip" => "application/zip",
        "rar" => "application/x-rar-compressed",
        "7z" => "application/x-7z-compressed",
        "tar" | "gz" => "application/x-tar",
        // Audio/Vidéo
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "mp4" => "video/mp4",
        "mkv" => "video/x-matroska",
        "avi" => "video/x-msvideo",
        // Code
        "rs" | "py" | "js" | "ts" | "html" | "css" => "text/plain",
        _ => "application/octet-stream",
    }.to_string()
}

/// Générer un UUID v4 simple sans dépendance externe
fn uuid_v4() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    format!(
        "{:08x}-{:04x}-4{:03x}-{:04x}-{:012x}",
        rng.gen::<u32>(),
        rng.gen::<u16>(),
        rng.gen::<u16>() & 0x0fff,
        (rng.gen::<u16>() & 0x3fff) | 0x8000,
        rng.gen::<u64>() & 0x0000_ffff_ffff_ffff,
    )
}

/// Lister les fichiers du locker actifs (non supprimés)
pub fn list_locker_files(master_key: &MasterKey) -> Result<Vec<LockerFileMeta>, String> {
    let index = load_index(master_key)?;
    Ok(index.files.into_iter().filter(|f| f.deleted_at.is_none()).collect())
}

/// Chiffrer un fichier et l'ajouter au locker
pub fn encrypt_file<F>(src_path: &str, master_key: &MasterKey, mut on_progress: F) -> Result<LockerFileMeta, String>
where
    F: FnMut(u32) + Send + 'static,
{
    let src = PathBuf::from(src_path.trim());
    if !src.exists() {
        return Err(format!("Fichier source introuvable: {:?}", src));
    }

    let original_name = src.file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Nom de fichier invalide".to_string())?
        .to_string();

    let mut file = fs::File::open(&src)
        .map_err(|e| format!("Erreur ouverture fichier source: {}", e))?;
    let total_size = file.metadata()
        .map_err(|e| format!("Erreur metadata: {}", e))?.len();

    let mut file_bytes = Vec::with_capacity(total_size as usize);
    let mut buffer = [0u8; 1024 * 1024]; // 1MB buffer
    let mut read_bytes = 0;

    on_progress(0);
    while let Ok(n) = file.read(&mut buffer) {
        if n == 0 { break; }
        file_bytes.extend_from_slice(&buffer[..n]);
        read_bytes += n;
        if total_size > 0 {
            let progress = (read_bytes as f64 / total_size as f64 * 30.0) as u32; // 0% to 30%
            on_progress(progress);
        }
    }

    // Stage 2: Encrypt (35%)
    on_progress(35);

    // Générer un ID unique pour ce fichier
    let id = uuid_v4();

    // Salt basé sur l'id
    let salt = id.as_bytes()[..16.min(id.len())].to_vec();
    let encrypted = encrypt_bytes(&file_bytes, master_key, &salt)?;

    // Stage 3: Serialize / Prep write (65%)
    on_progress(65);
    let json = serde_json::to_string_pretty(&encrypted)
        .map_err(|e| format!("Erreur sérialisation fichier chiffré: {}", e))?;

    let dest = get_locker_file_path(&id)?;
    let json_bytes = json.as_bytes();
    let total_write = json_bytes.len();
    let mut written = 0;
    let mut dest_file = fs::File::create(&dest)
        .map_err(|e| format!("Erreur création fichier locker: {}", e))?;

    for chunk in json_bytes.chunks(1024 * 1024) { // 1MB chunks
        dest_file.write_all(chunk)
            .map_err(|e| format!("Erreur écriture fichier locker: {}", e))?;
        written += chunk.len();
        if total_write > 0 {
            let progress = 70 + (written as f64 / total_write as f64 * 30.0) as u32; // 70% to 100%
            on_progress(progress);
        }
    }

    let mime_type = guess_mime_type(&original_name);
    let meta = LockerFileMeta {
        id: id.clone(),
        original_name,
        size_bytes: total_size,
        mime_type,
        locked_at: get_current_timestamp(),
        deleted_at: None,
    };

    // Mettre à jour l'index
    let mut index = load_index(master_key)?;
    index.files.push(meta.clone());
    save_index(&index, master_key)?;

    on_progress(100);
    Ok(meta)
}

/// Déchiffrer un fichier et l'écrire à la destination
pub fn decrypt_file<F>(id: &str, dest_path: &str, master_key: &MasterKey, mut on_progress: F) -> Result<(), String>
where
    F: FnMut(u32) + Send + 'static,
{
    let src = get_locker_file_path(id)?;
    if !src.exists() {
        return Err(format!("Fichier locker introuvable: {}", id));
    }

    on_progress(0);
    // Read JSON content chunk by chunk
    let mut file = fs::File::open(&src)
        .map_err(|e| format!("Erreur lecture fichier locker: {}", e))?;
    let total_size = file.metadata()
        .map_err(|e| format!("Erreur metadata: {}", e))?.len();

    let mut content_bytes = Vec::with_capacity(total_size as usize);
    let mut buffer = [0u8; 1024 * 1024]; // 1MB buffer
    let mut read_bytes = 0;
    while let Ok(n) = file.read(&mut buffer) {
        if n == 0 { break; }
        content_bytes.extend_from_slice(&buffer[..n]);
        read_bytes += n;
        if total_size > 0 {
            let progress = (read_bytes as f64 / total_size as f64 * 30.0) as u32; // 0% to 30%
            on_progress(progress);
        }
    }

    // Stage 2: Deserialize and Decrypt (35%)
    on_progress(35);
    let content = String::from_utf8(content_bytes)
        .map_err(|e| format!("Erreur encodage UTF8: {}", e))?;
    let encrypted: EncryptedData = serde_json::from_str(&content)
        .map_err(|e| format!("Format fichier locker invalide: {}", e))?;

    on_progress(50);
    let decrypted = decrypt_bytes(&encrypted, master_key)?;

    // Stage 3: Write decrypted plaintext file chunk by chunk (70% to 100%)
    on_progress(65);

    // Déterminer le chemin de destination
    let dest = PathBuf::from(dest_path.trim());

    // Si c'est un dossier, ajouter le nom original
    let final_dest = if dest.is_dir() || (!dest.exists() && dest.extension().is_none()) {
        // Récupérer le nom original depuis l'index
        let index = load_index(master_key)?;
        if let Some(meta) = index.files.iter().find(|f| f.id == id) {
            dest.join(&meta.original_name)
        } else {
            dest.join(format!("{}.bin", id))
        }
    } else {
        dest
    };

    if let Some(parent) = final_dest.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Impossible de créer le dossier de destination: {}", e))?;
        }
    }

    let mut dest_file = fs::File::create(&final_dest)
        .map_err(|e| format!("Erreur création fichier déchiffré: {}", e))?;

    let decrypted_len = decrypted.len();
    let mut written = 0;
    for chunk in decrypted.chunks(1024 * 1024) { // 1MB chunks
        dest_file.write_all(chunk)
            .map_err(|e| format!("Erreur écriture fichier déchiffré: {}", e))?;
        written += chunk.len();
        if decrypted_len > 0 {
            let progress = 70 + (written as f64 / decrypted_len as f64 * 30.0) as u32; // 70% to 100%
            on_progress(progress);
        }
    }

    on_progress(100);
    Ok(())
}

/// Supprimer un fichier du locker
pub fn remove_locker_file(id: &str, master_key: &MasterKey) -> Result<(), String> {
    let path = get_locker_file_path(id)?;
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("Erreur suppression fichier locker: {}", e))?;
    }

    let mut index = load_index(master_key)?;
    index.files.retain(|f| f.id != id);
    save_index(&index, master_key)?;

    Ok(())
}

/// Déchiffrer un fichier en mémoire (pour la prévisualisation, sans écrire sur disque)
pub fn preview_locker_file(id: &str, master_key: &MasterKey) -> Result<(Vec<u8>, String), String> {
    let src = get_locker_file_path(id)?;
    if !src.exists() {
        return Err(format!("Fichier locker introuvable: {}", id));
    }

    let content = fs::read_to_string(&src)
        .map_err(|e| format!("Erreur lecture fichier locker: {}", e))?;
    let encrypted: EncryptedData = serde_json::from_str(&content)
        .map_err(|e| format!("Format fichier locker invalide: {}", e))?;

    let decrypted = decrypt_bytes(&encrypted, master_key)?;

    // Get mime type from index
    let index = load_index(master_key)?;
    let mime = index.files.iter()
        .find(|f| f.id == id)
        .map(|f| f.mime_type.clone())
        .unwrap_or_else(|| "application/octet-stream".to_string());

    Ok((decrypted, mime))
}

/// Lister les fichiers de la corbeille du locker
pub fn list_trash_files(master_key: &MasterKey) -> Result<Vec<LockerFileMeta>, String> {
    let index = load_index(master_key)?;
    Ok(index.files.into_iter().filter(|f| f.deleted_at.is_some()).collect())
}

/// Mettre un fichier dans la corbeille (soft delete)
pub fn soft_delete_file(id: &str, master_key: &MasterKey) -> Result<(), String> {
    let mut index = load_index(master_key)?;
    if let Some(file) = index.files.iter_mut().find(|f| f.id == id) {
        file.deleted_at = Some(get_current_timestamp());
        save_index(&index, master_key)?;
        Ok(())
    } else {
        Err("Fichier introuvable dans le locker".to_string())
    }
}

/// Restaurer un fichier de la corbeille
pub fn restore_file(id: &str, master_key: &MasterKey) -> Result<(), String> {
    let mut index = load_index(master_key)?;
    if let Some(file) = index.files.iter_mut().find(|f| f.id == id) {
        file.deleted_at = None;
        save_index(&index, master_key)?;
        Ok(())
    } else {
        Err("Fichier introuvable dans la corbeille".to_string())
    }
}
