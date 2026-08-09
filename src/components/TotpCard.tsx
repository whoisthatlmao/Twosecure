import React, { useEffect, useState } from 'react';
import { ShieldCheck, Copy, Check } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { TotpResponse } from '../types';

interface TotpCardProps {
  secret: string;
}

export const TotpCard: React.FC<TotpCardProps> = ({ secret }) => {
  const [totpData, setTotpData] = useState<TotpResponse | null>(null);
  const [copied, setCopied]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fetchCode = async () => {
    try {
      const res: TotpResponse = await invoke('generate_totp', { secret });
      setTotpData(res);
      setError(null);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : 'Secret TOTP invalide');
    }
  };

  useEffect(() => {
    fetchCode();
    const interval = setInterval(fetchCode, 1000);
    return () => clearInterval(interval);
  }, [secret]);

  const handleCopy = () => {
    if (!totpData) return;
    navigator.clipboard.writeText(totpData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div style={{
        fontSize: '11px', color: '#ef4444',
        padding: '8px 12px',
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '12px',
      }}>
        ⚠ Secret 2FA invalide
      </div>
    );
  }

  if (!totpData) return null;

  const progressPercent = (totpData.seconds_remaining / 30) * 100;
  const formattedCode   = `${totpData.code.slice(0, 3)} ${totpData.code.slice(3)}`;
  const isUrgent        = totpData.seconds_remaining <= 5;
  const ringColor       = isUrgent ? '#ef4444' : '#8b5cf6';

  return (
    <div style={{
      background: 'rgba(124, 58, 237, 0.08)',
      border: '1px solid rgba(139, 92, 246, 0.2)',
      borderRadius: '16px',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ShieldCheck size={20} color="#8b5cf6" />
        <div>
          <span style={{
            fontSize: '10px', color: 'rgba(203, 213, 225, 0.45)',
            display: 'block', marginBottom: '2px',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px',
          }}>
            Code 2FA (TOTP)
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: '19px', fontWeight: 800, letterSpacing: '3px',
              color: isUrgent ? '#ef4444' : '#ffffff',
              transition: 'color 0.3s',
            }}
          >
            {formattedCode}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Countdown ring */}
        <div style={{
          position: 'relative', width: '30px', height: '30px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="30" height="30" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke={ringColor} strokeWidth="3.5"
              strokeDasharray={`${progressPercent}, 100`}
              style={{ transition: 'stroke-dasharray 1s linear, stroke 0.3s' }}
            />
          </svg>
          <span style={{
            position: 'absolute', fontSize: '9px', fontWeight: 700,
            color: isUrgent ? '#ef4444' : 'rgba(203, 213, 225, 0.6)',
          }}>
            {totpData.seconds_remaining}
          </span>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          title="Copier le code 2FA"
          style={{
            background: copied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.12)',
            border: copied ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: '10px',
            padding: '8px',
            cursor: 'pointer',
            color: copied ? '#10b981' : '#8b5cf6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
};
