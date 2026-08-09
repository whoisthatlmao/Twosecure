import React, { useState, useEffect } from 'react';
import { X, Trash2, RotateCcw, ShieldAlert, Key, CreditCard, FileText } from 'lucide-react';

import { invoke } from '@tauri-apps/api/core';
import { VaultEntry } from '../types';
import { useToast } from './Toast';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  isOpen, onClose, onRestoreSuccess,
}) => {
  const { showToast } = useToast();
  const [trashItems, setTrashItems] = useState<VaultEntry[]>([]);
  const [_loading, setLoading] = useState(false);


  const loadTrash = async () => {
    setLoading(true);
    try {
      const items: VaultEntry[] = await invoke('get_trash_entries');
      setTrashItems(items);
    } catch (err: any) {
      console.error('Erreur chargement corbeille:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTrash();
    }
  }, [isOpen]);

  const handleRestore = async (entry: VaultEntry) => {
    try {
      await invoke('restore_entry', { id: entry.id });
      showToast(`"${entry.title}" a été restauré dans le coffre-fort`, 'success');
      loadTrash();
      onRestoreSuccess();
    } catch (err: any) {
      showToast(`Erreur restauration : ${err?.toString() || err}`, 'error');
    }
  };

  const handlePurgeSingle = async (entry: VaultEntry) => {
    try {
      await invoke('purge_trash_entry', { id: entry.id });
      showToast(`"${entry.title}" a été définitivement supprimé`, 'info');
      loadTrash();
    } catch (err: any) {
      showToast(`Erreur suppression : ${err?.toString() || err}`, 'error');
    }
  };

  const handleEmptyTrash = async () => {
    if (trashItems.length === 0) return;
    try {
      await invoke('empty_trash');
      showToast('La corbeille a été entièrement vidée', 'info');
      setTrashItems([]);
    } catch (err: any) {
      showToast(`Erreur vidage corbeille : ${err?.toString() || err}`, 'error');
    }
  };

  if (!isOpen) return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Totp': return ShieldAlert;
      case 'Card': return CreditCard;
      case 'Note': return FileText;
      default:     return Key;
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(5, 5, 8, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%', maxWidth: '560px',
          padding: '28px',
          background: 'rgba(12, 9, 22, 0.94)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderRadius: '24px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 0 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(139, 92, 246, 0.15)',
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(168,85,247,0.15))',
              border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)',
            }}>
              <Trash2 size={20} color="#ef4444" />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
                Corbeille de restauration
              </h2>
              <span style={{ fontSize: '11px', color: 'rgba(203, 213, 225, 0.5)' }}>
                {trashItems.length} élément{trashItems.length > 1 ? 's' : ''} supprimé{trashItems.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {trashItems.length > 0 && (
              <button
                type="button"
                onClick={handleEmptyTrash}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  fontSize: '12px', fontWeight: 600,
                  padding: '6px 12px', borderRadius: '10px',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
              >
                Vider la corbeille
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(226, 232, 240, 0.7)',
                cursor: 'pointer',
                width: '32px', height: '32px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(226, 232, 240, 0.7)'; }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }} className="no-scrollbar">
          {trashItems.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '40px 20px', color: 'rgba(203, 213, 225, 0.4)', gap: '12px',
            }}>
              <Trash2 size={36} color="rgba(203, 213, 225, 0.2)" />
              <span style={{ fontSize: '13.5px' }}>La corbeille est vide</span>
            </div>
          ) : (
            trashItems.map((item) => {
              const Icon = getCategoryIcon(item.category);
              return (
                <div
                  key={item.id}
                  style={{
                    background: 'rgba(8, 6, 16, 0.65)',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={16} color="#c084fc" />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </span>
                      <span style={{ fontSize: '11px', color: 'rgba(203, 213, 225, 0.45)' }}>
                        {item.username || item.card_holder || item.category}
                        {item.totp_secret && ' · avec 2FA'}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleRestore(item)}
                      title="Restaurer cet élément"
                      style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981',
                        padding: '6px 10px', borderRadius: '8px',
                        fontSize: '12px', fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)'; }}
                    >
                      <RotateCcw size={13} />
                      <span>Restaurer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePurgeSingle(item)}
                      title="Supprimer définitivement"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
                        color: 'rgba(239, 68, 68, 0.6)', borderRadius: '6px', transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(239, 68, 68, 0.6)'; }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
