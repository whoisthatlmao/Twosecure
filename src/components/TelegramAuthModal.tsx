import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

import { invoke } from '@tauri-apps/api/core';

interface TelegramAuthModalProps {
  isOpen: boolean;
  onApproved: () => void;
  onDenied: () => void;
  onCancel: () => void;
}

export const TelegramAuthModal: React.FC<TelegramAuthModalProps> = ({
  isOpen, onApproved, onDenied, onCancel,
}) => {
  const [authCode, setAuthCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [status, setStatus] = useState<'sending' | 'pending' | 'approved' | 'denied' | 'error'>('sending');
  const [errorMsg, setErrorMsg] = useState('');

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAuthFlow = async () => {
    setStatus('sending');
    setSecondsLeft(60);
    setErrorMsg('');

    // Generate session random auth code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setAuthCode(code);

    try {
      // Send Telegram push prompt
      await invoke('send_telegram_prompt', { authCode: code });
      setStatus('pending');

      // Start polling status every 1.5s
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res: string = await invoke('check_telegram_prompt', { authCode: code });
          if (res === 'approved') {
            clearInterval(pollIntervalRef.current!);
            clearInterval(countdownIntervalRef.current!);
            setStatus('approved');
            setTimeout(() => onApproved(), 1000);
          } else if (res === 'denied') {
            clearInterval(pollIntervalRef.current!);
            clearInterval(countdownIntervalRef.current!);
            setStatus('denied');
            setTimeout(() => onDenied(), 1500);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 1500);

      // Start 60s countdown
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(pollIntervalRef.current!);
            clearInterval(countdownIntervalRef.current!);
            setStatus('error');
            setErrorMsg('Délai d\'approbation expiré (60s)');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.toString() || 'Erreur lors de l\'envoi Telegram');
    }
  };

  useEffect(() => {
    if (isOpen) {
      startAuthFlow();
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(5, 5, 8, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%', maxWidth: '440px',
          padding: '32px 28px',
          background: 'rgba(12, 9, 22, 0.95)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderRadius: '24px',
          border: '1px solid rgba(139, 92, 246, 0.35)',
          boxShadow: '0 0 60px rgba(139, 92, 246, 0.25), 0 0 30px rgba(0, 0, 0, 0.9)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        }}
      >
        {/* Top Icon */}
        <div style={{
          width: '58px', height: '58px', borderRadius: '18px',
          background: status === 'approved'
            ? 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2))'
            : status === 'denied' || status === 'error'
            ? 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(185,28,28,0.2))'
            : 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(124,58,237,0.2))',
          border: status === 'approved'
            ? '1px solid rgba(16,185,129,0.5)'
            : status === 'denied' || status === 'error'
            ? '1px solid rgba(239,68,68,0.5)'
            : '1px solid rgba(139,92,246,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: status === 'approved'
            ? '0 0 25px rgba(16,185,129,0.4)'
            : '0 0 25px rgba(139,92,246,0.3)',
          marginBottom: '20px',
        }}>
          {status === 'approved' ? (
            <CheckCircle2 size={30} color="#10b981" />
          ) : status === 'denied' || status === 'error' ? (
            <XCircle size={30} color="#ef4444" />
          ) : (
            <Send size={28} color="#c084fc" className="pulse-glow" />
          )}
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px', marginBottom: '8px' }}>
          {status === 'sending' && 'Envoi de la notification Telegram...'}
          {status === 'pending' && 'Validation Push Telegram Requise'}
          {status === 'approved' && 'Accès Approuvé !'}
          {status === 'denied' && 'Accès Refusé par l\'application'}
          {status === 'error' && 'Échec de la validation'}
        </h2>

        {/* Status detail text */}
        <p style={{ fontSize: '13px', color: 'rgba(203, 213, 225, 0.7)', lineHeight: 1.5, marginBottom: '20px' }}>
          {status === 'pending' && (
            <>Une notification avec les boutons <strong>[Approuver]</strong> et <strong>[Refuser]</strong> a été envoyée sur votre téléphone via Telegram.</>
          )}
          {status === 'approved' && 'Le coffre-fort se déverrouille...'}
          {status === 'denied' && 'Quelqu\'un a appuyé sur Refuser dans Telegram.'}
          {status === 'error' && errorMsg}
        </p>

        {/* Session Auth Code Badge */}
        {status === 'pending' && (
          <div style={{
            background: 'rgba(8, 6, 16, 0.8)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '16px', padding: '12px 20px',
            marginBottom: '24px', width: '100%',
          }}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'rgba(203,213,225,0.45)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '4px' }}>
              Code de session Telegram
            </span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#c084fc', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '3px' }}>
              {authCode}
            </span>
          </div>
        )}

        {/* Countdown Ring / Timer */}
        {status === 'pending' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <RefreshCw size={14} color="#8b5cf6" style={{ animation: 'spin 3s linear infinite' }} />
            <span style={{ fontSize: '12px', color: 'rgba(203,213,225,0.6)', fontWeight: 500 }}>
              Attente de votre réponse ({secondsLeft}s restantes)
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
          {status === 'error' && (
            <button
              type="button"
              onClick={startAuthFlow}
              style={{
                flex: 1, height: '42px', fontSize: '13px', fontWeight: 700, color: '#ffffff',
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', cursor: 'pointer',
              }}
            >
              Renvoyer la notification
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            style={{
              height: '42px', padding: '0 20px', fontSize: '13px', fontWeight: 600, color: 'rgba(203, 213, 225, 0.7)',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};
