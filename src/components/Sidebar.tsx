import React, { useState, useEffect } from 'react';
import { ShieldCheck, Key, CreditCard, FileText, Star, Lock, Shield, HardDriveDownload, Timer, Trash2, Settings, ShieldCheck as ShieldIcon, RefreshCw, User } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';


import { VaultGroup } from '../types';

interface SidebarProps {
  currentCategory: string;
  onSelectCategory: (category: string) => void;
  entryCounts: Record<string, number>;
  onLock: () => void;
  onOpenSettings: () => void;
  onOpenImportExport: () => void;
  onOpenTrash: () => void;
  onOpenAudit: () => void;
  onOpenUpdate?: () => void;
  groups?: VaultGroup[];
  onOpenLocker?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentCategory,
  onSelectCategory,
  entryCounts,
  onLock,
  onOpenSettings,
  onOpenImportExport,
  onOpenTrash,
  onOpenAudit,
  onOpenUpdate,
  groups = [],
  onOpenLocker,
}) => {
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    invoke<string>('get_username').then(setUsername).catch(() => setUsername(''));
  }, []);
  const menuItems = [
    { id: 'all',       label: 'Toutes les entrées', icon: Key,         count: entryCounts['all']       || 0 },
    { id: 'favorites', label: 'Favoris',             icon: Star,        count: entryCounts['favorites'] || 0 },
    { id: 'Password',  label: 'Mots de passe',       icon: Key,         count: entryCounts['Password']  || 0 },
    { id: 'Card',      label: 'Cartes bancaires',    icon: CreditCard,  count: entryCounts['Card']      || 0 },
    { id: 'Note',      label: 'Notes sécurisées',    icon: FileText,    count: entryCounts['Note']      || 0 },
  ];

  return (
    <aside style={{
      width: '260px',
      height: '100%',
      maxHeight: '100vh',
      background: 'rgba(9, 7, 16, 0.85)',
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      borderRight: '1px solid rgba(139, 92, 246, 0.15)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 14px',
      flexShrink: 0,
      boxSizing: 'border-box',
    }}>

      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 4px 18px 4px', flexShrink: 0 }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(124, 58, 237, 0.15))',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)',
          flexShrink: 0,
        }}>
          <ShieldCheck size={24} color="#8b5cf6" />
        </div>
        <div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 800,
            letterSpacing: '-0.3px',
            lineHeight: 1.1,
            color: '#c084fc',
            textShadow: '0 0 18px rgba(192, 132, 252, 0.8), 0 0 40px rgba(168, 85, 247, 0.5)',
          }}>
            2Secure
          </h2>
          {username && (
            <span style={{
              fontSize: '11px', color: 'rgba(203, 213, 225, 0.5)',
              display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px',
            }}>
              <User size={10} color="rgba(139,92,246,0.7)" />
              {username}
            </span>
          )}
        </div>
      </div>

      {/* Navigation (scrollable if screen height is small) */}
      <nav style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flex: 1,
        overflowY: 'auto',
        marginBottom: '14px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }} className="no-scrollbar">
        <div style={{
          fontSize: '11px', fontWeight: 700, color: 'rgba(203, 213, 225, 0.4)',
          textTransform: 'uppercase', letterSpacing: '0.8px',
          padding: '0 10px 10px 10px',
        }}>
          COFFRE-FORT
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentCategory === item.id;
          return (
            <button
              key={item.id}
              data-dropzone={item.id === 'all' ? 'ungrouped' : undefined}
              onClick={() => onSelectCategory(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '14px',
                border: isActive ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid transparent',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.3) 0%, rgba(30, 16, 42, 0.5) 100%)'
                  : 'transparent',
                color: isActive ? '#ffffff' : 'rgba(203, 213, 225, 0.65)',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.3s ease-in-out',
                textAlign: 'left',
                boxShadow: isActive ? '0 0 20px rgba(139, 92, 246, 0.2)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)';
                  e.currentTarget.style.color = '#ffffff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(203, 213, 225, 0.65)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon
                  size={18}
                  color={isActive ? '#8b5cf6' : 'rgba(203, 213, 225, 0.45)'}
                />
                <span style={{ fontSize: '13.5px' }}>{item.label}</span>
              </div>
              {item.count > 0 && (
                <span style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: isActive ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                  color: isActive ? '#ffffff' : 'rgba(203, 213, 225, 0.5)',
                  fontWeight: 600,
                }}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Custom Groups */}
        {groups && groups.length > 0 && (
          <>
            <div style={{
              fontSize: '11px', fontWeight: 700, color: 'rgba(203, 213, 225, 0.4)',
              textTransform: 'uppercase', letterSpacing: '0.8px',
              padding: '16px 10px 10px 10px',
            }}>
              GROUPES
            </div>
            {groups.map((group) => {
              const isActive = currentCategory === group.id;
              return (
                <button
                  key={group.id}
                  data-dropzone={group.id}
                  onClick={() => onSelectCategory(group.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '14px',
                    border: isActive ? `1px solid ${group.color}60` : '1px solid transparent',
                    background: isActive
                      ? `linear-gradient(135deg, ${group.color}40 0%, rgba(30, 16, 42, 0.5) 100%)`
                      : 'transparent',
                    color: isActive ? '#ffffff' : 'rgba(203, 213, 225, 0.65)',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease-in-out',
                    textAlign: 'left',
                    boxShadow: isActive ? `0 0 20px ${group.color}30` : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(203, 213, 225, 0.65)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>{group.icon}</span>
                    <span style={{ fontSize: '13.5px' }}>{group.name}</span>
                  </div>
                </button>
              );
            })}
          </>
        )}

        {/* Locker */}
        <div style={{
          fontSize: '11px', fontWeight: 700, color: 'rgba(203, 213, 225, 0.4)',
          textTransform: 'uppercase', letterSpacing: '0.8px',
          padding: '16px 10px 10px 10px',
        }}>
          OUTILS
        </div>
        <button
          onClick={onOpenLocker}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '14px',
            border: '1px solid transparent',
            background: 'transparent',
            color: 'rgba(203, 213, 225, 0.65)',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.3s ease-in-out',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(203, 213, 225, 0.65)';
          }}
        >
          <Lock size={18} color="rgba(203, 213, 225, 0.45)" />
          <span style={{ fontSize: '13.5px' }}>File Locker chiffré</span>
        </button>
      </nav>

      {/* Footer Section (Always pinned to bottom) */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
        {/* Security Status Card */}
        <div style={{
          background: 'rgba(13, 10, 24, 0.5)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          borderRadius: '14px',
          padding: '8px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={13} color="#8b5cf6" />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>Argon2id · AES-256</span>
            </div>
            <span style={{ fontSize: '10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
              <Timer size={10} /> 5m
            </span>
          </div>
        </div>

        {/* Audit & Trash grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button
            onClick={onOpenAudit}
            className="secondary-btn"
            style={{ padding: '8px 6px', fontSize: '11.5px', justifyContent: 'center' }}
            title="Audit de Sécurité"
          >
            <ShieldIcon size={13} color="#a855f7" />
            <span>Audit</span>
          </button>
          <button
            onClick={onOpenTrash}
            className="secondary-btn"
            style={{ padding: '8px 6px', fontSize: '11.5px', justifyContent: 'center' }}
            title="Corbeille de restauration"
          >
            <Trash2 size={13} color="#ef4444" />
            <span>Corbeille</span>
          </button>
        </div>

        {/* Import / Export Button */}
        <button
          onClick={onOpenImportExport}
          className="secondary-btn"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '8px',
            fontSize: '12px',
          }}
        >
          <HardDriveDownload size={13} />
          <span>Import / Export</span>
        </button>

        {/* Lock Button */}
        <button
          onClick={onLock}
          className="secondary-btn"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '9px',
            fontSize: '12.5px',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            background: 'rgba(239, 68, 68, 0.08)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.color = '#ff6b6b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
            e.currentTarget.style.color = '#ef4444';
          }}
        >
          <Lock size={13} />
          <span>Verrouiller</span>
        </button>

        {/* Settings & Update buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button
            onClick={onOpenSettings}
            className="secondary-btn"
            title="Paramètres de sécurité"
            style={{ padding: '8px 6px', fontSize: '11.5px', justifyContent: 'center' }}
          >
            <Settings size={13} color="#c084fc" />
            <span>Paramètres</span>
          </button>
          <button
            onClick={onOpenUpdate}
            className="secondary-btn"
            title="Rechercher des mises à jour"
            style={{ padding: '8px 6px', fontSize: '11.5px', justifyContent: 'center' }}
          >
            <RefreshCw size={13} color="#a855f7" />
            <span>MàJ</span>
          </button>
        </div>
      </div>
    </aside>
  );
};



