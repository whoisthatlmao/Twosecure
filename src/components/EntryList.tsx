import React, { useState } from 'react';
import {
  Key, Eye, EyeOff, Copy, Check, Star, Edit3, Trash2,
  ShieldAlert, CreditCard, FileText, ExternalLink,
} from 'lucide-react';
import { VaultEntry } from '../types';
import { TotpCard } from './TotpCard';
import { useToast } from './Toast';

const CLIPBOARD_CLEAR_DELAY = 30; // seconds

interface EntryListProps {
  entries: VaultEntry[];
  onEdit: (entry: VaultEntry) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (entry: VaultEntry) => void;
}

export const EntryList: React.FC<EntryListProps> = ({
  entries, onEdit, onDelete, onToggleFavorite,
}) => {
  const { showToast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [clipTimers, setClipTimers] = useState<Record<string, number>>({});
  const clearTimerRefs = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const copyToClipboard = (text: string, id: string, label = 'Élément') => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);

    // Show toast
    showToast(`${label} copié ! Effacement automatique dans ${CLIPBOARD_CLEAR_DELAY}s`, 'success', 4000);

    // Clear any existing countdown for this id
    if (clearTimerRefs.current[id]) {
      clearTimeout(clearTimerRefs.current[id]);
    }

    // Start countdown
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

    // Store a ref to cancel if another copy is made
    clearTimerRefs.current[id] = setTimeout(() => clearInterval(tick), (CLIPBOARD_CLEAR_DELAY + 1) * 1000);

    // Reset the "check" icon after 2s
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Totp': return ShieldAlert;
      case 'Card': return CreditCard;
      case 'Note': return FileText;
      default:     return Key;
    }
  };

  if (entries.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: 'calc(100vh - 120px)',
        color: 'rgba(203, 213, 225, 0.4)', gap: '16px',
      }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '24px',
          background: 'rgba(139, 92, 246, 0.08)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Key size={32} color="#8b5cf6" style={{ opacity: 0.7 }} />
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(226, 232, 240, 0.8)' }}>
          Aucun élément trouvé
        </h3>
        <p style={{ fontSize: '13.5px', color: 'rgba(203, 213, 225, 0.4)', textAlign: 'center' }}>
          Ajoutez une entrée ou modifiez votre recherche.
        </p>
      </div>
    );
  }

  // ────────── Field box helper ──────────
  const FieldBox = ({
    label, value, copyId, isSecret = false, isCardNumber = false,
  }: {
    label: string;
    value: string;
    copyId: string;
    isSecret?: boolean;
    isCardNumber?: boolean;
  }) => {
    const [shown, setShown] = useState(false);
    const remaining = clipTimers[copyId];
    const isCopied = copiedId === copyId;

    return (
      <div style={{
        background: 'rgba(10, 8, 18, 0.6)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        borderRadius: '16px',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(203, 213, 225, 0.45)', display: 'block', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '2px' }}>
            {label}
          </span>
          <span
            className={isCardNumber ? 'card-number-field' : isSecret ? 'font-mono' : ''}
            style={{ fontSize: '13.5px', color: '#ffffff', fontWeight: 500, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
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
            onClick={() => copyToClipboard(value, copyId, label)}
            title={remaining ? `Effacement dans ${remaining}s` : 'Copier'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: isCopied ? '#10b981' : remaining ? '#f59e0b' : 'rgba(203, 213, 225, 0.5)',
              transition: 'color 0.2s',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
            onMouseEnter={(e) => { if (!isCopied) e.currentTarget.style.color = '#8b5cf6'; }}
            onMouseLeave={(e) => { if (!isCopied) e.currentTarget.style.color = remaining ? '#f59e0b' : 'rgba(203, 213, 225, 0.5)'; }}
          >
            {isCopied ? <Check size={16} /> : <Copy size={16} />}
            {remaining && !isCopied && (
              <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', minWidth: '22px' }}>
                {remaining}s
              </span>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      padding: '16px 28px 28px 28px',
      overflowY: 'scroll',
      maxHeight: 'calc(100vh - 76px)',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
      gap: '20px',
      alignContent: 'start',
      scrollbarWidth: 'none' as const,
      msOverflowStyle: 'none' as const,
      WebkitOverflowScrolling: 'touch' as const,
    }}
      className="no-scrollbar"
    >
      {entries.map((entry) => {
        const Icon = getCategoryIcon(entry.category);

        return (
          <div
            key={entry.id}
            className="glass-panel animate-fade-in"
            style={{
              padding: '24px',
              borderRadius: '24px',
              background: 'rgba(13, 10, 24, 0.65)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              boxShadow: '0 0 25px rgba(139, 92, 246, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'all 0.3s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.35)';
              e.currentTarget.style.boxShadow = '0 0 35px rgba(139, 92, 246, 0.18)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.15)';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(139, 92, 246, 0.08)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Header: Icon + Title */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '14px',
                  background: entry.category === 'Card'
                    ? 'linear-gradient(135deg, #0f4c81 0%, #1a6fb5 100%)'
                    : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: entry.category === 'Card'
                    ? '0 0 20px rgba(26, 111, 181, 0.35)'
                    : '0 0 20px rgba(124, 58, 237, 0.35)',
                  flexShrink: 0,
                }}>
                  <Icon size={20} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16.5px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.2px' }}>
                    {entry.title}
                  </h3>
                  {entry.url && (
                    <a
                      href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '12px', color: 'rgba(203, 213, 225, 0.5)',
                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px',
                        marginTop: '2px', transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#8b5cf6'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(203, 213, 225, 0.5)'; }}
                    >
                      <span>{entry.url.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* Actions Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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

            {/* ════ CARD-SPECIFIC DISPLAY ════ */}
            {entry.category === 'Card' ? (
              <>
                {entry.card_holder && (
                  <FieldBox label="Titulaire" value={entry.card_holder} copyId={`holder-${entry.id}`} />
                )}
                {entry.card_number && (
                  <FieldBox label="Numéro de carte" value={entry.card_number} copyId={`num-${entry.id}`} isCardNumber />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {entry.card_expiry && (
                    <FieldBox label="Expiration" value={entry.card_expiry} copyId={`exp-${entry.id}`} />
                  )}
                  {entry.card_cvv && (
                    <FieldBox label="CVV / CVC" value={entry.card_cvv} copyId={`cvv-${entry.id}`} isSecret />
                  )}
                </div>
                {/* Fallback to legacy password field if card_number is absent */}
                {!entry.card_number && entry.password && (
                  <FieldBox label="CVV / Code" value={entry.password} copyId={`pass-${entry.id}`} isSecret />
                )}
              </>
            ) : (
              <>
                {/* Standard Username Box */}
                {entry.username && (
                  <FieldBox label="Identifiant / Email" value={entry.username} copyId={`user-${entry.id}`} />
                )}

                {/* Standard Password Box */}
                {entry.password && (
                  <FieldBox label="Mot de passe" value={entry.password} copyId={`pass-${entry.id}`} isSecret />
                )}
              </>
            )}

            {/* TOTP 2FA Section if present */}
            {entry.totp_secret && (
              <TotpCard secret={entry.totp_secret} />
            )}

            {/* Notes */}
            {entry.notes && (
              <p style={{
                fontSize: '12.5px', color: 'rgba(203, 213, 225, 0.6)',
                background: 'rgba(10, 8, 18, 0.4)',
                padding: '12px 14px', borderRadius: '14px',
                border: '1px solid rgba(139, 92, 246, 0.1)',
                whiteSpace: 'pre-wrap', lineHeight: 1.5,
              }}>
                {entry.notes}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
