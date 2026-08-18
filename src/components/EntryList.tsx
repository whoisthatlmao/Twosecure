import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Key, Eye, EyeOff, Copy, Check, Star, Edit3, Trash2,
  ShieldAlert, CreditCard, FileText, ExternalLink,
  Settings2, ChevronDown, ChevronRight, Folder
} from 'lucide-react';
import { VaultEntry, VaultGroup } from '../types';
import { TotpCard } from './TotpCard';
import { useToast } from './Toast';
import { invoke } from '@tauri-apps/api/core';
import { ContextMenu, ContextMenuState } from './ContextMenu';

const CLIPBOARD_CLEAR_DELAY = 30;

interface EntryListProps {
  entries: VaultEntry[];
  groups?: VaultGroup[];
  onEdit: (entry: VaultEntry) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (entry: VaultEntry) => void;
  onOpenGroupManager?: () => void;
  onEntriesChanged?: () => void;
}

// ──────────── FieldBox (standalone, no hooks issues) ────────────
const FieldBox = React.memo(({
  label, value, copyId, isSecret = false, isCardNumber = false,
  clipTimers, copiedId, onCopy,
}: {
  label: string; value: string; copyId: string;
  isSecret?: boolean; isCardNumber?: boolean;
  clipTimers: Record<string, number>; copiedId: string | null;
  onCopy: (text: string, id: string, label: string) => void;
}) => {
  const [shown, setShown] = useState(false);
  const remaining = clipTimers[copyId];
  const isCopied = copiedId === copyId;

  return (
    <div style={{
      background: 'rgba(10, 8, 18, 0.6)',
      border: '1px solid rgba(139, 92, 246, 0.15)',
      borderRadius: '16px', padding: '12px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 'calc(10px * var(--zoom-font-comp, 1))', fontWeight: 700, color: 'rgba(203, 213, 225, 0.45)', display: 'block', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '2px' }}>
          {label}
        </span>
        <span
          className={isCardNumber ? 'card-number-field' : isSecret ? 'font-mono' : ''}
          style={{ fontSize: 'calc(13.5px * var(--zoom-font-comp, 1))', color: '#ffffff', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {isSecret && !shown ? '••••••••••••' : value}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {isSecret && (
          <button
            onClick={() => setShown(!shown)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(203, 213, 225, 0.5)', transition: 'color 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#8b5cf6'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(203, 213, 225, 0.5)'; }}
          >
            {shown ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        <button
          onClick={() => onCopy(value, copyId, label)}
          title={remaining ? `Effacement dans ${remaining}s` : 'Copier'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: isCopied ? '#10b981' : remaining ? '#f59e0b' : 'rgba(203, 213, 225, 0.5)',
            transition: 'color 0.2s', display: 'flex', alignItems: 'center', gap: '4px',
          }}
          onMouseEnter={(e) => { if (!isCopied) e.currentTarget.style.color = '#8b5cf6'; }}
          onMouseLeave={(e) => { if (!isCopied) e.currentTarget.style.color = remaining ? '#f59e0b' : 'rgba(203, 213, 225, 0.5)'; }}
        >
          {isCopied ? <Check size={16} /> : <Copy size={16} />}
          {remaining && !isCopied && (
            <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', minWidth: '22px' }}>{remaining}s</span>
          )}
        </button>
      </div>
    </div>
  );
});

// ──────────── Ghost Card (follows mouse during drag) ────────────
const GhostCard = ({ entry, x, y, group }: { entry: VaultEntry; x: number; y: number; group?: VaultGroup }) => {
  const color = group?.color || '#7c3aed';
  return (
    <div
      className="ghost-card-grabbed"
      style={{
        position: 'fixed',
        left: x + 16, top: y - 20,
        zIndex: 9998,
        pointerEvents: 'none',
        width: '220px',
        background: 'rgba(14, 10, 28, 0.92)',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${color}80`,
        borderRadius: '16px',
        padding: '12px 16px',
        boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 30px ${color}40`,
        transition: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: '18px',
        }}>
          {group ? group.icon : '🔑'}
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {entry.title}
          </div>
          {entry.username && (
            <div style={{ fontSize: '11px', color: 'rgba(203,213,225,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {entry.username}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const EntryList: React.FC<EntryListProps> = ({
  entries, groups = [], onEdit, onDelete, onToggleFavorite, onOpenGroupManager, onEntriesChanged
}) => {
  const { showToast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [clipTimers, setClipTimers] = useState<Record<string, number>>({});
  const clearTimerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Mouse-based drag state
  const [dragEntry, setDragEntry] = useState<VaultEntry | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dropTargetGroupId, setDropTargetGroupId] = useState<string | null>(null); // null = ungrouped
  const [dropTargetActive, setDropTargetActive] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const copyToClipboard = useCallback((text: string, id: string, label = 'Élément') => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`${label} copié ! Effacement dans ${CLIPBOARD_CLEAR_DELAY}s`, 'success', 4000);
    if (clearTimerRefs.current[id]) clearTimeout(clearTimerRefs.current[id]);
    let remaining = CLIPBOARD_CLEAR_DELAY;
    setClipTimers((prev) => ({ ...prev, [id]: remaining }));
    const tick = setInterval(() => {
      remaining -= 1;
      setClipTimers((prev) => ({ ...prev, [id]: remaining }));
      if (remaining <= 0) {
        clearInterval(tick);
        navigator.clipboard.writeText('');
        setCopiedId(null);
        setClipTimers((prev) => { const n = { ...prev }; delete n[id]; return n; });
        showToast('Presse-papier effacé automatiquement', 'info', 3000);
      }
    }, 1000);
    clearTimerRefs.current[id] = setTimeout(() => clearInterval(tick), (CLIPBOARD_CLEAR_DELAY + 1) * 1000);
    setTimeout(() => setCopiedId(null), 2000);
  }, [showToast]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Totp': return ShieldAlert;
      case 'Card': return CreditCard;
      case 'Note': return FileText;
      default: return Key;
    }
  };

  const { grouped, ungrouped } = useMemo(() => {
    const groupedData: Record<string, VaultEntry[]> = {};
    const ungroupedData: VaultEntry[] = [];
    groups.forEach(g => groupedData[g.id] = []);
    entries.forEach(entry => {
      if (entry.group_id && groupedData[entry.group_id]) {
        groupedData[entry.group_id].push(entry);
      } else {
        ungroupedData.push(entry);
      }
    });
    return { grouped: groupedData, ungrouped: ungroupedData };
  }, [entries, groups]);

  // ──────────── Mouse DnD ────────────
  const handleCardMouseDown = useCallback((e: React.MouseEvent, entry: VaultEntry) => {
    if (e.button !== 0) return; // left button only
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStartPos.current.x;
      const dy = ev.clientY - dragStartPos.current.y;
      if (!isDragging.current && Math.sqrt(dx * dx + dy * dy) > 6) {
        isDragging.current = true;
        setDragEntry(entry);
        document.body.classList.add('is-dragging');
      }
      if (isDragging.current) {
        setDragPos({ x: ev.clientX, y: ev.clientY });

        // Detect drop target via element under cursor
        const els = document.elementsFromPoint(ev.clientX, ev.clientY);
        const dropEl = els.find(el => el.hasAttribute('data-dropzone'));
        
        // Remove .drag-over from all other dropzones
        document.querySelectorAll('[data-dropzone]').forEach(el => {
          if (el !== dropEl) el.classList.remove('drag-over');
        });

        if (dropEl) {
          dropEl.classList.add('drag-over');
          const gid = dropEl.getAttribute('data-dropzone');
          setDropTargetGroupId(gid === 'ungrouped' ? null : gid);
          setDropTargetActive(true);
        } else {
          setDropTargetActive(false);
          setDropTargetGroupId(null);
        }
      }
    };

    const onMouseUp = async (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.classList.remove('is-dragging');
      document.querySelectorAll('[data-dropzone]').forEach(el => el.classList.remove('drag-over'));

      if (!isDragging.current) {
        setDragEntry(null);
        return;
      }

      // Find drop target
      const els = document.elementsFromPoint(ev.clientX, ev.clientY);
      const dropEl = els.find(el => el.hasAttribute('data-dropzone'));

      if (dropEl) {
        const gidAttr = dropEl.getAttribute('data-dropzone');
        const targetGroupId = gidAttr === 'ungrouped' ? null : gidAttr;

        if (targetGroupId !== entry.group_id) {
          try {
            await invoke('update_entry', { entry: { ...entry, group_id: targetGroupId } });
            if (targetGroupId) {
              const grp = groups.find(g => g.id === targetGroupId);
              showToast(`"${entry.title}" déplacé dans ${grp?.name || 'le groupe'}`, 'success');
            } else {
              showToast(`"${entry.title}" retiré du groupe`, 'info');
            }
            onEntriesChanged?.();
          } catch (err: any) {
            showToast(`Erreur: ${err}`, 'error');
          }
        }
      }

      isDragging.current = false;
      setDragEntry(null);
      setDropTargetActive(false);
      setDropTargetGroupId(null);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [groups, onEntriesChanged, showToast]);

  // Disable default context menu globally
  useEffect(() => {
    const prevent = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', prevent);
    return () => document.removeEventListener('contextmenu', prevent);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, entry: VaultEntry) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, entry });
  }, []);

  const handleMoveToGroup = useCallback(async (entry: VaultEntry, groupId: string | null) => {
    try {
      await invoke('update_entry', { entry: { ...entry, group_id: groupId } });
      if (groupId) {
        const grp = groups.find(g => g.id === groupId);
        showToast(`"${entry.title}" déplacé dans ${grp?.name || 'le groupe'}`, 'success');
      } else {
        showToast(`"${entry.title}" retiré du groupe`, 'info');
      }
      onEntriesChanged?.();
    } catch (err: any) {
      showToast(`Erreur: ${err}`, 'error');
    }
  }, [groups, onEntriesChanged, showToast]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // ──────────── Entry Card ────────────
  const renderEntryCard = (entry: VaultEntry) => {
    const Icon = getCategoryIcon(entry.category);
    const group = groups.find(g => g.id === entry.group_id);
    const accentColor = group?.color || (entry.category === 'Card' ? '#1a6fb5' : '#7c3aed');
    const accentColorEnd = group ? group.color + '99' : (entry.category === 'Card' ? '#0f4c81' : '#4f46e5');
    const isBeingDragged = dragEntry?.id === entry.id;

    return (
      <div
        key={entry.id}
        onMouseDown={(e) => handleCardMouseDown(e, entry)}
        onContextMenu={(e) => handleContextMenu(e, entry)}
        className="glass-panel"
        style={{
          padding: '24px', borderRadius: '24px',
          background: 'rgba(13, 10, 24, 0.65)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${group ? group.color + '40' : 'rgba(139, 92, 246, 0.15)'}`,
          boxShadow: `0 0 25px ${group ? group.color + '15' : 'rgba(139, 92, 246, 0.08)'}`,
          display: 'flex', flexDirection: 'column', gap: '16px',
          transition: 'all 0.3s ease-in-out',
          cursor: 'grab',
          opacity: isBeingDragged ? 0.35 : 1,
          transform: isBeingDragged ? 'scale(0.96)' : 'scale(1)',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          if (isBeingDragged) return;
          e.currentTarget.style.borderColor = group ? group.color + '70' : 'rgba(139, 92, 246, 0.35)';
          e.currentTarget.style.boxShadow = `0 0 35px ${group ? group.color + '25' : 'rgba(139, 92, 246, 0.18)'}`;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          if (isBeingDragged) return;
          e.currentTarget.style.borderColor = group ? group.color + '40' : 'rgba(139, 92, 246, 0.15)';
          e.currentTarget.style.boxShadow = `0 0 25px ${group ? group.color + '15' : 'rgba(139, 92, 246, 0.08)'}`;
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '14px',
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColorEnd} 100%)`,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px ${accentColor}55`, flexShrink: 0,
            }}>
              {group
                ? <span style={{ fontSize: '20px', lineHeight: 1 }}>{group.icon}</span>
                : <Icon size={20} color="#ffffff" />
              }
            </div>
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <h3 style={{ fontSize: 'calc(16.5px * var(--zoom-font-comp, 1))', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {entry.title}
              </h3>
              {entry.url && (
                <a
                  href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
                  target="_blank" rel="noreferrer"
                  onMouseDown={(e) => e.stopPropagation()} // prevent drag on link click
                  style={{ fontSize: 'calc(12px * var(--zoom-font-comp, 1))', color: 'rgba(203, 213, 225, 0.5)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = accentColor; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(203, 213, 225, 0.5)'; }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.url.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            onMouseDown={(e) => e.stopPropagation()}>
            <button
              onClick={() => onToggleFavorite(entry)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', transition: 'background 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <Star size={17} color={entry.favorite ? '#f59e0b' : 'rgba(203, 213, 225, 0.4)'} fill={entry.favorite ? '#f59e0b' : 'none'} />
            </button>
            <button
              onClick={() => onEdit(entry)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', transition: 'background 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <Edit3 size={16} color="rgba(203, 213, 225, 0.5)" />
            </button>
            <button
              onClick={() => onDelete(entry.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px', transition: 'background 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <Trash2 size={16} color="#ef4444" />
            </button>
          </div>
        </div>

        {/* Card fields */}
        {entry.category === 'Card' ? (
          <>
            {entry.card_holder && <FieldBox label="Titulaire" value={entry.card_holder} copyId={`holder-${entry.id}`} clipTimers={clipTimers} copiedId={copiedId} onCopy={copyToClipboard} />}
            {entry.card_number && <FieldBox label="Numéro de carte" value={entry.card_number} copyId={`num-${entry.id}`} isCardNumber clipTimers={clipTimers} copiedId={copiedId} onCopy={copyToClipboard} />}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {entry.card_expiry && <FieldBox label="Expiration" value={entry.card_expiry} copyId={`exp-${entry.id}`} clipTimers={clipTimers} copiedId={copiedId} onCopy={copyToClipboard} />}
              {entry.card_cvv && <FieldBox label="CVV / CVC" value={entry.card_cvv} copyId={`cvv-${entry.id}`} isSecret clipTimers={clipTimers} copiedId={copiedId} onCopy={copyToClipboard} />}
            </div>
            {!entry.card_number && entry.password && <FieldBox label="CVV / Code" value={entry.password} copyId={`pass-${entry.id}`} isSecret clipTimers={clipTimers} copiedId={copiedId} onCopy={copyToClipboard} />}
          </>
        ) : (
          <>
            {entry.username && <FieldBox label="Identifiant / Email" value={entry.username} copyId={`user-${entry.id}`} clipTimers={clipTimers} copiedId={copiedId} onCopy={copyToClipboard} />}
            {entry.password && <FieldBox label="Mot de passe" value={entry.password} copyId={`pass-${entry.id}`} isSecret clipTimers={clipTimers} copiedId={copiedId} onCopy={copyToClipboard} />}
          </>
        )}

        {entry.totp_secret && <TotpCard secret={entry.totp_secret} />}

        {entry.notes && (
          <p style={{ fontSize: 'calc(12.5px * var(--zoom-font-comp, 1))', color: 'rgba(203, 213, 225, 0.6)', background: 'rgba(10, 8, 18, 0.4)', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(139, 92, 246, 0.1)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {entry.notes}
          </p>
        )}
      </div>
    );
  };

  // ──────────── Drop Zone ────────────
  const DropZone = ({ groupId, color, label, icon }: { groupId: string; color: string; label: string; icon: string }) => {
    const isTarget = dropTargetActive && dropTargetGroupId === groupId;
    return (
      <div
        data-dropzone={groupId}
        style={{
          padding: '24px 20px',
          borderRadius: '18px',
          border: `2px dashed ${isTarget ? color : color + '50'}`,
          background: isTarget ? color + '20' : color + '08',
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          color: isTarget ? color : color + '80',
          fontSize: '13.5px', fontWeight: 600,
          minHeight: '80px',
          boxShadow: isTarget ? `0 0 20px ${color}30` : 'none',
          transform: isTarget ? 'scale(1.01)' : 'scale(1)',
        }}
      >
        <span style={{ fontSize: '22px', pointerEvents: 'none' }}>{icon}</span>
        <span style={{ pointerEvents: 'none' }}>
          {isTarget ? `✅ Déposer dans « ${label} »` : `Glissez une entrée ici pour l'ajouter`}
        </span>
      </div>
    );
  };

  const UngroupedDropZone = () => {
    const isTarget = dropTargetActive && dropTargetGroupId === null;
    return (
      <div
        data-dropzone="ungrouped"
        style={{
          padding: '20px',
          borderRadius: '18px',
          border: `2px dashed ${isTarget ? 'rgba(203,213,225,0.6)' : 'rgba(203,213,225,0.2)'}`,
          background: isTarget ? 'rgba(255,255,255,0.06)' : 'transparent',
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isTarget ? 'rgba(203,213,225,0.8)' : 'rgba(203,213,225,0.35)',
          fontSize: '13px', fontWeight: 600, minHeight: '60px',
        }}
      >
        <span style={{ pointerEvents: 'none' }}>
          {isTarget ? '📂 Déposer ici pour retirer du groupe' : 'Zone sans groupe'}
        </span>
      </div>
    );
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '20px',
    alignContent: 'start',
  };

  if (entries.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 120px)', color: 'rgba(203, 213, 225, 0.4)', gap: '16px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '24px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Key size={32} color="#8b5cf6" style={{ opacity: 0.7 }} />
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(226, 232, 240, 0.8)' }}>Aucun élément trouvé</h3>
        <p style={{ fontSize: '13.5px', color: 'rgba(203, 213, 225, 0.4)', textAlign: 'center' }}>Ajoutez une entrée ou modifiez votre recherche.</p>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          padding: '16px 28px 28px 28px',
          overflowY: 'scroll', maxHeight: 'calc(100vh - 76px)',
          display: 'flex', flexDirection: 'column', gap: '32px',
          scrollbarWidth: 'none' as const, msOverflowStyle: 'none' as const,
          cursor: dragEntry ? 'grabbing' : 'default',
        }}
        className="no-scrollbar"
      >
        {/* Manage groups button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-16px' }}>
          <button
            onClick={onOpenGroupManager}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '12px',
              background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)',
              color: '#c084fc', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'; e.currentTarget.style.color = '#ffffff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'; e.currentTarget.style.color = '#c084fc'; }}
          >
            <Settings2 size={16} />Gérer les groupes
          </button>
        </div>

        {/* Hint during drag */}
        {dragEntry && (
          <div style={{ padding: '10px 18px', background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '12px', fontSize: '12.5px', color: '#c084fc', fontWeight: 600, textAlign: 'center', pointerEvents: 'none' }}>
            🖱️ Glissez vers un groupe pour l'y assigner, ou vers « Autres éléments » pour le retirer d'un groupe.
          </div>
        )}

        {/* Zoomable Content Area (Only scales key card boxes and group lists) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          zoom: 'var(--content-zoom, 1)' as any,
        }}>
          {/* Groups */}
          {groups.map((group) => {
            const groupEntries = grouped[group.id] || [];
            const isCollapsed = collapsedGroups[group.id];

            return (
              <div key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '8px', borderBottom: `2px solid ${group.color}40` }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => toggleGroup(group.id)}
                  >
                    {isCollapsed ? <ChevronRight size={18} color={group.color} /> : <ChevronDown size={18} color={group.color} />}
                    <span style={{ fontSize: '22px' }}>{group.icon}</span>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, color: group.color, margin: 0 }}>
                      {group.name} <span style={{ opacity: 0.6, fontSize: '14px', fontWeight: 500 }}>({groupEntries.length})</span>
                    </h2>
                  </div>
                </div>

                {!isCollapsed && (
                  groupEntries.length === 0 ? (
                    <DropZone groupId={group.id} color={group.color} label={group.name} icon={group.icon} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Drop zone overlay when dragging */}
                      {dragEntry && dragEntry.group_id !== group.id && (
                        <DropZone groupId={group.id} color={group.color} label={group.name} icon={group.icon} />
                      )}
                      <div style={gridStyle}>
                        {groupEntries.map(renderEntryCard)}
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })}

          {/* Ungrouped entries */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {groups.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Folder size={18} color="rgba(203, 213, 225, 0.5)" />
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(203, 213, 225, 0.8)', margin: 0 }}>
                  Autres éléments <span style={{ opacity: 0.6, fontSize: '14px', fontWeight: 500 }}>({ungrouped.length})</span>
                </h2>
              </div>
            )}

            {/* Ungrouped drop zone (only shown when dragging a grouped entry) */}
            {dragEntry && dragEntry.group_id && (
              <UngroupedDropZone />
            )}

            {ungrouped.length > 0 && (
              <div style={gridStyle}>
                {ungrouped.map(renderEntryCard)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ghost card following cursor */}
      {dragEntry && (
        <GhostCard
          entry={dragEntry}
          x={dragPos.x}
          y={dragPos.y}
          group={groups.find(g => g.id === dragEntry.group_id)}
        />
      )}

      {/* Custom context menu */}
      <ContextMenu
        menu={contextMenu}
        groups={groups}
        onClose={() => setContextMenu(null)}
        onEdit={(entry) => { onEdit(entry); }}
        onToggleFavorite={(entry) => { onToggleFavorite(entry); }}
        onDelete={(id) => { onDelete(id); }}
        onMoveToGroup={handleMoveToGroup}
        onCopyUsername={(entry) => copyToClipboard(entry.username, `ctx-user-${entry.id}`, "Identifiant")}
        onCopyPassword={(entry) => copyToClipboard(entry.password, `ctx-pass-${entry.id}`, "Mot de passe")}
      />
    </>
  );
};
