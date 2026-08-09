import React, { useState } from 'react';
import { X, RefreshCw, Download, CheckCircle2 } from 'lucide-react';
import { check } from '@tauri-apps/plugin-updater';
import { useToast } from './Toast';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const checkForUpdates = async () => {
    setChecking(true);
    setStatusMessage('Recherche de mises à jour...');
    try {
      const update = await check();
      if (update && update.available) {
        setUpdateAvailable(update);
        setStatusMessage(`Nouvelle version ${update.version} disponible !`);
      } else {
        setUpdateAvailable(null);
        setStatusMessage('Vous utilisez déjà la dernière version disponible (v0.1.0).');
        showToast('TwoSecure est à jour !', 'success');
      }
    } catch (err: any) {
      console.error('Erreur de recherche de mise à jour:', err);
      setStatusMessage('Le serveur de mise à jour n\'est pas encore disponible.');
    } finally {
      setChecking(false);
    }
  };

  const simulateUpdateTest = () => {
    setChecking(true);
    setStatusMessage('Simuler la recherche de mises à jour...');
    setTimeout(() => {
      setChecking(false);
      setUpdateAvailable({
        version: '0.2.0',
        body: '✨ Version v0.2.0 (Démonstration) ! Nouvelles fonctionnalités de sécurité et corrections incluses.',
        downloadAndInstall: async (onEvent: any) => {
          onEvent({ event: 'Started', data: { contentLength: 100 } });
          for (let i = 10; i <= 100; i += 20) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            onEvent({ event: 'Progress', data: { chunkLength: 20 } });
          }
          onEvent({ event: 'Finished' });
        },
      });
      setStatusMessage('Nouvelle version v0.2.0 de test détectée !');
      showToast('Version v0.2.0 (Démo) disponible !', 'info');
    }, 1000);
  };

  const handleInstallUpdate = async () => {
    if (!updateAvailable) return;
    setDownloading(true);
    setStatusMessage('Téléchargement de la mise à jour en cours...');
    try {
      let downloaded = 0;
      let contentLength = 0;

      await updateAvailable.downloadAndInstall((event: any) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case 'Finished':
            setStatusMessage('Installation terminée. Redémarrage de l\'application...');
            break;
        }
      });

      showToast('Mise à jour simulée installée avec succès !', 'success');
    } catch (err: any) {
      console.error('Erreur d\'installation de la mise à jour:', err);
      setStatusMessage('Échec de l\'installation de la mise à jour.');
      showToast(`Erreur d'installation: ${err?.message || err}`, 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(5, 5, 8, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 150,
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%', maxWidth: '480px',
        padding: '28px',
        background: 'rgba(12, 9, 22, 0.95)',
        borderRadius: '24px',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        boxShadow: '0 0 50px rgba(168, 85, 247, 0.18), 0 0 30px rgba(0, 0, 0, 0.9)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(99,102,241,0.2))',
              border: '1px solid rgba(168,85,247,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RefreshCw size={22} color="#c084fc" className={checking ? 'animate-spin' : ''} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px', margin: 0 }}>
                Mises à jour TwoSecure
              </h2>
              <span style={{ fontSize: '12px', color: 'rgba(203,213,225,0.5)' }}>
                Tauri Updater automatique
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={downloading}
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

        {/* Content Box */}
        <div style={{
          background: 'rgba(8, 6, 16, 0.6)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: '16px', padding: '20px', marginBottom: '20px',
          textAlign: 'center'
        }}>
          {updateAvailable ? (
            <div>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)',
                margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Download size={24} color="#10b981" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                Nouvelle version v{updateAvailable.version} disponible !
              </h3>
              <p style={{ fontSize: '12.5px', color: 'rgba(203,213,225,0.6)', marginBottom: '16px' }}>
                {updateAvailable.body || 'Mise à jour recommandée incluant des améliorations de sécurité et de performances.'}
              </p>

              {downloading && progress !== null && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{
                    width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)',
                    borderRadius: '4px', overflow: 'hidden', marginBottom: '6px'
                  }}>
                    <div style={{
                      width: `${progress}%`, height: '100%',
                      background: 'linear-gradient(90deg, #a855f7, #6366f1)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <span style={{ fontSize: '12px', color: '#c084fc', fontWeight: 600 }}>
                    {progress}% téléchargé
                  </span>
                </div>
              )}

              <button
                onClick={handleInstallUpdate}
                disabled={downloading}
                style={{
                  width: '100%', height: '42px', fontSize: '13.5px', fontWeight: 700,
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none', borderRadius: '12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)',
                }}
              >
                {downloading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                <span>{downloading ? 'Installation...' : 'Télécharger et Installer'}</span>
              </button>
            </div>
          ) : (
            <div>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)',
                margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CheckCircle2 size={24} color="#c084fc" />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                Version actuelle : v0.1.0
              </h3>
              <p style={{ fontSize: '12.5px', color: 'rgba(203,213,225,0.6)', marginBottom: '16px' }}>
                {statusMessage || 'Cliquez sur le bouton ci-dessous pour rechercher les nouvelles versions.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={checkForUpdates}
                  disabled={checking}
                  style={{
                    width: '100%', height: '42px', fontSize: '13.5px', fontWeight: 700,
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                    border: 'none', borderRadius: '12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 0 20px rgba(124, 58, 237, 0.35)',
                  }}
                >
                  <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
                  <span>{checking ? 'Vérification...' : 'Rechercher des mises à jour'}</span>
                </button>

                <button
                  onClick={simulateUpdateTest}
                  disabled={checking}
                  style={{
                    width: '100%', height: '36px', fontSize: '12px', fontWeight: 600,
                    color: '#c084fc',
                    background: 'rgba(168, 85, 247, 0.12)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: '10px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  <span>✨ Simuler une mise à jour v0.2.0 (Mode Test)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
