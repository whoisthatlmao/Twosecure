import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, RefreshCw, Wand2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { PasswordStrengthBar } from './PasswordStrengthBar';
import { useToast } from './Toast';

interface PasswordGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

const CLIPBOARD_CLEAR_DELAY = 30;

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [length, setLength]     = useState(20);
  const [upper, setUpper]       = useState(true);
  const [lower, setLower]       = useState(true);
  const [digits, setDigits]     = useState(true);
  const [symbols, setSymbols]   = useState(true);
  const [copied, setCopied]     = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [clipTimer, setClipTimer] = useState<number | null>(null);
  const timerTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generate = async () => {
    setSpinning(true);
    try {
      const gen: string = await invoke('generate_password', {
        length, upper, lower, digits, symbols,
      });
      setPassword(gen);
    } catch (err) { console.error(err); }
    setTimeout(() => setSpinning(false), 400);
  };

  useEffect(() => {
    if (isOpen) generate();
  }, [isOpen, length, upper, lower, digits, symbols]);

  const handleCopy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    showToast(`Mot de passe copié ! Effacement automatique dans ${CLIPBOARD_CLEAR_DELAY}s`, 'success', 4000);

    // Cancel previous countdown
    if (timerTickRef.current) clearInterval(timerTickRef.current);

    let remaining = CLIPBOARD_CLEAR_DELAY;
    setClipTimer(remaining);

    timerTickRef.current = setInterval(() => {
      remaining -= 1;
      setClipTimer(remaining);
      if (remaining <= 0) {
        clearInterval(timerTickRef.current!);
        timerTickRef.current = null;
        navigator.clipboard.writeText('');
        setClipTimer(null);
        showToast('Presse-papier effacé automatiquement', 'info', 3000);
      }
    }, 1000);
  };

  if (!isOpen) return null;

  const CheckOption = ({ label, value, setter }: { label: string; value: boolean; setter: (v: boolean) => void }) => (
    <label
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        fontSize: '13px', color: value ? '#ffffff' : 'rgba(226, 232, 240, 0.75)',
        cursor: 'pointer',
        background: value ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.04)',
        padding: '10px 14px',
        borderRadius: '12px',
        border: value ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.08)',
        transition: 'all 0.2s ease',
        fontWeight: value ? 600 : 500,
        boxShadow: value ? '0 0 12px rgba(168, 85, 247, 0.2)' : 'none',
      }}
    >
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => setter(e.target.checked)}
        style={{ display: 'none' }}
      />
      <div style={{
        width: '16px', height: '16px', borderRadius: '4px',
        border: value ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.15)',
        background: value ? 'linear-gradient(135deg, #a855f7, #7c3aed)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 0.15s',
      }}>
        {value && <Check size={10} color="white" strokeWidth={3} />}
      </div>
      <span>{label}</span>
    </label>
  );

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
      <div className="glass-panel animate-fade-in" style={{
        width: '100%', maxWidth: '440px',
        padding: '28px',
        background: 'rgba(12, 9, 22, 0.92)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderRadius: '24px',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 0 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(139, 92, 246, 0.15)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(99,102,241,0.2))',
              border: '1px solid rgba(168,85,247,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 15px rgba(168, 85, 247, 0.25)',
            }}>
              <Wand2 size={20} color="#a855f7" />
            </div>
            <h2 style={{
              fontSize: '17px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.3px',
            }}>
              Générateur de mot de passe
            </h2>
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

        {/* Password display card */}
        <div style={{
          background: 'rgba(6, 4, 14, 0.75)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          borderRadius: '16px', padding: '16px',
          marginBottom: '20px',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
        }}>
          <span
            className="font-mono"
            style={{
              display: 'block',
              fontSize: '15px', fontWeight: 600,
              color: '#ffffff',
              wordBreak: 'break-all',
              lineHeight: 1.6, marginBottom: '12px',
              minHeight: '48px',
              letterSpacing: '0.5px',
              textShadow: '0 0 10px rgba(168, 85, 247, 0.4)',
            }}
          >
            {password}
          </span>

          {/* Password Strength Bar */}
          <div style={{ marginBottom: '14px' }}>
            <PasswordStrengthBar password={password} showDetails={true} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={generate}
              style={{
                flex: 1,
                height: '42px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#ffffff',
                background: 'rgba(168, 85, 247, 0.16)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backdropFilter: 'blur(12px)',
                transition: 'all 0.25s ease',
                boxShadow: '0 0 15px rgba(168, 85, 247, 0.15)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(168, 85, 247, 0.3)';
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.7)';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(168, 85, 247, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(168, 85, 247, 0.16)';
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(168, 85, 247, 0.15)';
              }}
            >
              <RefreshCw
                size={15}
                color="#c084fc"
                style={{ transition: 'transform 0.4s', transform: spinning ? 'rotate(360deg)' : 'rotate(0deg)' }}
              />
              <span>Régénérer</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              style={{
                flex: 1,
                height: '42px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#ffffff',
                background: copied
                  ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                  : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.25s ease',
                boxShadow: copied
                  ? '0 0 25px rgba(16, 185, 129, 0.5)'
                  : '0 0 25px rgba(124, 58, 237, 0.45)',
              }}
              onMouseEnter={(e) => {
                if (!copied) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 0 35px rgba(168, 85, 247, 0.65)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)';
                }
              }}
              onMouseLeave={(e) => {
                if (!copied) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(124, 58, 237, 0.45)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)';
                }
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>
                {copied ? 'Copié !' : clipTimer ? `Effacement ${clipTimer}s` : 'Copier'}
              </span>
            </button>
          </div>
        </div>

        {/* Length slider */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
            <span style={{ color: 'rgba(226, 232, 240, 0.8)', fontWeight: 500 }}>Longueur</span>
            <span style={{ fontWeight: 800, color: '#c084fc', fontSize: '14px' }}>{length} caractères</span>
          </div>
          <input
            type="range" min="8" max="64"
            value={length} onChange={(e) => setLength(parseInt(e.target.value))}
            style={{ width: '100%', height: '6px', cursor: 'pointer' }}
          />
        </div>

        {/* Options */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <CheckOption label="Majuscules (A-Z)" value={upper}   setter={setUpper} />
          <CheckOption label="Minuscules (a-z)" value={lower}   setter={setLower} />
          <CheckOption label="Chiffres (0-9)"   value={digits}  setter={setDigits} />
          <CheckOption label="Symboles (!@#$)"  value={symbols} setter={setSymbols} />
        </div>
      </div>
    </div>
  );
};
