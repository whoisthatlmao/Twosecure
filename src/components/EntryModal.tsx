import React, { useState, useEffect } from 'react';
import { X, Key, CreditCard, FileText, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { VaultEntry, EntryCategory } from '../types';
import { PasswordStrengthBar } from './PasswordStrengthBar';

interface EntryModalProps {
  isOpen: boolean;
  entryToEdit?: VaultEntry | null;
  onClose: () => void;
  onSave: (entry: VaultEntry) => void;
}

const CATEGORIES = [
  { id: 'Password', label: 'Mot de passe', icon: Key },
  { id: 'Card',     label: 'Carte',         icon: CreditCard },
  { id: 'Note',     label: 'Note',          icon: FileText },
];

export const EntryModal: React.FC<EntryModalProps> = ({
  isOpen, entryToEdit, onClose, onSave,
}) => {
  const [title, setTitle]           = useState('');
  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [url, setUrl]               = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [notes, setNotes]           = useState('');
  const [category, setCategory]     = useState<EntryCategory>('Password');

  // Dedicated card fields
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv]       = useState('');
  const [showCvv, setShowCvv]       = useState(false);

  useEffect(() => {
    if (entryToEdit) {
      setTitle(entryToEdit.title);
      setUsername(entryToEdit.username);
      setPassword(entryToEdit.password);
      setUrl(entryToEdit.url);
      setTotpSecret(entryToEdit.totp_secret || '');
      setNotes(entryToEdit.notes || '');
      setCategory(entryToEdit.category === 'Totp' ? 'Password' : entryToEdit.category);
      setCardHolder(entryToEdit.card_holder || '');
      setCardNumber(entryToEdit.card_number || '');
      setCardExpiry(entryToEdit.card_expiry || '');
      setCardCvv(entryToEdit.card_cvv || '');
    } else {
      setTitle(''); setUsername(''); setPassword('');
      setUrl(''); setTotpSecret(''); setNotes('');
      setCategory('Password');
      setCardHolder(''); setCardNumber(''); setCardExpiry(''); setCardCvv('');
    }
    setShowPassword(false);
    setShowCvv(false);
  }, [entryToEdit, isOpen]);

  const handleGeneratePassword = async () => {
    try {
      const generated: string = await invoke('generate_password', {
        length: 20, upper: true, lower: true, digits: true, symbols: true,
      });
      setPassword(generated);
    } catch (err) { console.error(err); }
  };

  // Format card number as **** **** **** ****
  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\s/g, '').replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') ?? raw;
    setCardNumber(formatted);
  };

  // Format expiry as MM/AA
  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const entry: VaultEntry = {
      id: entryToEdit ? entryToEdit.id : crypto.randomUUID(),
      title,
      username: category === 'Card' ? cardHolder : username,
      password: category === 'Card' ? cardCvv : password,
      url,
      totp_secret:  totpSecret.trim()  ? totpSecret.trim()  : undefined,
      notes:        notes.trim()        ? notes.trim()        : undefined,
      category,
      favorite:    entryToEdit ? entryToEdit.favorite   : false,
      created_at:  entryToEdit ? entryToEdit.created_at : 0,
      updated_at:  entryToEdit ? entryToEdit.updated_at : 0,
      card_holder: category === 'Card' && cardHolder  ? cardHolder  : undefined,
      card_number: category === 'Card' && cardNumber  ? cardNumber  : undefined,
      card_expiry: category === 'Card' && cardExpiry  ? cardExpiry  : undefined,
      card_cvv:    category === 'Card' && cardCvv     ? cardCvv     : undefined,
    };
    onSave(entry);
    onClose();
  };

  if (!isOpen) return null;

  const fieldLabel = (text: string) => (
    <label style={{
      fontSize: '11px', fontWeight: 700, color: 'rgba(203, 213, 225, 0.7)',
      marginBottom: '6px', display: 'block',
      textTransform: 'uppercase', letterSpacing: '0.8px',
    }}>
      {text}
    </label>
  );

  const inputStyle = {
    background: 'rgba(8, 6, 16, 0.95)',
    color: '#ffffff',
    border: '1px solid rgba(139, 92, 246, 0.3)',
  };

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
          width: '100%', maxWidth: '520px',
          padding: '30px',
          background: 'rgba(12, 9, 22, 0.94)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderRadius: '24px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 0 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(139, 92, 246, 0.15)',
          maxHeight: '90vh', overflowY: 'scroll',
          scrollbarWidth: 'none' as const,
          msOverflowStyle: 'none' as const,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
            {entryToEdit ? '✏️ Éditer l\'élément' : '➕ Nouvel élément'}
          </h2>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Category */}
          <div>
            {fieldLabel('Catégorie')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {CATEGORIES.map((item) => {
                const Icon = item.icon;
                const sel = category === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id as EntryCategory)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      padding: '12px 6px',
                      borderRadius: '14px',
                      border: sel ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.08)',
                      background: sel
                        ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.3) 0%, rgba(30, 16, 42, 0.6) 100%)'
                        : 'rgba(255,255,255,0.03)',
                      color: sel ? '#ffffff' : 'rgba(203, 213, 225, 0.65)',
                      cursor: 'pointer',
                      fontSize: '12px', fontWeight: sel ? 600 : 500,
                      transition: 'all 0.2s ease',
                      boxShadow: sel ? '0 0 15px rgba(168, 85, 247, 0.25)' : 'none',
                    }}
                  >
                    <Icon size={18} color={sel ? '#c084fc' : 'rgba(203, 213, 225, 0.5)'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            {fieldLabel(category === 'Note' ? 'Titre de la note *' : category === 'Card' ? 'Nom de la carte *' : 'Titre / Service *')}
            <input
              type="text" className="input-field"
              placeholder={category === 'Note' ? 'ex: Code Wi-Fi, Clés d\'urgence...' : category === 'Card' ? 'ex: Visa Platinum, Compte Pro...' : 'ex: Google, GitHub, Binance...'}
              value={title} onChange={(e) => setTitle(e.target.value)} required
              style={inputStyle}
            />
          </div>

          {/* ════════ CARD FIELDS ════════ */}
          {category === 'Card' && (
            <>
              {/* Card Holder */}
              <div>
                {fieldLabel('Titulaire de la carte')}
                <input
                  type="text" className="input-field"
                  placeholder="ex: ALEX DUPONT"
                  value={cardHolder} onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '1px' }}
                />
              </div>

              {/* Card Number */}
              <div>
                {fieldLabel('Numéro de carte')}
                <input
                  type="text" className="input-field card-number-field"
                  placeholder="**** **** **** ****"
                  value={cardNumber} onChange={(e) => handleCardNumberChange(e.target.value)}
                  maxLength={19}
                  style={inputStyle}
                />
              </div>

              {/* Expiry + CVV side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  {fieldLabel('Date d\'expiration')}
                  <input
                    type="text" className="input-field"
                    placeholder="MM/AA"
                    value={cardExpiry} onChange={(e) => handleExpiryChange(e.target.value)}
                    maxLength={5}
                    style={{ ...inputStyle, textAlign: 'center', letterSpacing: '2px', fontFamily: 'JetBrains Mono, monospace' }}
                  />
                </div>
                <div>
                  {fieldLabel('CVV / CVC')}
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCvv ? 'text' : 'password'} className="input-field"
                      placeholder="•••"
                      value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      maxLength={4}
                      style={{ ...inputStyle, textAlign: 'center', letterSpacing: '4px', fontFamily: 'JetBrains Mono, monospace', paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCvv(!showCvv)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(203,213,225,0.5)', transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#8b5cf6'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(203,213,225,0.5)'; }}
                    >
                      {showCvv ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes for card */}
              <div>
                {fieldLabel('Notes chiffrées')}
                <textarea
                  className="input-field" rows={2}
                  placeholder="Plafond, réseau, informations supplémentaires..."
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  style={{ resize: 'none', ...inputStyle }}
                />
              </div>
            </>
          )}

          {/* ════════ NON-CARD FIELDS ════════ */}
          {category !== 'Card' && (
            <>
              {/* Username — Hidden for Note */}
              {category !== 'Note' && (
                <div>
                  {fieldLabel('Identifiant / Email')}
                  <input
                    type="text" className="input-field"
                    placeholder="ex: alex@example.com"
                    value={username} onChange={(e) => setUsername(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}

              {/* Password — Hidden for Note */}
              {category !== 'Note' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(203, 213, 225, 0.7)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Mot de passe
                    </span>
                    <button
                      type="button" onClick={handleGeneratePassword}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#c084fc', fontSize: '12px', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '5px',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                      <RefreshCw size={13} />
                      <span>Générer</span>
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'} className="input-field font-mono"
                      placeholder="Saisissez ou générez un mot de passe"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      style={{ ...inputStyle, paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(203,213,225,0.5)', transition: 'color 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#8b5cf6'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(203,213,225,0.5)'; }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {/* Password Strength Bar */}
                  <PasswordStrengthBar password={password} />
                </div>
              )}

              {/* TOTP — Visible for Totp and Password categories */}
              {(category === 'Totp' || category === 'Password') && (
                <div>
                  {fieldLabel('Secret TOTP 2FA (Optionnel)')}
                  <input
                    type="text" className="input-field font-mono"
                    placeholder="ex: JBSWY3DPEHPK3PXP"
                    value={totpSecret}
                    onChange={(e) => setTotpSecret(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}

              {/* URL — Hidden for Note */}
              {category !== 'Note' && (
                <div>
                  {fieldLabel('URL du site web')}
                  <input
                    type="text" className="input-field"
                    placeholder="ex: https://github.com"
                    value={url} onChange={(e) => setUrl(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                {fieldLabel(category === 'Note' ? 'Contenu de la note chiffrée *' : 'Notes chiffrées')}
                <textarea
                  className="input-field" rows={category === 'Note' ? 6 : 3}
                  placeholder="Informations supplémentaires chiffrées..."
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  style={{ resize: 'none', ...inputStyle }}
                />
              </div>
            </>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                height: '42px', padding: '0 20px',
                fontSize: '13px', fontWeight: 600, color: '#ffffff',
                background: 'rgba(168, 85, 247, 0.16)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '9999px', cursor: 'pointer',
                backdropFilter: 'blur(12px)', transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(168, 85, 247, 0.3)'; e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.7)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(168, 85, 247, 0.16)'; e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)'; }}
            >
              Annuler
            </button>
            <button
              type="submit"
              style={{
                height: '42px', padding: '0 24px',
                fontSize: '13px', fontWeight: 700, color: '#ffffff',
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '9999px', cursor: 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: '0 0 25px rgba(124, 58, 237, 0.45)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 35px rgba(168, 85, 247, 0.65)'; e.currentTarget.style.background = 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 25px rgba(124, 58, 237, 0.45)'; e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'; }}
            >
              <span>{entryToEdit ? 'Mettre à jour' : 'Enregistrer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
