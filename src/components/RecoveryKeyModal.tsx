import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Copy, Check, ArrowRight } from 'lucide-react';

interface RecoveryKeyModalProps {
  isOpen: boolean;
  recoveryPhrase: string;
  onConfirm: () => void;
}

export const RecoveryKeyModal: React.FC<RecoveryKeyModalProps> = ({
  isOpen,
  recoveryPhrase,
  onConfirm,
}) => {
  const [copied, setCopied] = useState(false);
  const [confirmedCheck, setConfirmedCheck] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(recoveryPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(5, 5, 8, 0.9)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%', maxWidth: '460px',
        padding: '32px',
        background: 'rgba(12, 9, 22, 0.95)',
        borderRadius: '24px',
        border: '1px solid rgba(234, 179, 8, 0.35)',
        boxShadow: '0 0 50px rgba(234, 179, 8, 0.15), 0 0 30px rgba(0, 0, 0, 0.9)',
        textAlign: 'center',
      }}>
        {/* Header Icon */}
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(245, 158, 11, 0.1))',
          border: '1px solid rgba(234, 179, 8, 0.4)',
          margin: '0 auto 16px auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(234, 179, 8, 0.2)',
        }}>
          <KeyRound size={28} color="#eab308" />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '8px', letterSpacing: '-0.3px' }}>
          Code de Récupération Urgence
        </h2>

        <p style={{ fontSize: '13px', color: 'rgba(203, 213, 225, 0.7)', lineHeight: 1.5, marginBottom: '20px' }}>
          Conservez précieusement ce code de secours. Si vous oubliez votre mot de passe maître, ce sera <strong style={{ color: '#facc15' }}>votre seul moyen</strong> de réinitialiser et déverrouiller votre coffre.
        </p>

        {/* Recovery Code Display Box */}
        <div style={{
          background: 'rgba(9, 7, 18, 0.9)',
          border: '1.5px dashed rgba(234, 179, 8, 0.4)',
          borderRadius: '16px',
          padding: '18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <span style={{
            fontFamily: 'monospace',
            fontSize: '20px',
            fontWeight: 800,
            letterSpacing: '1px',
            color: '#fef08a',
            wordBreak: 'break-all',
          }}>
            {recoveryPhrase}
          </span>
          <button
            onClick={handleCopy}
            style={{
              background: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.15)',
              border: '1px solid ' + (copied ? 'rgba(34, 197, 94, 0.4)' : 'rgba(234, 179, 8, 0.3)'),
              borderRadius: '10px',
              padding: '10px 14px',
              color: copied ? '#4ade80' : '#facc15',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copié !' : 'Copier'}</span>
          </button>
        </div>

        {/* Warning Banner */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '12px',
          padding: '12px 14px',
          fontSize: '12px',
          color: '#f87171',
          textAlign: 'left',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
          marginBottom: '20px',
        }}>
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>Ne partagez jamais ce code. Stockez-le dans un endroit sûr (sur papier ou gestionnaire externe).</span>
        </div>

        {/* Confirmation Checkbox */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12.5px',
          color: 'rgba(226, 232, 240, 0.85)',
          cursor: 'pointer',
          marginBottom: '24px',
          textAlign: 'left',
        }}>
          <input
            type="checkbox"
            checked={confirmedCheck}
            onChange={(e) => setConfirmedCheck(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: '#eab308', cursor: 'pointer' }}
          />
          <span>J'ai bien noté et sauvegardé mon code de récupération.</span>
        </label>

        {/* Action Button */}
        <button
          onClick={onConfirm}
          disabled={!confirmedCheck}
          className="gradient-btn"
          style={{
            width: '100%',
            justifyContent: 'center',
            borderRadius: '9999px',
            padding: '14px',
            fontSize: '14px',
            fontWeight: 700,
            opacity: confirmedCheck ? 1 : 0.4,
            cursor: confirmedCheck ? 'pointer' : 'not-allowed',
            background: confirmedCheck
              ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'
              : 'rgba(234, 179, 8, 0.2)',
            color: confirmedCheck ? '#000000' : '#ffffff',
            boxShadow: confirmedCheck ? '0 0 25px rgba(234, 179, 8, 0.4)' : 'none',
          }}
        >
          <span>Accéder à mon coffre</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
