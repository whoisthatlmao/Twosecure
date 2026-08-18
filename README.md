<div align="center">

<img src="src-tauri/icons/128x128.png" alt="TwoSecure Logo" width="120" />

# 🔐 TwoSecure

**Gestionnaire de mots de passe chiffré, local et sécurisé**

[![Version](https://img.shields.io/badge/version-0.2.0-a855f7?style=for-the-badge)](https://github.com/whoisthatlmao/Twosecure/releases)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-24c8db?style=for-the-badge&logo=tauri)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-1.80+-f74c00?style=for-the-badge&logo=rust)](https://www.rust-lang.org)
[![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)](https://react.dev)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

*Vos secrets. Sur votre machine. Nulle part ailleurs.*

</div>

---

## ✨ Présentation

**TwoSecure** est un gestionnaire de mots de passe **100% local**, construit avec Tauri 2 (Rust + React). Toutes vos données sont chiffrées avec AES-256-GCM et Argon2id directement sur votre machine — aucun serveur, aucun cloud, aucune fuite possible.

> 🛡️ Conçu pour les utilisateurs qui ne font confiance à personne d'autre qu'eux-mêmes pour garder leurs secrets.

---

## 🚀 Fonctionnalités

### 🔒 Sécurité de base
| Fonctionnalité | Détail |
|---|---|
| **Chiffrement AES-256-GCM** | Chiffrement authentifié de bout en bout |
| **Dérivation Argon2id** | Protection contre les attaques brute-force |
| **Stockage 100% local** | Aucune donnée envoyée à l'extérieur |
| **Verrouillage automatique** | Coffre verrouillé quand l'application se ferme |

### 📂 Gestion des entrées
- **Mots de passe** — avec générateur de mots de passe fort intégré
- **Cartes bancaires** — stockage sécurisé des numéros de carte
- **Notes sécurisées** — notes privées chiffrées
- **2FA TOTP** — codes OTP intégrés dans les entrées de mots de passe
- **Favoris** — accès rapide à vos entrées importantes
- **Corbeille des entrées** — suppression sécurisée avec restauration possible

### 🗄️ File Locker (Chiffrement de Fichiers)
- **Chiffrement local de fichiers** — Sécurisez n'importe quel fichier lourd avec AES-256-GCM.
- **Performances Asynchrones** — Les opérations de chiffrement/déchiffrement se font en tâche de fond (Threads Rust) pour garantir la fluidité de l'interface avec une **barre de progression en temps réel (0-100%)**.
- **Corbeille dédiée** — Soft-delete pour récupérer vos fichiers chiffrés effacés par erreur avant suppression définitive.

### 🔍 Audit de sécurité
- Détection des mots de passe **faibles** (entropie < 50 bits)
- Détection des mots de passe **réutilisés**
- Score de sécurité global du coffre
- Exclusion automatique des cartes bancaires et notes

### 🤖 Double Authentification Telegram (optionnel)
- Confirmation d'ouverture du coffre via bot Telegram
- Configuration optionnelle dans les Paramètres
- Entièrement configurable avec votre propre bot token

### ⚙️ Paramètres avancés
- **Changement du mot de passe maître** avec re-chiffrement complet
- **Export/Import** du coffre (JSON chiffré)
- **Réinitialisation** du coffre
- **Mise à jour automatique** via GitHub Releases

### 🖥️ Expérience utilisateur
- Icône dans la **barre des tâches** (tray icon) pour accès rapide
- Interface **glassmorphism** sombre et moderne
- **Notifications toast** personnalisées
- Affichage du **nom d'utilisateur** du système
- Fenêtre avec **thème sombre** natif Windows

---

## 🛠️ Stack Technique

### Backend (Rust)
| Technologie | Rôle |
|---|---|
| **[Tauri 2](https://tauri.app)** | Framework natif multi-plateforme |
| **[AES-256-GCM](https://docs.rs/aes-gcm)** (`aes-gcm`) | Chiffrement authentifié |
| **[Argon2id](https://docs.rs/argon2)** (`argon2`) | Dérivation de clé maître |
| **[TOTP](https://docs.rs/totp-rs)** (`totp-rs`) | Génération de codes 2FA |
| **[Serde](https://serde.rs)** | Sérialisation JSON |
| **[Reqwest](https://docs.rs/reqwest)** | Appels API Telegram |
| **[Rand](https://docs.rs/rand)** | Génération cryptographique aléatoire |

### Frontend (React / TypeScript)
| Technologie | Rôle |
|---|---|
| **[React 18](https://react.dev)** | Interface utilisateur |
| **[TypeScript](https://www.typescriptlang.org)** | Typage fort |
| **[Vite 7](https://vitejs.dev)** | Build tool ultra-rapide |
| **[Lucide React](https://lucide.dev)** | Icônes modernes |
| **[@tauri-apps/api](https://tauri.app/v2/api/js/)** | Bridge Tauri JS |
| **[@tauri-apps/plugin-updater](https://github.com/tauri-apps/plugins-workspace)** | Mise à jour automatique |
| **Vanilla CSS** | Styles glassmorphism personnalisés |

### Architecture de chiffrement
```
Mot de passe maître
        ↓
   Argon2id (salt 32 bytes, 3 passes, 64MB mémoire)
        ↓
   Clé dérivée 256-bit
        ↓
   AES-256-GCM (nonce aléatoire 96-bit par opération)
        ↓
   Vault chiffré (stocké dans %APPDATA%/twosecure/)
```

---

## 📦 Installation

### Télécharger l'installeur
Rendez-vous sur la page [Releases](https://github.com/whoisthatlmao/Twosecure/releases) et téléchargez l'installeur Windows.

```
TwoSecure_x.x.x_x64-setup.exe
```

### Compiler depuis les sources

**Prérequis :**
- [Rust](https://www.rust-lang.org/tools/install) 1.80+
- [Node.js](https://nodejs.org) 18+
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

```bash
# Cloner le repo
git clone https://github.com/whoisthatlmao/Twosecure.git
cd Twosecure

# Installer les dépendances
npm install

# Lancer en mode développement
npm run tauri dev

# Compiler en production
npm run tauri build
```

---

## 🔄 Mise à jour automatique

TwoSecure supporte les mises à jour automatiques signées via [tauri-plugin-updater](https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/updater).

- Les mises à jour sont vérifiées depuis ce dépôt GitHub (`releases/latest.json`)
- Chaque mise à jour est **signée cryptographiquement** (minisign)
- La vérification de la signature se fait **avant** l'installation

---

## 🔐 Sécurité

### Modèle de menace
TwoSecure protège contre :
- ✅ Vol physique de l'appareil (coffre chiffré)
- ✅ Accès non autorisé à la session Windows
- ✅ Fuites vers des serveurs tiers (100% local)
- ✅ Attaques par dictionnaire (Argon2id)

TwoSecure ne protège **pas** contre :
- ❌ Malware ayant accès à la mémoire du processus
- ❌ Keyloggers au niveau matériel
- ❌ Compromission de votre session Windows active

### Stockage des données
```
Windows: %APPDATA%\com.twosecure.app\
└── vault.enc    # Coffre chiffré (AES-256-GCM)
└── config.json  # Configuration Telegram (non chiffrée)
```

---

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créez votre branche (`git checkout -b feature/ma-fonctionnalite`)
3. Committez vos changements (`git commit -m 'Ajout de ma fonctionnalité'`)
4. Poussez sur la branche (`git push origin feature/ma-fonctionnalite`)
5. Ouvrez une Pull Request

---

## 📄 Licence

Distribué sous licence **MIT**. Voir [LICENSE](LICENSE) pour plus d'informations.

---

<div align="center">

Fait avec ❤️ et 🦀 Rust par **whoisthatlmao**

*Si TwoSecure vous est utile, ⭐ le projet !*

</div>
