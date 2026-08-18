import React, { useEffect, useRef, useState } from 'react';
import { Edit3, Star, Trash2, Folder, Copy } from 'lucide-react';
import { VaultEntry, VaultGroup } from '../types';

export interface ContextMenuState {
  x: number;
  y: number;
  entry: VaultEntry;
}

interface ContextMenuProps {
  menu: ContextMenuState | null;
  groups: VaultGroup[];
  onClose: () => void;
  onEdit: (entry: VaultEntry) => void;
  onToggleFavorite: (entry: VaultEntry) => void;
  onDelete: (id: string) => void;
  onMoveToGroup: (entry: VaultEntry, groupId: string | null) => void;
  onCopyUsername: (entry: VaultEntry) => void;
  onCopyPassword: (entry: VaultEntry) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  menu, groups, onClose,
  onEdit, onToggleFavorite, onDelete, onMoveToGroup,
  onCopyUsername, onCopyPassword,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [showGroupSub, setShowGroupSub] = useState(false);

  useEffect(() => {
    if (!menu) return;
    setShowGroupSub(false);

    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const handleScroll = () => onClose();

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const entry = menu.entry;
  const hasUsername = Boolean(entry.username && entry.category !== 'Note');
  const hasPassword = Boolean(entry.password && entry.category !== 'Note');

  // Adjust position to stay in viewport
  const menuWidth = 230;
  const menuHeight = 300;
  const x = Math.min(menu.x, window.innerWidth - menuWidth - 8);
  const y = Math.min(menu.y, window.innerHeight - menuHeight - 8);

  const itemStyle = (danger = false, disabled = false): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 14px', borderRadius: '8px',
    fontSize: '13px', fontWeight: 500,
    color: danger ? '#ef4444' : disabled ? 'rgba(203,213,225,0.3)' : 'rgba(226, 232, 240, 0.9)',
    cursor: disabled ? 'default' : 'pointer',
    transition: 'background 0.15s',
    userSelect: 'none',
  });

  const Item = ({ icon, label, onClick, danger = false, hasArrow = false }: {
    icon: React.ReactNode; label: string; onClick?: () => void;
    danger?: boolean; hasArrow?: boolean;
  }) => (
    <div
      style={itemStyle(danger)}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? 'rgba(239, 68, 68, 0.12)'
          : 'rgba(139, 92, 246, 0.15)';
      }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {hasArrow && <span style={{ opacity: 0.5, fontSize: '11px' }}>▶</span>}
    </div>
  );

  const Separator = () => (
    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
  );

  const currentGroupName = groups.find(g => g.id === entry.group_id)?.name;

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: x, top: y,
        zIndex: 9999,
        width: menuWidth,
        background: 'rgba(14, 10, 28, 0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(139, 92, 246, 0.35)',
        borderRadius: '14px',
        padding: '6px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(139,92,246,0.2)',
        animation: 'fadeIn 0.1s ease-out',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Entry name header */}
      <div style={{
        padding: '8px 14px 10px 14px',
        fontSize: '12px', color: 'rgba(203,213,225,0.5)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        marginBottom: '4px',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {entry.title}
        {currentGroupName && (
          <span style={{ marginLeft: 6, color: groups.find(g => g.id === entry.group_id)?.color, fontSize: '11px' }}>
            · {currentGroupName}
          </span>
        )}
      </div>

      {hasUsername && (
        <Item
          icon={<Copy size={14} />}
          label="Copier l'identifiant"
          onClick={() => { onCopyUsername(entry); onClose(); }}
        />
      )}
      {hasPassword && (
        <Item
          icon={<Copy size={14} />}
          label="Copier le mot de passe"
          onClick={() => { onCopyPassword(entry); onClose(); }}
        />
      )}

      {(hasUsername || hasPassword) && <Separator />}

      <Item
        icon={<Edit3 size={14} />}
        label="Modifier"
        onClick={() => { onEdit(entry); onClose(); }}
      />
      <Item
        icon={<Star size={14} color={entry.favorite ? '#f59e0b' : undefined} />}
        label={entry.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        onClick={() => { onToggleFavorite(entry); onClose(); }}
      />

      {/* Move to group */}
      <div
        style={{ position: 'relative' }}
        onMouseEnter={() => setShowGroupSub(true)}
        onMouseLeave={() => setShowGroupSub(false)}
      >
        <Item
          icon={<Folder size={14} />}
          label="Déplacer vers..."
          hasArrow
        />
        {showGroupSub && (
          <div style={{
            position: 'absolute',
            left: '100%', top: 0,
            width: 180,
            background: 'rgba(14, 10, 28, 0.97)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            borderRadius: '12px',
            padding: '6px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            marginLeft: '4px',
            zIndex: 10000,
          }}>
            {entry.group_id && (
              <div
                style={itemStyle()}
                onClick={() => { onMoveToGroup(entry, null); onClose(); }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Folder size={13} />
                <span>Sans groupe</span>
              </div>
            )}
            {groups.map(g => (
              <div
                key={g.id}
                style={{ ...itemStyle(), color: g.id === entry.group_id ? 'rgba(203,213,225,0.3)' : undefined }}
                onClick={() => {
                  if (g.id !== entry.group_id) { onMoveToGroup(entry, g.id); onClose(); }
                }}
                onMouseEnter={(e) => {
                  if (g.id !== entry.group_id) e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '15px' }}>{g.icon}</span>
                <span style={{ color: g.color }}>{g.name}</span>
              </div>
            ))}
            {groups.length === 0 && (
              <div style={{ padding: '8px 14px', fontSize: '12px', color: 'rgba(203,213,225,0.4)' }}>
                Aucun groupe créé
              </div>
            )}
          </div>
        )}
      </div>

      <Separator />

      <Item
        icon={<Trash2 size={14} />}
        label="Supprimer"
        danger
        onClick={() => { onDelete(entry.id); onClose(); }}
      />
    </div>
  );
};
