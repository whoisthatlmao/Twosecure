import React, { useState } from 'react';
import { Send, CheckCircle2, XCircle, Link, ShieldCheck, RefreshCw, Key, User, Info, AlertTriangle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface TelegramSetupModalProps {
  isOpen: boolean;
  onLinked: () => void;
  onCancel: () => void;
}

export const TelegramSetupModal: React.FC<TelegramSetupModalProps> = ({
  isOpen, onLinked, onCancel,
}) => {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');

  const [step, setStep] = useState<'config' | 'wait_code' | 'success' | 'error'>('config');
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSendCode = async () => {
    if (!botToken.trim()) {
      setError('Veuillez saisir votre Bot Token (obtenu auprès de @BotFather).');
      return;
    }
    if (!chatId.trim()) {
      setError('Veuillez saisir votre Telegram Chat ID.');
      return;
    }

    setSending(true);
    setError('');
    try {
      await invoke('initiate_telegram_link', {
        botToken: botToken.trim(),
        chatId: chatId.trim(),
      });
      setStep('wait_code');
    } catch (err: any) {
      const errStr = err?.toString() || 'Erreur lors de l\'envoi du code Telegram';
      if (errStr.includes('401') || errStr.includes('Unauthorized')) {
        setError('❌ API Telegram 401 Unauthorized : Le Bot Token saisi est invalide ou expiré ! Vérifiez la clé auprès de @BotFather.');
      } else if (errStr.includes('400') || errStr.includes('chat not found')) {
        setError('❌ Chat non trouvé : Envoyez un message ou la commande /start à votre bot sur Telegram avant de valider.');
      } else {
        setError(errStr);
      }
      setStep('error');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!codeInput.trim() || codeInput.trim().length !== 6) {
      setError('Entrez le code à 6 chiffres reçu sur Telegram.');
      return;
    }
    setVerifying(true);
    setError('');
    try {
      const ok: boolean = await invoke('verify_telegram_link', {
        code: codeInput.trim(),
        botToken: botToken.trim(),
        chatId: chatId.trim(),
      });
      if (ok) {
        setStep('success');
        setTimeout(() => onLinked(), 1500);
      } else {
        setError('❌ Code incorrect. Vérifiez le code reçu sur Telegram.');
      }
    } catch (err: any) {
      setError(err?.toString() || 'Erreur de vérification');
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(5, 5, 8, 0.94)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%', maxWidth: '480px',
        padding: '34px 28px',
        background: 'rgba(10, 7, 20, 0.97)',
        borderRadius: '24px',
        border: '1px solid rgba(139, 92, 246, 0.4)',
        boxShadow: '0 0 70px rgba(139, 92, 246, 0.2), 0 0 30px rgba(0,0,0,0.9)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        maxHeight: '90vh', overflowY: 'auto',
      }}>

        {/* Header Icon */}
        <div style={{
          width: '60px', height: '60px', borderRadius: '18px', marginBottom: '18px',
          background: step === 'success'
            ? 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.15))'
            : step === 'error'
            ? 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(185,28,28,0.15))'
            : 'linear-gradient(135deg, rgba(37,99,235,0.35), rgba(139,92,246,0.25))',
          border: step === 'success'
            ? '1px solid rgba(16,185,129,0.5)'
            : step === 'error'
            ? '1px solid rgba(239,68,68,0.5)'
            : '1px solid rgba(96,165,250,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: step === 'success'
            ? '0 0 30px rgba(16,185,129,0.35)'
            : '0 0 30px rgba(96,165,250,0.25)',
        }}>
          {step === 'success' ? <CheckCircle2 size={32} color="#10b981" /> :
           step === 'error'   ? <XCircle      size={32} color="#ef4444" /> :
           step === 'wait_code' ? <Link       size={30} color="#93c5fd" /> :
                                  <ShieldCheck size={30} color="#93c5fd" />}
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#f1f5f9', marginBottom: '8px', letterSpacing: '-0.3px' }}>
          {step === 'config'    && '📱 Configuration Telegram 2FA'}
          {step === 'wait_code' && '💬 Entrez le code à 6 chiffres'}
          {step === 'success'   && '✅ Compte lié avec succès !'}
          {step === 'error'     && 'Erreur de connexion Telegram'}
        </h2>

        {/* Step: Configuration Form */}
        {step === 'config' && (
          <div style={{ width: '100%', textAlign: 'left', marginBottom: '20px' }}>
            
            {/* Guide Info Box */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '14px', padding: '12px 14px',
              fontSize: '12px', color: '#93c5fd', lineHeight: 1.5,
              marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start',
            }}>
              <Info size={18} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Instructions d'initialisation :</strong><br />
                1. Créez votre bot via <strong>@BotFather</strong> sur Telegram.<br />
                2. Copiez le <strong>HTTP API Token</strong> fourni.<br />
                3. Envoyez la commande <code>/start</code> à votre bot.<br />
                4. Récupérez votre <strong>Chat ID</strong> (ex: via <code>@userinfobot</code>).
              </div>
            </div>

            {/* Bot Token Field */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(203,213,225,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>
                Bot Token (de @BotFather)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="ex: 123456789:ABCdefGhIJKlmNoPQRstuVWXyz"
                  style={{
                    width: '100%', height: '42px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    borderRadius: '10px', outline: 'none',
                    color: '#fff', fontSize: '12.5px', padding: '0 12px 0 34px',
                    fontFamily: 'monospace', boxSizing: 'border-box',
                  }}
                />
                <Key size={15} color="#a855f7" style={{ position: 'absolute', left: '10px', top: '13px' }} />
              </div>
            </div>

            {/* Chat ID Field */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(203,213,225,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>
                Votre Chat ID Telegram
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="ex: 987654321"
                  style={{
                    width: '100%', height: '42px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    borderRadius: '10px', outline: 'none',
                    color: '#fff', fontSize: '13px', padding: '0 12px 0 34px',
                    fontFamily: 'monospace', boxSizing: 'border-box',
                  }}
                />
                <User size={15} color="#a855f7" style={{ position: 'absolute', left: '10px', top: '13px' }} />
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px', padding: '10px', fontSize: '12px', color: '#f87171',
                display: 'flex', gap: '8px', alignItems: 'center',
              }}>
                <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Step: Enter Code */}
        {step === 'wait_code' && (
          <div style={{ width: '100%', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(203,213,225,0.7)', lineHeight: 1.5, marginBottom: '16px' }}>
              Le bot Telegram a envoyé un code de liaison à 6 chiffres. Entrez-le ci-dessous :
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              style={{
                width: '100%', height: '54px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(139,92,246,0.4)',
                borderRadius: '14px', outline: 'none',
                color: '#c084fc', fontFamily: 'JetBrains Mono, monospace',
                fontSize: '26px', fontWeight: 800, letterSpacing: '8px',
                textAlign: 'center', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
            {error && (
              <p style={{ fontSize: '12px', color: '#f87171', marginTop: '8px' }}>{error}</p>
            )}
          </div>
        )}

        {/* Step: Error Detail */}
        {step === 'error' && (
          <div style={{ width: '100%', marginBottom: '20px' }}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px', padding: '14px', fontSize: '12.5px', color: '#f87171',
              textAlign: 'left', lineHeight: 1.5, marginBottom: '16px',
            }}>
              {error}
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <p style={{ fontSize: '13.5px', color: 'rgba(203,213,225,0.8)', marginBottom: '20px' }}>
            Votre compte Telegram est maintenant relié ! Chaque déverrouillage de 2Secure enverra une demande d'approbation Push.
          </p>
        )}

        {/* Actions Buttons */}
        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          {step === 'config' && (
            <>
              <button type="button" onClick={handleSendCode} disabled={sending} style={{
                flex: 1, height: '44px', fontSize: '13.5px', fontWeight: 700,
                background: 'linear-gradient(135deg, #3b82f6 0%, #6d28d9 100%)',
                border: 'none', borderRadius: '12px', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                opacity: sending ? 0.7 : 1, transition: 'all 0.2s',
              }}>
                {sending
                  ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Envoi du code...</>
                  : <><Send size={15} /> Tester & Envoyer le code</>
                }
              </button>
              <button type="button" onClick={onCancel} style={{
                height: '44px', padding: '0 18px', fontSize: '13px', fontWeight: 600,
                color: 'rgba(203,213,225,0.6)', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer',
              }}>
                Ignorer pour le moment
              </button>
            </>
          )}

          {step === 'wait_code' && (
            <>
              <button type="button" onClick={handleVerify} disabled={verifying || codeInput.length !== 6} style={{
                flex: 1, height: '44px', fontSize: '13.5px', fontWeight: 700,
                background: codeInput.length === 6
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'rgba(255,255,255,0.08)',
                border: 'none', borderRadius: '12px', color: '#fff', cursor: codeInput.length === 6 ? 'pointer' : 'default',
                opacity: verifying ? 0.7 : 1, transition: 'all 0.2s',
              }}>
                {verifying ? 'Vérification...' : '✅ Valider le code'}
              </button>
              <button type="button" onClick={() => setStep('config')} style={{
                height: '44px', padding: '0 14px', fontSize: '12px', fontWeight: 600,
                color: 'rgba(147,197,253,0.8)', background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.25)', borderRadius: '12px', cursor: 'pointer',
              }}>
                Modifier Token
              </button>
              <button type="button" onClick={onCancel} style={{
                height: '44px', padding: '0 14px', fontSize: '12px', fontWeight: 600,
                color: 'rgba(203,213,225,0.5)', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', cursor: 'pointer',
              }}>
                Ignorer
              </button>
            </>
          )}

          {step === 'error' && (
            <>
              <button type="button" onClick={() => { setStep('config'); setError(''); setCodeInput(''); }} style={{
                flex: 1, height: '44px', fontSize: '13px', fontWeight: 700,
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none',
                borderRadius: '12px', color: '#fff', cursor: 'pointer',
              }}>
                Modifier le Bot Token / Chat ID
              </button>
              <button type="button" onClick={onCancel} style={{
                height: '44px', padding: '0 18px', fontSize: '13px', fontWeight: 600,
                color: 'rgba(203,213,225,0.5)', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', cursor: 'pointer',
              }}>
                Ignorer
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
