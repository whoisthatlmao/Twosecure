import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Download, CheckCircle2, Sparkles } from 'lucide-react';
import { check } from '@tauri-apps/plugin-updater';
import { getVersion } from '@tauri-apps/api/app';
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
  const [currentVersion, setCurrentVersion] = useState<string>('...');
  const [isUpToDate, setIsUpToDate] = useState(false);

  useEffect(() => {
    getVersion().then(v => setCurrentVersion(v)).catch(() => setCurrentVersion('?'));
  }, []);

  const checkForUpdates = async () => {
    setChecking(true);
    setIsUpToDate(false);
    setStatusMessage('Recherche de mises à jour...');
    try {
      const update = await check();
      if (update && update.available) {
        setUpdateAvailable(update);
        setStatusMessage(`Nouvelle version v${update.version} disponible !`);
        showToast(`Mise à jour v${update.version} disponible !`, 'info');
      } else {
        setUpdateAvailable(null);
        setIsUpToDate(true);
        setStatusMessage(`TwoSecure v${currentVersion} est déjà à jour.`);
        showToast('✅ TwoSecure est à jour !', 'success');
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err) || 'Erreur inconnue';
      setStatusMessage(`Erreur : ${errMsg}`);
      showToast(`Erreur de mise à jour : ${errMsg}`, 'error');
    } finally {
      setChecking(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateAvailable) return;
    setDownloading(true);
    setProgress(0);
    setStatusMessage('Téléchargement de la mise à jour...');
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
            setStatusMessage('Installation terminée. Redémarrage...');
            setProgress(100);
            break;
        }
      });

      showToast('Mise à jour installée ! Redémarrage en cours...', 'success');
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      setStatusMessage(`Échec de l'installation : ${errMsg}`);
      showToast(`Erreur d'installation : ${errMsg}`, 'error');
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
                Mise à jour automatique
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
            /* ── Mise à jour disponible ── */
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
                {updateAvailable.body || 'Mise à jour recommandée incluant des améliorations de sécurité.'}
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
                  background: downloading
                    ? 'rgba(16, 185, 129, 0.4)'
                    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none', borderRadius: '12px', cursor: downloading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.2s',
                }}
              >
                {downloading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                <span>{downloading ? `Installation... ${progress ?? 0}%` : 'Télécharger et Installer'}</span>
              </button>
            </div>
          ) : isUpToDate ? (
            /* ── Déjà à jour ── */
            <div>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)',
                margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CheckCircle2 size={24} color="#10b981" />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#10b981', marginBottom: '6px' }}>
                Vous êtes à jour !
              </h3>
              <p style={{ fontSize: '12.5px', color: 'rgba(203,213,225,0.6)', marginBottom: '16px' }}>
                TwoSecure v{currentVersion} est la dernière version disponible.
              </p>
              <button
                onClick={checkForUpdates}
                style={{
                  width: '100%', height: '40px', fontSize: '13px', fontWeight: 600,
                  color: 'rgba(203,213,225,0.7)',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                <RefreshCw size={14} />
                <span>Vérifier à nouveau</span>
              </button>
            </div>
          ) : (
            /* ── État initial ── */
            <div>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)',
                margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Sparkles size={24} color="#c084fc" />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                Version actuelle : v{currentVersion}
              </h3>
              <p style={{ fontSize: '12.5px', color: 'rgba(203,213,225,0.6)', marginBottom: '16px' }}>
                {statusMessage || 'Cliquez pour rechercher de nouvelles versions.'}
              </p>

              <button
                onClick={checkForUpdates}
                disabled={checking}
                style={{
                  width: '100%', height: '42px', fontSize: '13.5px', fontWeight: 700,
                  color: '#ffffff',
                  background: checking
                    ? 'rgba(124, 58, 237, 0.5)'
                    : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  border: 'none', borderRadius: '12px', cursor: checking ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 0 20px rgba(124, 58, 237, 0.35)',
                  transition: 'all 0.2s',
                }}
              >
                <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
                <span>{checking ? 'Vérification...' : 'Rechercher des mises à jour'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
