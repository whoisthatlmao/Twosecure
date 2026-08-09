import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { VaultEntry } from './types';
import { VaultLock } from './components/VaultLock';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { EntryList } from './components/EntryList';
import { EntryModal } from './components/EntryModal';
import { PasswordGenerator } from './components/PasswordGenerator';
import { ImportExportModal } from './components/ImportExportModal';
import { TrashModal } from './components/TrashModal';
import { SecurityAuditModal } from './components/SecurityAuditModal';
import { SettingsModal } from './components/SettingsModal';
import { UpdateModal } from './components/UpdateModal';
import { TelegramSetupModal } from './components/TelegramSetupModal';
import { useToast } from './components/Toast';
import { useAutoLock } from './hooks/useAutoLock';

export function App() {
  const { showToast } = useToast();
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [currentCategory, setCurrentCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<VaultEntry | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isTelegramSetupOpen, setIsTelegramSetupOpen] = useState(false);

  const checkStatus = async () => {
    try {
      const initialized: boolean = await invoke('is_vault_initialized');
      setIsInitialized(initialized);
    } catch (err) {
      console.error('Erreur de vérification du statut vault:', err);
      setIsInitialized(false);
    }
  };

  const loadEntries = async () => {
    try {
      const loaded: VaultEntry[] = await invoke('get_entries');
      setEntries(loaded);
    } catch (err) {
      console.error('Erreur chargement entrées:', err);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      loadEntries();
    }
  }, [isUnlocked]);

  const handleLock = useCallback(async () => {
    try {
      await invoke('lock_vault');
      setIsUnlocked(false);
      setEntries([]);
      showToast('Coffre-fort verrouillé avec succès', 'info', 3000);
    } catch (err) {
      console.error('Erreur verrouillage:', err);
    }
  }, [showToast]);

  const handleResetVault = useCallback(async () => {
    try {
      await invoke('reset_vault');
      setIsUnlocked(false);
      setEntries([]);
      showToast('Coffre-fort réinitialisé. Vous pouvez créer un nouveau coffre.', 'info', 5000);
      await checkStatus();
    } catch (err: any) {
      showToast(`Erreur réinitialisation : ${err}`, 'error');
    }
  }, [showToast]);

  // Auto-lock after 5 minutes of inactivity with 30s warning toast
  useAutoLock(
    isUnlocked,
    5,
    handleLock,
    useCallback(() => {
      showToast('Inactivité détectée : verrouillage automatique dans 30s', 'warning', 6000);
    }, [showToast])
  );

  const handleSaveEntry = async (entry: VaultEntry) => {
    try {
      if (entryToEdit) {
        await invoke('update_entry', { entry });
        showToast(`"${entry.title}" mis à jour avec succès`, 'success');
      } else {
        await invoke('add_entry', { entry });
        showToast(`"${entry.title}" ajouté au coffre-fort`, 'success');
      }
      loadEntries();
    } catch (err: any) {
      showToast(`Erreur sauvegarde : ${err?.toString() || err}`, 'error');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const target = entries.find((e) => e.id === id);
    try {
      await invoke('delete_entry', { id });
      showToast(`"${target?.title || 'Élément'}" déplacé dans la corbeille`, 'info');
      loadEntries();
    } catch (err: any) {
      showToast(`Erreur suppression : ${err?.toString() || err}`, 'error');
    }
  };

  const handleToggleFavorite = async (entry: VaultEntry) => {
    try {
      const updated = { ...entry, favorite: !entry.favorite };
      await invoke('update_entry', { entry: updated });
      showToast(
        updated.favorite ? `"${entry.title}" ajouté aux favoris` : `"${entry.title}" retiré des favoris`,
        'info',
        2500
      );
      loadEntries();
    } catch (err: any) {
      showToast(`Erreur favori : ${err?.toString() || err}`, 'error');
    }
  };

  if (isInitialized === null) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: '#050508',
        color: '#5c5878',
        gap: '16px',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.2))',
          border: '1px solid rgba(168,85,247,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <span style={{ fontSize: '13px', color: '#8b5cf6' }}>Chargement de 2Secure...</span>
      </div>
    );
  }

  if (!isUnlocked) {
    return <VaultLock isInitialized={isInitialized} onUnlocked={() => setIsUnlocked(true)} />;
  }

  // Filter entries
  const filteredEntries = entries.filter((item) => {
    const matchesCategory =
      currentCategory === 'all'
        ? true
        : currentCategory === 'favorites'
        ? item.favorite
        : currentCategory === 'Totp'
        ? (item.category === 'Totp' || Boolean(item.totp_secret))
        : item.category === currentCategory;

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(query) ||
      item.username.toLowerCase().includes(query) ||
      item.url.toLowerCase().includes(query) ||
      (item.card_holder && item.card_holder.toLowerCase().includes(query));

    return matchesCategory && matchesSearch;
  });

  const entryCounts = {
    all: entries.length,
    favorites: entries.filter((e) => e.favorite).length,
    Password: entries.filter((e) => e.category === 'Password').length,
    Totp: entries.filter((e) => e.category === 'Totp' || Boolean(e.totp_secret)).length,
    Card: entries.filter((e) => e.category === 'Card').length,
    Note: entries.filter((e) => e.category === 'Note').length,
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#050508' }}>
      <Sidebar
        currentCategory={currentCategory}
        onSelectCategory={setCurrentCategory}
        entryCounts={entryCounts}
        onLock={handleLock}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenImportExport={() => setIsImportExportOpen(true)}
        onOpenTrash={() => setIsTrashOpen(true)}
        onOpenAudit={() => setIsAuditOpen(true)}
        onOpenUpdate={() => setIsUpdateOpen(true)}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#050508' }}>
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddClick={() => {
            setEntryToEdit(null);
            setIsModalOpen(true);
          }}
          onOpenGenerator={() => setIsGeneratorOpen(true)}
        />

        <EntryList
          entries={filteredEntries}
          onEdit={(entry) => {
            setEntryToEdit(entry);
            setIsModalOpen(true);
          }}
          onDelete={handleDeleteEntry}
          onToggleFavorite={handleToggleFavorite}
        />
      </main>

      <EntryModal
        isOpen={isModalOpen}
        entryToEdit={entryToEdit}
        onClose={() => {
          setIsModalOpen(false);
          setEntryToEdit(null);
        }}
        onSave={handleSaveEntry}
      />

      <PasswordGenerator
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        onImportSuccess={loadEntries}
      />

      <TrashModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        onRestoreSuccess={loadEntries}
      />

      <SecurityAuditModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        entries={entries}
        onEditEntry={(entry) => {
          setEntryToEdit(entry);
          setIsModalOpen(true);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetVault={handleResetVault}
        onOpenTelegramSetup={() => setIsTelegramSetupOpen(true)}
      />

      <UpdateModal
        isOpen={isUpdateOpen}
        onClose={() => setIsUpdateOpen(false)}
      />

      <TelegramSetupModal
        isOpen={isTelegramSetupOpen}
        onCancel={() => setIsTelegramSetupOpen(false)}
        onLinked={() => {
          setIsTelegramSetupOpen(false);
          showToast('Compte Telegram associé avec succès !', 'success');
        }}
      />
    </div>
  );
}

export default App;
