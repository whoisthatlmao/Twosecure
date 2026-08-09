import React, { useState } from 'react';
import { X, Download, Upload, ShieldCheck, Eye, EyeOff } from 'lucide-react';

import { invoke } from '@tauri-apps/api/core';
import { useToast } from './Toast';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen, onClose, onImportSuccess,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  
  // Export state
  const [exportPath, setExportPath] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Import state
  const [importPath, setImportPath] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [showImportPassword, setShowImportPassword] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await invoke('export_vault', { filePath: exportPath.trim() });
      showToast('Coffre-fort exporté avec succès !', 'success');
      onClose();
    } catch (err: any) {
      showToast(`Erreur d'exportation : ${err?.toString() || err}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importPath.trim()) {
      showToast('Veuillez spécifier le chemin du fichier .2secure à importer', 'warning');
      return;
    }
    if (!importPassword) {
      showToast('Veuillez entrer le mot de passe maître du coffre à importer', 'warning');
      return;
    }

    setIsImporting(true);
    try {
      const count: number = await invoke('import_vault', {
        filePath: importPath.trim(),
        masterPassword: importPassword,
      });
      showToast(`Coffre-fort importé avec succès ! (${count} entrées chargées)`, 'success');
      onImportSuccess();
      onClose();
    } catch (err: any) {
      showToast(`Échec de l'importation : ${err?.toString() || err}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

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
          width: '100%', maxWidth: '480px',
          padding: '28px',
          background: 'rgba(12, 9, 22, 0.94)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderRadius: '24px',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 0 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(139, 92, 246, 0.15)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(99,102,241,0.2))',
              border: '1px solid rgba(168,85,247,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 15px rgba(168, 85, 247, 0.25)',
            }}>
              <ShieldCheck size={20} color="#a855f7" />
            </div>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px' }}>
              Import / Export du Coffre
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

        {/* Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '22px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '10px', borderRadius: '12px',
              border: activeTab === 'export' ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.08)',
              background: activeTab === 'export' ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.03)',
              color: activeTab === 'export' ? '#ffffff' : 'rgba(203,213,225,0.6)',
              fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Download size={16} />
            <span>Exporter</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '10px', borderRadius: '12px',
              border: activeTab === 'import' ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.08)',
              background: activeTab === 'import' ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.03)',
              color: activeTab === 'import' ? '#ffffff' : 'rgba(203,213,225,0.6)',
              fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Upload size={16} />
            <span>Importer</span>
          </button>
        </div>

        {/* Tab content: Export */}
        {activeTab === 'export' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(203,213,225,0.7)', lineHeight: 1.5 }}>
              Exporte l'intégralité de vos données sous forme d'un fichier <strong>chiffré Argon2id + AES-256-GCM</strong>. Seul votre mot de passe maître actuel pourra le déchiffrer.
            </p>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(203,213,225,0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>
                Chemin ou Dossier de destination (Optionnel)
              </label>
              <input
                type="text" className="input-field"
                placeholder="Laissez vide (Documents) ou collez un dossier/chemin"
                value={exportPath} onChange={(e) => setExportPath(e.target.value)}
                style={inputStyle}
              />
              <span style={{ fontSize: '11px', color: 'rgba(203,213,225,0.45)', marginTop: '4px', display: 'block' }}>
                💡 Si vous collez un dossier (ex: <code>C:\Users\kizza\Documents\alalaa</code>), le fichier <code>twosecure_backup.2secure</code> y sera enregistré automatiquement.
              </span>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              style={{
                height: '42px', marginTop: '8px',
                fontSize: '13.5px', fontWeight: 700, color: '#ffffff',
                background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '14px', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.25s ease', boxShadow: '0 0 25px rgba(124, 58, 237, 0.45)',
              }}
            >
              <Download size={16} />
              <span>{isExporting ? 'Exportation...' : 'Exporter le coffre chiffré'}</span>
            </button>
          </div>
        ) : (
          /* Tab content: Import */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(203,213,225,0.7)', lineHeight: 1.5 }}>
              Restaure ou remplace votre coffre-fort à partir d'un fichier <code>.2secure</code> précédemment exporté.
            </p>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(203,213,225,0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>
                Chemin du fichier à importer
              </label>
              <input
                type="text" className="input-field"
                placeholder="ex: C:\Users\Nom\Desktop\mon_coffre.2secure"
                value={importPath} onChange={(e) => setImportPath(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(203,213,225,0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>
                Mot de passe maître du coffre à importer
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showImportPassword ? 'text' : 'password'} className="input-field font-mono"
                  placeholder="Mot de passe maître"
                  value={importPassword} onChange={(e) => setImportPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowImportPassword(!showImportPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(203,213,225,0.5)', transition: 'color 0.2s',
                  }}
                >
                  {showImportPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting}
              style={{
                height: '42px', marginTop: '8px',
                fontSize: '13.5px', fontWeight: 700, color: '#ffffff',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '14px', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.25s ease', boxShadow: '0 0 25px rgba(16, 185, 129, 0.45)',
              }}
            >
              <Upload size={16} />
              <span>{isImporting ? 'Déchiffrement...' : 'Importer et déverrouiller'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
