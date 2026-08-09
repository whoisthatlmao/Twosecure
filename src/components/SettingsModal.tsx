import React, { useState, useEffect } from 'react';
import { X, Settings, ShieldAlert, Trash2, Unlink, CheckCircle2, AlertTriangle, Key, Lock, Eye, EyeOff } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from './Toast';
import { ConfirmModal } from './ConfirmModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetVault: () => void;
  onOpenTelegramSetup?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, onResetVault, onOpenTelegramSetup,
}) => {
  const { showToast } = useToast();
  const [telegramLinked, setTelegramLinked] = useState<boolean>(false);
  const [unlinking, setUnlinking] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  // Confirm Modals state
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const loadConfig = async () => {
    try {
      const config: any = await invoke('get_telegram_config');
      setTelegramLinked(Boolean(config?.linked));
    } catch (err) {
      console.error('Erreur chargement config Telegram:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  }, [isOpen]);

  const handleUnlinkTelegram = async () => {
    setShowUnlinkConfirm(false);
    setUnlinking(true);
    try {
      await invoke('unlink_telegram');
      setTelegramLinked(false);
      showToast('Liaison Telegram supprimée avec succès.', 'success', 4000);
    } catch (err: any) {
      showToast(`Erreur : ${err?.toString() || err}`, 'error');
    } finally {
      setUnlinking(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Veuillez saisir votre mot de passe actuel', 'warning');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Le nouveau mot de passe doit comporter au moins 8 caractères', 'warning');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('Les nouveaux mots de passe ne correspondent pas', 'error');
      return;
    }

    setChangingPass(true);
    try {
      await invoke('change_master_password', {
        currentPassword,
        newPassword,
      });
      showToast('Mot de passe maître mis à jour avec succès !', 'success', 5000);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      showToast(`Erreur : ${err?.toString() || err}`, 'error');
    } finally {
      setChangingPass(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(5, 5, 8, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 150,
      }}>
        <div className="glass-panel animate-fade-in" style={{
          width: '100%', maxWidth: '540px',
          padding: '28px',
          background: 'rgba(12, 9, 22, 0.95)',
          borderRadius: '24px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 0 50px rgba(139, 92, 246, 0.18), 0 0 30px rgba(0, 0, 0, 0.9)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.2))',
                border: '1px solid rgba(139,92,246,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Settings size={22} color="#c084fc" />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px', margin: 0 }}>
                  Paramètres du coffre-fort
                </h2>
                <span style={{ fontSize: '12px', color: 'rgba(203,213,225,0.5)' }}>
                  Sécurité, mot de passe maître & 2FA Telegram
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(203,213,225,0.6)', cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '2px' }} className="no-scrollbar">
            
            {/* Section 1: Changer le Mot de passe Maître */}
            <div style={{
              background: 'rgba(8, 6, 16, 0.6)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              borderRadius: '16px', padding: '18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Key size={18} color="#c084fc" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
                  Changer le mot de passe maître
                </span>
              </div>

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Current password */}
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Mot de passe maître actuel"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ width: '100%', height: '38px', fontSize: '12.5px', paddingRight: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'rgba(203,213,225,0.5)', cursor: 'pointer',
                    }}
                  >
                    {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* New password */}
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Nouveau mot de passe maître (min. 8 car.)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ width: '100%', height: '38px', fontSize: '12.5px', paddingRight: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'rgba(203,213,225,0.5)', cursor: 'pointer',
                    }}
                  >
                    {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Confirm new password */}
                <input
                  type={showNewPass ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Confirmer le nouveau mot de passe maître"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  style={{ width: '100%', height: '38px', fontSize: '12.5px' }}
                />

                <button
                  type="submit"
                  disabled={changingPass || !currentPassword || !newPassword}
                  style={{
                    height: '38px', fontSize: '12.5px', fontWeight: 700, color: '#ffffff',
                    background: currentPassword && newPassword ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' : 'rgba(255,255,255,0.06)',
                    border: 'none', borderRadius: '10px', cursor: currentPassword && newPassword ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s', marginTop: '4px',
                  }}
                >
                  <Lock size={14} />
                  <span>{changingPass ? 'Changement en cours...' : 'Modifier le mot de passe maître'}</span>
                </button>
              </form>
            </div>

            {/* Section 2: Telegram 2FA (Facultatif / Optionnel) */}
            <div style={{
              background: 'rgba(8, 6, 16, 0.6)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '16px', padding: '18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldAlert size={18} color="#c084fc" />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
                    Double Authentification Telegram (Optionnel)
                  </span>
                </div>
                {telegramLinked ? (
                  <span style={{
                    fontSize: '11px', fontWeight: 700, color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px',
                  }}>
                    <CheckCircle2 size={12} /> Lié
                  </span>
                ) : (
                  <span style={{
                    fontSize: '11px', fontWeight: 700, color: 'rgba(203,213,225,0.5)',
                    background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '4px 10px', borderRadius: '20px',
                  }}>
                    Non configuré
                  </span>
                )}
              </div>

              <p style={{ fontSize: '12.5px', color: 'rgba(203,213,225,0.6)', lineHeight: 1.5, marginBottom: '14px' }}>
                {telegramLinked
                  ? 'Votre compte Telegram est associé à ce coffre. Chaque déverrouillage nécessite une validation PUSH sur votre application Telegram.'
                  : 'Associez un bot Telegram pour exiger une validation PUSH sur votre téléphone lors du déverrouillage du coffre.'}
              </p>

              {telegramLinked ? (
                <button
                  type="button"
                  onClick={() => setShowUnlinkConfirm(true)}
                  disabled={unlinking}
                  style={{
                    width: '100%', height: '38px', fontSize: '12.5px', fontWeight: 600,
                    color: '#f87171', background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  <Unlink size={15} />
                  <span>Dissocier la 2FA Telegram</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenTelegramSetup) onOpenTelegramSetup();
                  }}
                  style={{
                    width: '100%', height: '38px', fontSize: '12.5px', fontWeight: 700,
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #0088cc 0%, #006699 100%)',
                    border: 'none', borderRadius: '10px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 0 15px rgba(0, 136, 204, 0.3)',
                  }}
                >
                  <ShieldAlert size={15} />
                  <span>Configurer et associer Telegram 2FA</span>
                </button>
              )}
            </div>

            {/* Section 3: Danger Zone / Vault Reset */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '16px', padding: '18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <AlertTriangle size={18} color="#ef4444" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>
                  Zone Dangereuse
                </span>
              </div>

              <p style={{ fontSize: '12px', color: 'rgba(203,213,225,0.55)', lineHeight: 1.5, marginBottom: '14px' }}>
                La réinitialisation supprime définitivement votre coffre-fort et toutes les données chiffrées contenues.
              </p>

              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                style={{
                  width: '100%', height: '38px', fontSize: '12.5px', fontWeight: 700,
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  border: 'none', borderRadius: '10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 0 15px rgba(239, 68, 68, 0.25)',
                }}
              >
                <Trash2 size={15} />
                <span>Réinitialiser complètement le coffre</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Unlinking Telegram */}
      <ConfirmModal
        isOpen={showUnlinkConfirm}
        title="Dissocier la 2FA Telegram"
        message="Voulez-vous vraiment dissocier votre compte Telegram ? Le coffre sera déverrouillable uniquement avec votre mot de passe maître."
        confirmText="Dissocier"
        cancelText="Annuler"
        variant="warning"
        onConfirm={handleUnlinkTelegram}
        onCancel={() => setShowUnlinkConfirm(false)}
      />

      {/* Confirmation Modal for Resetting Vault */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Réinitialiser complètement le coffre"
        message={'⚠️ ATTENTION : Cette action est irréversible !\n\nToutes vos données, mots de passe et notes chiffrées seront définitivement supprimés.'}
        confirmText="Supprimer et réinitialiser"
        cancelText="Annuler"
        variant="danger"
        onConfirm={() => {
          setShowResetConfirm(false);
          onClose();
          onResetVault();
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </>
  );
};
