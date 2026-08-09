import React from 'react';

interface PasswordStrengthBarProps {
  password: string;
  showDetails?: boolean;
}

// ─────────────────────────────────────────────
// Smart Entropy & Strength Calculation
// ─────────────────────────────────────────────
const COMMON_PATTERNS = [
  'qwerty', 'azerty', '12345', '123456', '123456789', 'password', 'motdepasse',
  'abc', 'abcd', 'admin', 'welcome', '0000', '1111', '123123', 'pass', 'iloveyou'
];

export function calculateSmartEntropy(password: string): { entropy: number; penaltyReason?: string } {
  if (!password) return { entropy: 0 };

  const lower = password.toLowerCase();
  
  // 1. Check for single character repetition (e.g. "aaaaaaaaaaaa")
  const uniqueChars = new Set(password.split('')).size;
  if (uniqueChars === 1) {
    return { entropy: 0, penaltyReason: 'Caractère unique répété' };
  }

  // 2. Base entropy calculation
  let charsetSize = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigits = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);

  if (hasLower) charsetSize += 26;
  if (hasUpper) charsetSize += 26;
  if (hasDigits) charsetSize += 10;
  if (hasSymbols) charsetSize += 32;

  let rawEntropy = password.length * Math.log2(charsetSize);

  // 3. Variety ratio penalty (e.g., "a1a1a1a1a1a1" vs "aB3$kL9#mP0q")
  const varietyRatio = uniqueChars / password.length;
  if (varietyRatio < 0.3) {
    rawEntropy *= 0.3; // 70% penalty for low char variety
  } else if (varietyRatio < 0.5) {
    rawEntropy *= 0.6; // 40% penalty
  }

  // 4. Common pattern detection penalty
  for (const pattern of COMMON_PATTERNS) {
    if (lower.includes(pattern)) {
      rawEntropy *= 0.4; // 60% penalty for containing common pattern
      break;
    }
  }

  // 5. Diversity check ceiling
  const typesCount = [hasLower, hasUpper, hasDigits, hasSymbols].filter(Boolean).length;
  if (typesCount === 1) {
    rawEntropy = Math.min(rawEntropy, 25); // Max 25 bits if only 1 type of char
  } else if (typesCount === 2 && password.length < 12) {
    rawEntropy = Math.min(rawEntropy, 42); // Max 42 bits if only 2 types
  }

  return { entropy: Math.round(rawEntropy) };
}

interface StrengthLevel {
  level: number;   // 0–5
  label: string;
  color: string;
  glow: string;
}

function getStrength(entropy: number, password: string): StrengthLevel {
  if (!password || entropy === 0) {
    return { level: 0, label: 'Invalide / Trivial', color: '#ef4444', glow: 'rgba(239,68,68,0.4)' };
  }
  if (entropy < 30) {
    return { level: 1, label: 'Très faible', color: '#ef4444', glow: 'rgba(239,68,68,0.4)' };
  }
  if (entropy < 50) {
    return { level: 2, label: 'Faible', color: '#f97316', glow: 'rgba(249,115,22,0.4)' };
  }
  if (entropy < 70) {
    return { level: 3, label: 'Moyen', color: '#f59e0b', glow: 'rgba(245,158,11,0.4)' };
  }
  if (entropy < 90) {
    return { level: 4, label: 'Fort', color: '#10b981', glow: 'rgba(16,185,129,0.45)' };
  }
  return { level: 5, label: 'Incrackable', color: '#00f2c3', glow: 'rgba(0,242,195,0.5)' };
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export const PasswordStrengthBar: React.FC<PasswordStrengthBarProps> = ({
  password,
  showDetails = true,
}) => {
  const { entropy } = calculateSmartEntropy(password);
  const strength = getStrength(entropy, password);
  const pct = (strength.level / 5) * 100;

  if (!password) return null;

  return (
    <div style={{ marginTop: '10px' }}>
      {/* Label row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '7px',
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'rgba(203,213,225,0.55)',
          textTransform: 'uppercase',
          letterSpacing: '0.7px',
        }}>
          Force du mot de passe
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {showDetails && (
            <span style={{
              fontSize: '10.5px',
              color: 'rgba(203,213,225,0.4)',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              {entropy} bits
            </span>
          )}
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            color: strength.color,
            minWidth: '72px',
            textAlign: 'right',
            filter: `drop-shadow(0 0 4px ${strength.glow})`,
            transition: 'color 0.3s ease',
          }}>
            {strength.label}
          </span>
        </div>
      </div>

      {/* Progress bar track */}
      <div style={{
        height: '5px',
        borderRadius: '99px',
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: '99px',
          background: strength.level >= 4
            ? `linear-gradient(90deg, ${strength.color}90, ${strength.color})`
            : strength.color,
          boxShadow: strength.level > 0 ? `0 0 8px ${strength.glow}` : 'none',
          transition: 'width 0.5s cubic-bezier(0.34,1.2,0.64,1), background 0.4s ease, box-shadow 0.4s ease',
        }} />
      </div>

      {/* 5-segment dots */}
      <div style={{
        display: 'flex',
        gap: '5px',
        marginTop: '6px',
      }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{
            flex: 1,
            height: '3px',
            borderRadius: '3px',
            background: i <= strength.level ? strength.color : 'rgba(255,255,255,0.06)',
            boxShadow: i <= strength.level ? `0 0 6px ${strength.glow}` : 'none',
            transition: 'background 0.35s ease, box-shadow 0.35s ease',
          }} />
        ))}
      </div>
    </div>
  );
};
