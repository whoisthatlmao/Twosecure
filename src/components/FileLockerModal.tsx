import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Lock, Download, Trash2, Plus, ShieldCheck,
  Image as ImageIcon, FileText, Film, Music, Archive,
  Code, File, Eye, Search, Grid, List, HardDrive,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/plugin-dialog';
import { useToast } from './Toast';

interface FileLockerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface LockerFileMeta {
  id: string;
  original_name: string;
  size_bytes: number;
  mime_type: string;
  locked_at: number;
}

// ──────────── File Type Helpers ────────────
const getFileCategory = (mime: string, name: string): 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'archive' | 'code' | 'other' => {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('text/') || mime === 'application/json') return 'text';
  if (['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar'].includes(mime)) return 'archive';
  const ext = name.split('.').pop()?.toLowerCase();
  if (['rs', 'py', 'js', 'ts', 'html', 'css', 'go', 'cpp', 'c', 'java'].includes(ext || '')) return 'code';
  return 'other';
};

const getCategoryColor = (cat: string) => {
  switch (cat) {
    case 'image': return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    case 'video': return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
    case 'audio': return { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
    case 'pdf':   return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
    case 'text':  return { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' };
    case 'archive': return { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' };
    case 'code':  return { color: '#a3e635', bg: 'rgba(163, 230, 53, 0.15)' };
    default:      return { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };
  }
};

const CategoryIcon = ({ cat, size = 20 }: { cat: string; size?: number }) => {
  const props = { size, strokeWidth: 1.8 };
  switch (cat) {
    case 'image':   return <ImageIcon {...props} />;
    case 'video':   return <Film {...props} />;
    case 'audio':   return <Music {...props} />;
    case 'pdf':     return <FileText {...props} />;
    case 'text':    return <FileText {...props} />;
    case 'archive': return <Archive {...props} />;
    case 'code':    return <Code {...props} />;
    default:        return <File {...props} />;
  }
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
};

const formatDate = (ts: number) => {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ──────────── Image Viewer ────────────
const ImageViewer = ({
  files, startId, previews, onClose,
  onLoadPreview,
}: {
  files: LockerFileMeta[];
  startId: string;
  previews: Record<string, string>;
  onClose: () => void;
  onLoadPreview: (id: string) => Promise<void>;
}) => {
  const imageFiles = files.filter(f => getFileCategory(f.mime_type, f.original_name) === 'image');
  const [idx, setIdx] = useState(imageFiles.findIndex(f => f.id === startId));
  const [zoom, setZoom] = useState(1);

  const current = imageFiles[idx];
  useEffect(() => {
    if (current && !previews[current.id]) onLoadPreview(current.id);
  }, [current?.id]);

  const prev = () => { setIdx(i => Math.max(0, i - 1)); setZoom(1); };
  const next = () => { setIdx(i => Math.min(imageFiles.length - 1, i + 1)); setZoom(1); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(4, z + 0.25));
      if (e.key === '-') setZoom(z => Math.max(0.25, z - 0.25));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(2, 1, 6, 0.97)',
        backdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
      }}
      onContextMenu={e => e.preventDefault()}
    >
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        background: 'rgba(14, 10, 28, 0.8)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Lock size={16} color="#8b5cf6" />
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
            {current?.original_name}
          </span>
          <span style={{ fontSize: '12px', color: 'rgba(203,213,225,0.5)' }}>
            {idx + 1} / {imageFiles.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} style={iconBtnStyle}>
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: '13px', color: 'rgba(203,213,225,0.7)', minWidth: '45px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} style={iconBtnStyle}>
            <ZoomIn size={16} />
          </button>
          <button onClick={() => setZoom(1)} style={iconBtnStyle}>
            <RotateCcw size={16} />
          </button>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          <button onClick={onClose} style={{ ...iconBtnStyle, color: '#ef4444' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        {/* Prev */}
        {idx > 0 && (
          <button onClick={prev} style={{
            position: 'absolute', left: '16px', zIndex: 10,
            background: 'rgba(14,10,28,0.7)', border: '1px solid rgba(139,92,246,0.3)',
            color: '#fff', cursor: 'pointer', padding: '12px', borderRadius: '14px',
            display: 'flex', transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(14,10,28,0.7)'}
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {previews[current?.id] ? (
          <img
            src={previews[current.id]}
            alt={current.original_name}
            style={{
              maxWidth: '100%', maxHeight: '100%',
              objectFit: 'contain',
              transform: `scale(${zoom})`,
              transition: 'transform 0.2s ease',
              userSelect: 'none',
            }}
            draggable={false}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', color: 'rgba(203,213,225,0.4)' }}>
            <ShieldCheck size={48} style={{ animation: 'pulse 1.5s ease-in-out infinite' }} color="#8b5cf6" />
            <span style={{ fontSize: '14px' }}>Déchiffrement en cours...</span>
          </div>
        )}

        {/* Next */}
        {idx < imageFiles.length - 1 && (
          <button onClick={next} style={{
            position: 'absolute', right: '16px', zIndex: 10,
            background: 'rgba(14,10,28,0.7)', border: '1px solid rgba(139,92,246,0.3)',
            color: '#fff', cursor: 'pointer', padding: '12px', borderRadius: '14px',
            display: 'flex', transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(14,10,28,0.7)'}
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {imageFiles.length > 1 && (
        <div style={{
          display: 'flex', gap: '8px', padding: '12px 20px',
          background: 'rgba(14, 10, 28, 0.8)',
          borderTop: '1px solid rgba(139, 92, 246, 0.2)',
          overflowX: 'auto', flexShrink: 0,
        }} className="no-scrollbar">
          {imageFiles.map((f, i) => (
            <div
              key={f.id}
              onClick={() => { setIdx(i); setZoom(1); }}
              style={{
                width: '60px', height: '60px', borderRadius: '10px', flexShrink: 0,
                overflow: 'hidden', cursor: 'pointer',
                border: `2px solid ${i === idx ? '#8b5cf6' : 'transparent'}`,
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color 0.2s',
              }}
            >
              {previews[f.id]
                ? <img src={previews[f.id]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <ImageIcon size={20} color="rgba(203,213,225,0.3)" />
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const iconBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(226, 232, 240, 0.7)', cursor: 'pointer',
  width: '32px', height: '32px', borderRadius: '8px',
  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
};

export const FileLockerModal: React.FC<FileLockerModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [files, setFiles] = useState<LockerFileMeta[]>([]);
  const [trashFiles, setTrashFiles] = useState<LockerFileMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [viewTab, setViewTab] = useState<'files' | 'trash'>('files');
  const [search, setSearch] = useState('');
  const [viewerImageId, setViewerImageId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    const setup = async () => {
      unlisten = await listen<number>('locker-progress', (event) => {
        setProgress(event.payload);
      });
    };
    setup();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const loadFiles = async () => {
    try {
      const list: LockerFileMeta[] = await invoke('get_locker_files');
      setFiles(list.sort((a, b) => b.locked_at - a.locked_at));
      
      const trashList: LockerFileMeta[] = await invoke('get_locker_trash_files');
      setTrashFiles(trashList.sort((a, b) => b.locked_at - a.locked_at));
    } catch (err: any) {
      showToast(`Erreur chargement: ${err}`, 'error');
    }
  };

  const loadPreview = useCallback(async (id: string) => {
    if (previews[id]) return;
    try {
      const dataUrl: string = await invoke('preview_locker_file', { id });
      setPreviews(prev => ({ ...prev, [id]: dataUrl }));
    } catch (err: any) {
      console.error('Preview error:', err);
    }
  }, [previews]);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
      setPreviews({});
    }
  }, [isOpen]);

  // Auto-load previews for images in grid mode
  useEffect(() => {
    if (viewMode === 'grid') {
      files.forEach(f => {
        const cat = getFileCategory(f.mime_type, f.original_name);
        if (cat === 'image' && !previews[f.id]) {
          loadPreview(f.id);
        }
      });
    }
  }, [files, viewMode]);

  if (!isOpen) return null;

  const handleAddFile = async () => {
    try {
      const selectedPath = await open({ multiple: false, title: 'Sélectionner un fichier à chiffrer' });
      if (!selectedPath) return;
      setLoading(true);
      setProgress(0);
      await invoke('lock_file', { srcPath: selectedPath as string });
      showToast('✅ Fichier chiffré et stocké dans le locker', 'success');
      await loadFiles();
    } catch (err: any) {
      showToast(`Erreur: ${err}`, 'error');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleDownload = async (file: LockerFileMeta) => {
    try {
      const savePath = await save({ defaultPath: file.original_name, title: 'Déchiffrer et enregistrer sous...' });
      if (!savePath) return;
      setLoading(true);
      setProgress(0);
      await invoke('unlock_file', { id: file.id, destPath: savePath as string });
      showToast('🔓 Fichier déchiffré avec succès', 'success');
    } catch (err: any) {
      showToast(`Erreur: ${err}`, 'error');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(null);
    try {
      setLoading(true);
      await invoke(viewTab === 'trash' ? 'purge_locker_file' : 'delete_locker_file', { id });
      showToast(viewTab === 'trash' ? 'Fichier définitivement supprimé' : 'Fichier placé dans la corbeille', 'info');
      await loadFiles();
    } catch (err: any) {
      showToast(`Erreur: ${err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      setLoading(true);
      await invoke('restore_locker_file', { id });
      showToast('Fichier restauré', 'success');
      await loadFiles();
    } catch (err: any) {
      showToast(`Erreur: ${err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      setLoading(true);
      await invoke('empty_locker_trash');
      showToast('Corbeille vidée', 'info');
      await loadFiles();
    } catch (err: any) {
      showToast(`Erreur: ${err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Drag & Drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const paths = Array.from(e.dataTransfer.files).map((f: any) => f.path || f.name);
    if (paths.length === 0) return;
    setLoading(true);
    setProgress(0);
    let success = 0;
    for (const p of paths) {
      try {
        await invoke('lock_file', { srcPath: p });
        success++;
      } catch {}
    }
    if (success > 0) {
      showToast(`✅ ${success} fichier(s) chiffré(s)`, 'success');
      await loadFiles();
    }
    setLoading(false);
    setProgress(null);
  };

  // Stats
  const totalSize = files.reduce((acc, f) => acc + f.size_bytes, 0);
  const typeCounts: Record<string, number> = {};
  files.forEach(f => {
    const cat = getFileCategory(f.mime_type, f.original_name);
    typeCounts[cat] = (typeCounts[cat] || 0) + 1;
  });

  const currentList = viewTab === 'files' ? files : trashFiles;
  const filtered = currentList.filter(f =>
    f.original_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Image Viewer Overlay */}
      {viewerImageId && (
        <ImageViewer
          files={files}
          startId={viewerImageId}
          previews={previews}
          onClose={() => setViewerImageId(null)}
          onLoadPreview={loadPreview}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,5,8,0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            background: 'rgba(12, 9, 22, 0.97)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '20px', padding: '28px', maxWidth: '380px', width: '90%',
            boxShadow: '0 0 50px rgba(0,0,0,0.9)',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>🗑️ Supprimer définitivement ?</h3>
            <p style={{ fontSize: '13px', color: 'rgba(203,213,225,0.7)', marginBottom: '20px', lineHeight: 1.6 }}>
              Ce fichier sera supprimé de façon permanente du locker chiffré. Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '9px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: '9px 18px', borderRadius: '10px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(5, 5, 8, 0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
        onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      >
        <div
          ref={dropRef}
          className="glass-panel animate-fade-in"
          style={{
            position: 'relative',
            width: '100%', maxWidth: '820px',
            height: '88vh',
            display: 'flex', flexDirection: 'column',
            background: dragOver ? 'rgba(139, 92, 246, 0.12)' : 'rgba(12, 9, 22, 0.96)',
            backdropFilter: 'blur(32px)',
            borderRadius: '24px',
            border: dragOver ? '2px dashed #8b5cf6' : '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 0 80px rgba(0, 0, 0, 0.95), 0 0 40px rgba(139, 92, 246, 0.15)',
            transition: 'border-color 0.2s, background 0.2s',
          }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {/* Loading Overlay */}
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 150,
              background: 'rgba(5, 5, 8, 0.92)',
              backdropFilter: 'blur(12px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              borderRadius: '24px',
            }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
                padding: '40px', maxWidth: '440px', textAlign: 'center',
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  border: '3px solid rgba(139, 92, 246, 0.15)',
                  borderTopColor: '#c084fc',
                  animation: 'spin 1s linear infinite',
                }} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>
                  Sécurisation en cours...
                </h3>
                <p style={{ fontSize: '13px', color: 'rgba(203, 213, 225, 0.65)', lineHeight: 1.6, margin: 0 }}>
                  Chiffrement / Déchiffrement de vos fichiers avec Argon2id & AES-256-GCM. Veuillez patienter, cela peut prendre du temps selon la taille des fichiers.
                </p>
                {/* Progress bar */}
                <div style={{
                  width: '240px', height: '5px', background: 'rgba(255,255,255,0.06)',
                  borderRadius: '10px', overflow: 'hidden', marginTop: '10px',
                  position: 'relative',
                }}>
                  {progress !== null ? (
                    <div style={{
                      height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                      borderRadius: '10px',
                      transition: 'width 0.1s ease-out',
                    }} />
                  ) : (
                    <div style={{
                      height: '100%', width: '40%', background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                      borderRadius: '10px',
                      position: 'absolute',
                      animation: 'progressIndeterminate 1.5s infinite ease-in-out',
                    }} />
                  )}
                </div>
                {progress !== null && (
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#c084fc', marginTop: '-4px' }}>
                    {progress}%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 26px 16px 26px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(124,58,237,0.15))', borderRadius: '14px', color: '#c084fc', border: '1px solid rgba(139,92,246,0.3)' }}>
                <Lock size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', margin: 0 }}>File Locker</h2>
                <p style={{ fontSize: '12px', color: 'rgba(203, 213, 225, 0.5)', margin: '2px 0 0 0' }}>
                  🔒 Chiffrement AES-256 · {files.length} fichier{files.length !== 1 ? 's' : ''} · {formatSize(totalSize)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose} disabled={loading}
              style={{ ...iconBtnStyle, width: '34px', height: '34px' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(226, 232, 240, 0.7)'; }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Stats bar */}
          {files.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', padding: '0 26px 14px 26px', flexShrink: 0, flexWrap: 'wrap' }}>
              {Object.entries(typeCounts).map(([cat, count]) => {
                const { color, bg } = getCategoryColor(cat);
                return (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', background: bg, border: `1px solid ${color}40` }}>
                    <CategoryIcon cat={cat} size={13} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color }}>{count} {cat}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: '10px', padding: '0 26px 16px 26px', alignItems: 'center', flexShrink: 0 }}>
            {/* Search */}
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} color="rgba(203,213,225,0.4)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un fichier..."
                className="input-field"
                style={{ paddingLeft: '36px', height: '38px', fontSize: '13px', background: 'rgba(8,6,16,0.8)', border: '1px solid rgba(139,92,246,0.25)' } as any}
              />
            </div>
            {/* Main View Toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <button onClick={() => setViewTab('files')} style={{
                  padding: '8px 12px', border: 'none', cursor: 'pointer',
                  background: viewTab === 'files' ? 'rgba(139,92,246,0.3)' : 'transparent',
                  color: viewTab === 'files' ? '#fff' : 'rgba(203,213,225,0.5)',
                  display: 'flex', transition: 'all 0.2s', fontSize: '13px', fontWeight: 600, alignItems: 'center', gap: '6px'
              }}>
                <HardDrive size={14} />
              </button>
              <button onClick={() => setViewTab('trash')} style={{
                  padding: '8px 12px', border: 'none', cursor: 'pointer',
                  background: viewTab === 'trash' ? 'rgba(239,68,68,0.2)' : 'transparent',
                  color: viewTab === 'trash' ? '#ef4444' : 'rgba(203,213,225,0.5)',
                  display: 'flex', transition: 'all 0.2s', fontSize: '13px', fontWeight: 600, alignItems: 'center', gap: '6px'
              }}>
                <Trash2 size={14} />
              </button>
            </div>

            {/* View layout toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              {(['grid', 'list'] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  padding: '8px 12px', border: 'none', cursor: 'pointer',
                  background: viewMode === mode ? 'rgba(139,92,246,0.3)' : 'transparent',
                  color: viewMode === mode ? '#c084fc' : 'rgba(203,213,225,0.5)',
                  display: 'flex', transition: 'all 0.2s',
                }}>
                  {mode === 'grid' ? <Grid size={15} /> : <List size={15} />}
                </button>
              ))}
            </div>
            {/* Add button / Empty Trash */}
            {viewTab === 'trash' ? (
              <button
                onClick={handleEmptyTrash} disabled={loading || trashFiles.length === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '8px 16px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: '13px', fontWeight: 700,
                  cursor: (loading || trashFiles.length === 0) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 0 20px rgba(239,68,68,0.4)',
                  transition: 'all 0.2s',
                }}
              >
                <Trash2 size={15} /> Vider
              </button>
            ) : (
              <button
                onClick={handleAddFile} disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '8px 16px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: '13px', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 0 20px rgba(124,58,237,0.4)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 0 30px rgba(168,85,247,0.6)'; }}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(124,58,237,0.4)'}
              >
                {loading ? <ShieldCheck size={15} className="pulse-glow" /> : <Plus size={15} />}
                Ajouter
              </button>
            )}
          </div>

          {/* Drag overlay hint */}
          {dragOver && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', zIndex: 10,
              pointerEvents: 'none', borderRadius: '24px',
            }}>
              <Lock size={52} color="#8b5cf6" style={{ marginBottom: '16px' }} />
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#c084fc' }}>Déposez pour chiffrer</p>
              <p style={{ fontSize: '13px', color: 'rgba(192,132,252,0.7)' }}>Vos fichiers seront chiffrés avec AES-256</p>
            </div>
          )}

          {/* Files area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 26px 26px 26px' }} className="no-scrollbar">
            {filtered.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(203,213,225,0.35)', gap: '12px' }}>
                <HardDrive size={52} style={{ opacity: 0.2 }} />
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(203,213,225,0.6)', margin: 0 }}>
                  {search ? 'Aucun fichier trouvé' : 'Votre coffre est vide'}
                </p>
                <p style={{ fontSize: '12.5px', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
                  {search ? 'Essayez un autre terme de recherche.' : 'Cliquez sur « Ajouter » ou glissez des fichiers ici\npour les chiffrer instantanément.'}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
                {filtered.map(f => {
                  const cat = getFileCategory(f.mime_type, f.original_name);
                  const { color, bg } = getCategoryColor(cat);
                  const isImage = cat === 'image';
                  const preview = previews[f.id];
                  return (
                    <div
                      key={f.id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid rgba(255,255,255,0.07)`,
                        borderRadius: '18px', overflow: 'hidden',
                        display: 'flex', flexDirection: 'column',
                        cursor: isImage ? 'zoom-in' : 'default',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${color}50`; e.currentTarget.style.boxShadow = `0 0 20px ${color}15`; }}
                      onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      {/* Thumbnail / Icon */}
                      <div
                        style={{ height: '110px', background: isImage ? '#000' : bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}
                        onClick={() => isImage && setViewerImageId(f.id)}
                      >
                        {isImage && preview ? (
                          <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <CategoryIcon cat={cat} size={36} />
                        )}
                        {isImage && (
                          <div style={{
                            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
                          >
                            <Eye size={22} color="rgba(255,255,255,0)" style={{ transition: 'color 0.2s' }} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ padding: '10px 12px 8px 12px', flex: 1 }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff', margin: '0 0 3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.original_name}
                        </p>
                        <p style={{ fontSize: '10.5px', color: 'rgba(203,213,225,0.45)', margin: 0 }}>
                          {formatSize(f.size_bytes)} · {formatDate(f.locked_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {viewTab === 'trash' ? (
                          <>
                            <button
                              onClick={() => handleRestore(f.id)} disabled={loading}
                              style={{ flex: 1, padding: '9px', background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              title="Restaurer"
                            >
                              <RotateCcw size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(f.id)} disabled={loading}
                              style={{ flex: 1, padding: '9px', background: 'none', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.05)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              title="Supprimer définitivement"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleDownload(f)} disabled={loading}
                              style={{ flex: 1, padding: '9px', background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              title="Déchiffrer et exporter"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(f.id)} disabled={loading}
                              style={{ flex: 1, padding: '9px', background: 'none', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.05)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              title="Mettre à la corbeille"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // List mode
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filtered.map(f => {
                  const cat = getFileCategory(f.mime_type, f.original_name);
                  const { color, bg } = getCategoryColor(cat);
                  const isImage = cat === 'image';
                  return (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '12px 16px', borderRadius: '16px',
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.06)'; e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                    >
                      {/* Icon or mini preview */}
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: isImage && previews[f.id] ? '#000' : bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', cursor: isImage ? 'zoom-in' : 'default' }} onClick={() => isImage && setViewerImageId(f.id)}>
                        {isImage && previews[f.id] ? <img src={previews[f.id]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <CategoryIcon cat={cat} size={20} />}
                      </div>

                      {/* Name */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13.5px', fontWeight: 600, color: '#fff', margin: '0 0 3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.original_name}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: bg, color, fontWeight: 600 }}>{cat}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(203,213,225,0.45)' }}>{formatSize(f.size_bytes)}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(203,213,225,0.35)' }}>{formatDate(f.locked_at)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        {viewTab === 'trash' ? (
                          <>
                            <button onClick={() => handleRestore(f.id)} disabled={loading} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', cursor: 'pointer', padding: '8px', borderRadius: '10px', display: 'flex' }} title="Restaurer">
                              <RotateCcw size={15} />
                            </button>
                            <button onClick={() => setDeleteConfirm(f.id)} disabled={loading} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '10px', display: 'flex' }} title="Supprimer définitivement">
                              <Trash2 size={15} />
                            </button>
                          </>
                        ) : (
                          <>
                            {isImage && (
                              <button onClick={() => setViewerImageId(f.id)} style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', color: '#8b5cf6', cursor: 'pointer', padding: '8px', borderRadius: '10px', display: 'flex' }} title="Prévisualiser">
                                <Eye size={15} />
                              </button>
                            )}
                            <button onClick={() => handleDownload(f)} disabled={loading} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', cursor: 'pointer', padding: '8px', borderRadius: '10px', display: 'flex' }} title="Exporter">
                              <Download size={15} />
                            </button>
                            <button onClick={() => setDeleteConfirm(f.id)} disabled={loading} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '10px', display: 'flex' }} title="Mettre à la corbeille">
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
