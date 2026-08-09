# TwoSecure — Walkthrough & État du Projet

> Dernière mise à jour : **2026-08-09**
> Écrit par l'agent IA pour reprendre la session sans perte de contexte et offrir une vision 360° du projet.

---

## 🧭 Vue d'ensemble du projet

**TwoSecure** est un gestionnaire de mots de passe, cartes bancaires, notes chiffrées et codes TOTP (2FA) **chiffré localement**, construit avec :
- **Frontend** : React 19 + TypeScript + Vite (`src/`)
- **Backend** : Rust + Tauri v2 (`src-tauri/`)
- **Chiffrement** : Argon2id (dérivation de clé) + AES-256-GCM (chiffrement authentifié des données)
- **Mises à jour & Tray** : Plugin Updater Tauri v2 & System Tray Icon natif

Le coffre-fort principal est stocké dans un fichier chiffré **`vault.enc`** situé dans le dossier de données de l'application Windows (`%APPDATA%\twosecure\vault.enc`).

---

## ✅ Fonctionnalités Implémentées & État de l'Application

| Fonctionnalité | Status | Description |
|---|---|---|
| Création / Verrouillage Master Password | ✅ | Dérivation Argon2id (19MB, 2 itérations), zérisation mémoire zeroize |
| **Modification du Mot de Passe Maître** | ✅ | Changement sécurisé du master password avec rechiffrement du coffre dans les Paramètres |
| **2FA Telegram Optionnelle** | ✅ | Configuration PUSH Telegram facultative via le menu Paramètres |
| **Interface Modale Confirmation (ConfirmModal)** | ✅ | Remplacement de toutes les boîtes natifs `window.confirm` par une modale moderne néon |
| **Formulaires Simplifiés & Audit Filtré** | ✅ | Fusion TOTP/Mot de passe et exclusion automatique des Cartes Bancaires de l'audit de mots de passe |
| Jauge de Force du Mot de passe | ✅ | Calculateur d'entropie $E = L \times \log_2(C)$, détection de répétitions |
| Auto-effacement du presse-papier | ✅ | Nettoyage automatique du presse-papier système après 30s avec timer live |
| Auto-lock sur inactivité | ✅ | Verrouillage automatique après 5 min sans activité (warning à 30s) |
| Import / Export chiffré | ✅ | Format `.2secure` chiffré portable Argon2id+AES ou JSON/CSV |
| Corbeille de Restauration | ✅ | Fichier `trash.enc` chiffré pour restaurer ou détruire des entrées |
| Audit de Sécurité | ✅ | Score de santé global, détection des réutilisations et mots de passe faibles |
| **System Tray Icon (Barre des tâches)** | ✅ | Accès rapide, masquage/affichage 1-clic, menu contextuel (Afficher, Verrouiller, Quitter) |
| **Mise à jour automatique (Tauri Updater)** | ✅ | Vérification et installation des versions avec `@tauri-apps/plugin-updater` et `tauri-plugin-updater` |
| **Signature de code Windows (SmartScreen)** | ✅ | Config `tauri.conf.json` pour la signature numérique d'installeur (anti-SmartScreen) |

---

## 🗂️ Structure complète des fichiers

```
Twosecure/
├── TwoSecure.exe                    ← Binaire standalone (release)
├── index.html                       ← Entry HTML Vite
├── vite.config.ts                   ← Config Vite (port 1420)
├── package.json                     ← Dépendances React, Tauri API & Updater
├── src/
│   ├── main.tsx                     ← Point d'entrée React
│   ├── App.tsx                      ← Composant racine (état principal)
│   ├── App.css
│   ├── index.css                    ← Design system CSS (tokens, verre néon)
│   ├── types.ts                     ← Types TypeScript (VaultEntry, TotpResponse, etc.)
│   ├── hooks/
│   │   └── useAutoLock.ts           ← Hook d'auto-verrouillage sur inactivité
│   └── components/
│       ├── VaultLock.tsx            ← Écran de déverrouillage / création vault
│       ├── Sidebar.tsx              ← Barre latérale (navigation, statut, MàJ, Paramètres)
│       ├── Header.tsx               ← Barre de recherche & boutons rapides
│       ├── EntryList.tsx            ← Grille des cartes avec timers 2FA et CB
│       ├── EntryModal.tsx           ← Modal de création/édition d'entrée
│       ├── TotpCard.tsx             ← Composant TOTP live
│       ├── PasswordGenerator.tsx   ← Générateur de mots de passe
│       ├── PasswordStrengthBar.tsx  ← Jauge d'entropie néon 5 niveaux
│       ├── ImportExportModal.tsx    ← Import / Export chiffré & portable
│       ├── TrashModal.tsx           ← Corbeille de restauration chiffrée
│       ├── SecurityAuditModal.tsx   ← Calculateur de score de santé du coffre (exclut CB)
│       ├── TelegramSetupModal.tsx   ← Configuration facultative du bot Telegram 2FA
│       ├── TelegramAuthModal.tsx    ← Modal d'attente d'approbation Push 2FA (si activé)
│       ├── SettingsModal.tsx        ← Paramètres (Mot de passe maître, 2FA Telegram, Réinitialisation)
│       ├── ConfirmModal.tsx         ← Boîte de dialogue de confirmation moderne en verre néon
│       ├── UpdateModal.tsx          ← Recherche et installation des mises à jour Tauri
│       └── Toast.tsx                
