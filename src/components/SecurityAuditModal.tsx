import React from 'react';
import { X, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';

import { VaultEntry } from '../types';
import { calculateSmartEntropy } from './PasswordStrengthBar';

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: VaultEntry[];
  onEditEntry: (entry: VaultEntry) => void;
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({
  isOpen, onClose, entries, onEditEntry,
}) => {
  if (!isOpen) return null;

  // 1. Analyze reused passwords (only for Password and Totp categories)
  const passwordCounts: Record<string, VaultEntry[]> = {};
  entries.forEach((e) => {
    if (e.password && e.category !== 'Note' && e.category !== 'Card') {
      const pass = e.password;
      if (!passwordCounts[pass]) passwordCounts[pass] = [];
      passwordCounts[pass].push(e);
    }
  });

  const reusedEntries = Object.values(passwordCounts).filter((list) => list.length > 1).flat();

  // 2. Analyze weak passwords (only for Password and Totp categories)
  const weakEntries = entries.filter((e) => {
    if (!e.password || e.category === 'Note' || e.category === 'Card') return false;
    const { entropy } = calculateSmartEntropy(e.password);
    return entropy < 50;
  });

  // 3. Overall health score (0-100%)
  const totalItemsWithPassword = entries.filter((e) => e.password && e.category !== 'Note' && e.category !== 'Card').length;
  const vulnerableCount = new Set([...reusedEntries.map(e => e.id), ...weakEntries.map(e => e.id)]).size;
  const healthPct = totalItemsWithPassword > 0
    ? Math.max(0, Math.round(((totalItemsWithPassword - vulnerableCount) / totalItemsWithPassword) * 100))
    : 100;

  const healthColor = healthPct > 80 ? '#10b981' : healthPct > 50 ? '#f59e0b' : '#ef4444';

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
          width: '100%', maxWidth: '580px',
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
              background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(99,102,241,0.2))',
              border: '1px solid rgba(168,85,247,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 15px rgba(168, 85, 247, 0.25)',
            }}>
              <ShieldAlert size={20} color="#a855f7" />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
                Audit de Sécurité du Coffre
              </h2>
              <span style={{ fontSize: '11px', color: 'rgba(203, 213, 225, 0.5)' }}>
                {vulnerableCount === 0 ? 'Aucune vulnérabilité trouvée' : `${vulnerableCount} avertissement${vulnerableCount > 1 ? 's' : ''} trouvé${vulnerableCount > 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

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

        {/* Health Score Summary Card */}
        <div style={{
          background: 'rgba(8, 6, 16, 0.7)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          borderRadius: '16px', padding: '16px', marginBottom: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(203, 213, 225, 0.5)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '4px' }}>
              Score Global de Sécurité
            </span>
            <span style={{ fontSize: '22px', fontWeight: 800, color: healthColor, letterSpacing: '-0.5px' }}>
              {healthPct}% {healthPct === 100 ? '✨ Réussite parfaite' : healthPct > 70 ? '🟢 Très bon' : '⚠️ Action requise'}
            </span>
          </div>
          <div style={{
            width: '54px', height: '54px', borderRadius: '50%',
            background: `radial-gradient(circle, ${healthColor}20 0%, transparent 70%)`,
            border: `2px solid ${healthColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: 800, color: healthColor,
          }}>
            {healthPct}%
          </div>
        </div>

        {/* Audit Details */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }} className="no-scrollbar">
          {vulnerableCount === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 20px', gap: '10px' }}>
              <CheckCircle2 size={40} color="#10b981" />
              <h3 style={{ fontSize: '15px', color: '#ffffff', fontWeight: 700 }}>Votre coffre est parfaitement sécurisé</h3>
              <p style={{ fontSize: '12.5px', color: 'rgba(203, 213, 225, 0.5)', textAlign: 'center' }}>
                Aucun mot de passe réutilisé ou trop faible n'a été détecté.
              </p>
            </div>
          ) : (
            <>
              {/* Reused passwords section */}
              {reusedEntries.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <AlertTriangle size={14} color="#f59e0b" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Mots de passe réutilisés ({reusedEntries.length})
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {reusedEntries.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: 'rgba(8, 6, 16, 0.65)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          borderRadius: '12px', padding: '10px 14px',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#ffffff', display: 'block' }}>{item.title}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(203, 213, 225, 0.5)' }}>{item.username || 'Identifiant non spécifié'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { onClose(); onEditEntry(item); }}
                          style={{
                            background: 'rgba(168, 85, 247, 0.15)',
                            border: '1px solid rgba(168, 85, 247, 0.4)',
                            color: '#c084fc', padding: '5px 10px', borderRadius: '8px',
                            fontSize: '11.5px', fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Corriger
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weak passwords section */}
              {weakEntries.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <AlertTriangle size={14} color="#ef4444" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Mots de passe faibles ({weakEntries.length})
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {weakEntries.map((item) => {
                      const { entropy } = calculateSmartEntropy(item.password);
                      return (
                        <div
                          key={item.id}
                          style={{
                            background: 'rgba(8, 6, 16, 0.65)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '12px', padding: '10px 14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#ffffff', display: 'block' }}>{item.title}</span>
                            <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>
                              Seulement {entropy} bits d'entropie
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { onClose(); onEditEntry(item); }}
                            style={{
                              background: 'rgba(168, 85, 247, 0.15)',
                              border: '1px solid rgba(168, 85, 247, 0.4)',
                              color: '#c084fc', padding: '5px 10px', borderRadius: '8px',
                              fontSize: '11.5px', fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            Renforcer
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
