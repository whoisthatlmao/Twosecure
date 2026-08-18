import React, { useState } from 'react';
import { X, Plus, Trash2, Edit3, Save } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { VaultGroup } from '../types';
import { useToast } from './Toast';

interface GroupManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: VaultGroup[];
  onGroupsChanged: () => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#64748b'
];

const PRESET_ICONS = ['💼', '🏠', '🎮', '✈️', '🛒', '🎓', '🏥', '🛠️', '🚗', '📚', '💰', '🎵', '🔑', '📱', '💻', '🔐'];

export const GroupManagerModal: React.FC<GroupManagerModalProps> = ({
  isOpen, onClose, groups, onGroupsChanged
}) => {
  const { showToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);
  const [editIcon, setEditIcon] = useState(PRESET_ICONS[0]);
  const [isCreating, setIsCreating] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setIsCreating(false);
    setEditName('');
    setEditColor(PRESET_COLORS[0]);
    setEditIcon(PRESET_ICONS[0]);
  };

  const startCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const startEdit = (group: VaultGroup) => {
    setEditingId(group.id);
    setEditName(group.name);
    setEditColor(group.color);
    setEditIcon(group.icon);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      showToast('Le nom du groupe ne peut pas être vide', 'warning');
      return;
    }

    try {
      const group: VaultGroup = {
        id: isCreating ? crypto.randomUUID() : (editingId as string),
        name: editName.trim(),
        color: editColor,
        icon: editIcon,
      };

      if (isCreating) {
        await invoke('create_group', { name: group.name, color: group.color, icon: group.icon });
        showToast('Groupe créé avec succès', 'success');
      } else {
        await invoke('update_group', { group });
        showToast('Groupe mis à jour', 'success');
      }
      onGroupsChanged();
      resetForm();
    } catch (err: any) {
      showToast(`Erreur: ${err}`, 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Supprimer le groupe "${name}" ? (Les entrées de ce groupe ne seront PAS supprimées)`)) {
      return;
    }

    try {
      await invoke('delete_group', { id });
      showToast('Groupe supprimé', 'info');
      onGroupsChanged();
    } catch (err: any) {
      showToast(`Erreur: ${err}`, 'error');
    }
  };

  const renderForm = () => (
    <div style={{
      background: 'rgba(8, 6, 16, 0.6)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '16px',
      padding: '16px',
      marginBottom: '20px',
      display: 'flex', flexDirection: 'column', gap: '16px'
    }}>
      <div>
        <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(203, 213, 225, 0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', display: 'block' }}>
          Nom du groupe
        </label>
        <input
          type="text" className="input-field"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="ex: Personnel, Travail..."
          style={{ background: 'rgba(12, 9, 22, 0.8)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
          autoFocus
        />
      </div>

      <div>
        <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(203, 213, 225, 0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', display: 'block' }}>
          Couleur
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setEditColor(c)}
              style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: c, border: editColor === c ? '2px solid #fff' : '2px solid transparent',
                cursor: 'pointer', transition: 'transform 0.1s',
                transform: editColor === c ? 'scale(1.1)' : 'scale(1)',
                boxShadow: editColor === c ? `0 0 10px ${c}80` : 'none'
              }}
            />
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(203, 213, 225, 0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', display: 'block' }}>
          Icône
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {PRESET_ICONS.map(i => (
            <button
              key={i}
              onClick={() => setEditIcon(i)}
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: editIcon === i ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                border: editIcon === i ? '1px solid rgba(139, 92, 246, 0.6)' : '1px solid transparent',
                fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
        <button
          onClick={resetForm}
          style={{
            padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
            background: 'rgba(255,255,255,0.06)', color: 'rgba(203, 213, 225, 0.8)',
            border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'
          }}
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff',
            border: '1px solid rgba(16, 185, 129, 0.5)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}
        >
          <Save size={14} />
          {isCreating ? 'Créer le groupe' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(5, 5, 8, 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%', maxWidth: '480px', padding: '28px',
          background: 'rgba(12, 9, 22, 0.94)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          borderRadius: '24px', border: '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 0 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(139, 92, 246, 0.15)',
          maxHeight: '90vh', overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
            🗂️ Gestion des Groupes
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(226, 232, 240, 0.7)',
              cursor: 'pointer', width: '32px', height: '32px', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(226, 232, 240, 0.7)'; }}
          >
            <X size={16} />
          </button>
        </div>

        {(isCreating || editingId) && renderForm()}

        {!isCreating && !editingId && (
          <>
            <button
              onClick={startCreate}
              style={{
                width: '100%', padding: '12px', borderRadius: '14px',
                background: 'rgba(139, 92, 246, 0.15)', border: '1px dashed rgba(139, 92, 246, 0.4)',
                color: '#c084fc', fontSize: '14px', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: 'pointer', marginBottom: '20px', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)'; e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'; e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)'; }}
            >
              <Plus size={18} />
              Nouveau groupe
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {groups.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(203, 213, 225, 0.4)', fontSize: '13px' }}>
                  Vous n'avez pas encore créé de groupes.
                </div>
              ) : (
                groups.map(g => (
                  <div key={g.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', background: 'rgba(255,255,255,0.03)',
                    borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '20px' }}>{g.icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: g.color }}>{g.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => startEdit(g)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(203,213,225,0.6)', padding: '6px', borderRadius: '8px' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(203,213,225,0.6)'; }}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(g.id, g.name)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.7)', padding: '6px', borderRadius: '8px' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(239,68,68,0.7)'; }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
