import React, { useState } from 'react';
import { Lock, AlertCircle, Sparkles, Key, Mail, Fingerprint, Eye, EyeOff } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { TelegramAuthModal } from './TelegramAuthModal';
import { TelegramSetupModal } from './TelegramSetupModal';

interface VaultLockProps {
  isInitialized: boolean;
  onUnlocked: () => void;
}

export const VaultLock: React.FC<VaultLockProps> = ({ isInitialized, onUnlocked }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [telegramFlow, setTelegramFlow] = useState<'none' | 'setup' | 'approval'>('none');

  const afterPasswordSuccess = async () => {
    try {
      const config: any = await invoke('get_telegram_config');
      if (config?.linked) {
        // Enregistré & lié : Validation 2FA Push Telegram requise
        setTelegramFlow('approval');
      } else {
        // Non lié : Déverrouillage immédiat (la 2FA se configure via les Paramètres)
        onUnlocked();
      }
    } catch {
      onUnlocked();
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setError(null);
    setLoading(true);
    try {
      await invoke('unlock_vault', { masterPassword: password });
      await afterPasswordSuccess();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : 'Mot de passe maître incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Le mot de passe maître doit comporter au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await invoke('create_vault', { masterPassword: password });
      onUnlocked();
    } catch (err: any) {
      setError(typeof err === 'string' ? err : 'Erreur de création du coffre');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Main Lock Screen ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        background: '#050508',
        backgroundImage: 'radial-gradient(ellipse 70% 60% at 50% 35%, rgba(124, 58, 237, 0.16) 0%, rgba(5, 5, 8, 0.95) 80%)',
        position: 'relative',
      }}>
        {/* Title */}
        <h1 style={{
          fontSize: '48px',
          fontWeight: 800,
          marginBottom: '28px',
          letterSpacing: '-0.5px',
          color: '#c084fc',
          textShadow: '0 0 20px rgba(192, 132, 252, 0.8), 0 0 50px rgba(168, 85, 247, 0.6)',
        }}>
          2Secure
        </h1>

        {/* Glass Card */}
        <div className="glass-panel animate-fade-in" style={{
          width: '100%',
          maxWidth: '420px',
          padding: '38px 34px 30px 34px',
          textAlign: 'center',
          background: 'rgba(12, 9, 22, 0.75)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderRadius: '24px',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(139, 92, 246, 0.12)',
        }}>

          {/* Shield Emblem */}
          <div style={{
            width: '72px',
            height: '78px',
            margin: '0 auto 24px auto',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="72" height="78" viewBox="0 0 76 84" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="obsidianShield" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#1e102a" />
                </linearGradient>
                <linearGradient id="neonGlowBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <path
                d="M38 3L72 15V42C72 63.5 57.5 77 38 82C18.5 77 4 63.5 4 42V15L38 3Z"
                fill="url(#obsidianShield)"
                stroke="url(#neonGlowBorder)"
                strokeWidth="2"
              />
              <text
                x="38"
                y="51"
                fontFamily="'Plus Jakarta Sans', sans-serif"
                fontSize="26"
                fontWeight="800"
                fill="#ffffff"
                textAnchor="middle"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}
              >
                2S
              </text>
            </svg>
          </div>

          {/* Subtitle */}
          <p style={{
            color: 'rgba(203, 213, 225, 0.7)',
            fontSize: '13.5px',
            fontWeight: 400,
            marginBottom: '22px',
          }}>
            {isInitialized
              ? 'Entre ton mot de passe maître'
              : 'Crée ton mot de passe maître'}
          </p>

          {/* Error Banner */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#ef4444',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              marginBottom: '18px',
              display: 'flex', alignItems: 'center', gap: '8px',
              textAlign: 'left',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={isInitialized ? handleUnlock : handleCreateVault}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Password Input */}
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                style={{
                  borderRadius: '16px',
                  padding: '14px 44px 14px 20px',
                  fontSize: '15px',
                  background: 'rgba(9, 7, 18, 0.8)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  color: '#ffffff',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass((v: boolean) => !v)}
                style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#c084fc',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#c084fc')}
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Confirm Password (create only) */}
            {!isInitialized && (
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    borderRadius: '16px',
                    padding: '14px 20px',
                    fontSize: '15px',
                    background: 'rgba(9, 7, 18, 0.8)',
                    border: '1px solid rgba(139, 92, 246, 0.25)',
                    color: '#ffffff',
                  }}
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="gradient-btn"
              disabled={loading}
              style={{
                width: '100%',
                justifyContent: 'center',
                borderRadius: '9999px',
                padding: '14px',
                fontSize: '14.5px',
                fontWeight: 600,
                marginTop: '4px',
              }}
            >
              {loading ? (
                <span>Déchiffrement...</span>
              ) : isInitialized ? (
                <>
                  <Lock size={16} />
                  <span>Déverrouiller le coffre</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Créer mon coffre-fort</span>
                </>
              )}
            </button>
          </form>

          {/* Forgot password */}
          <button
            type="button"
            style={{
              width: '100%',
              justifyContent: 'center',
              marginTop: '12px',
              padding: '12px',
              fontSize: '13.5px',
              fontWeight: 600,
              color: 'rgba(226, 232, 240, 0.8)',
              background: 'rgba(168, 85, 247, 0.12)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '9999px',
              cursor: 'pointer',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(168, 85, 247, 0.25)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(168, 85, 247, 0.12)';
              e.currentTarget.style.color = 'rgba(226, 232, 240, 0.8)';
            }}
          >
            Mot de passe oublié?
          </button>

          {/* Recovery Options */}
          <div style={{ marginTop: '24px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(203, 213, 225, 0.4)', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Options de récupération
            </span>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '22px' }}>
              <div style={{ cursor: 'pointer', opacity: 0.5, transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.transform = 'scale(1)'; }}>
                <Key size={18} color="#8b5cf6" />
              </div>
              <div style={{ cursor: 'pointer', opacity: 0.5, transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.transform = 'scale(1)'; }}>
                <Mail size={18} color="#8b5cf6" />
              </div>
              <div style={{ cursor: 'pointer', opacity: 0.5, transition: 'all 0.2s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.transform = 'scale(1)'; }}>
                <Fingerprint size={18} color="#8b5cf6" />
              </div>
            </div>
          </div>

        </div>{/* end glass card */}
      </div>{/* end main lock screen */}

      {/* ── Telegram Setup Modal (first-time linking) ── */}
      <TelegramSetupModal
        isOpen={telegramFlow === 'setup'}
        onLinked={() => {
          setTelegramFlow('approval');
        }}
        onCancel={() => {
          setTelegramFlow('none');
          // If setup is skipped, unlock vault without Telegram
          onUnlocked();
        }}
      />

      {/* ── Telegram Approval Modal (every unlock) ── */}
      <TelegramAuthModal
        isOpen={telegramFlow === 'approval'}
        onApproved={() => {
          setTelegramFlow('none');
          onUnlocked();
        }}
        onDenied={() => {
          setTelegramFlow('none');
          setError('❌ Accès refusé depuis Telegram.');
          invoke('lock_vault').catch(console.error);
        }}
        onCancel={() => {
          setTelegramFlow('none');
          setError('Validation Telegram annulée.');
          invoke('lock_vault').catch(console.error);
        }}
      />
    </>
  );
};
