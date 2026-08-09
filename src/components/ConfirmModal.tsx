import React from 'react';
import { AlertTriangle, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  const accentColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#8b5cf6';
  const Icon = isDanger ? AlertTriangle : isWarning ? ShieldAlert : CheckCircle2;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(5, 5, 8, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%', maxWidth: '440px',
          padding: '26px 24px',
          background: 'rgba(12, 9, 22, 0.96)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderRadius: '24px',
          border: `1px solid ${accentColor}40`,
          boxShadow: `0 0 50px rgba(0, 0, 0, 0.95), 0 0 35px ${accentColor}25`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: `${accentColor}18`,
              border: `1px solid ${accentColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px ${accentColor}20`,
            }}>
              <Icon size={22} color={accentColor} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px', margin: 0 }}>
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', width: '30px', height: '30px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(203,213,225,0.6)', cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Message */}
        <p style={{
          fontSize: '13px',
          color: 'rgba(226, 232, 240, 0.75)',
          lineHeight: 1.55,
          marginBottom: '24px',
          whiteSpace: 'pre-line',
        }}>
          {message}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: '40px', padding: '0 18px', fontSize: '13px', fontWeight: 600,
              color: 'rgba(226, 232, 240, 0.7)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            style={{
              height: '40px', padding: '0 20px', fontSize: '13px', fontWeight: 700,
              color: '#ffffff',
              background: isDanger
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : isWarning
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
              border: 'none', borderRadius: '10px', cursor: 'pointer',
              boxShadow: `0 0 20px ${accentColor}40`,
              transition: 'all 0.2s',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
