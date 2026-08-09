import React from 'react';
import { Search, Plus, KeyRound } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddClick: () => void;
  onOpenGenerator: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onAddClick,
  onOpenGenerator,
}) => {
  return (
    <header style={{
      height: '76px',
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '20px',
      background: 'transparent',
      flexShrink: 0,
    }}>
      {/* Search Input - Adjusted responsive size */}
      <div style={{ position: 'relative', width: '280px', flexShrink: 1 }}>
        <Search
          size={16}
          color="rgba(168, 85, 247, 0.7)"
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
        />
        <input
          type="text"
          className="input-field"
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: '100%',
            paddingLeft: '38px',
            paddingRight: '16px',
            height: '40px',
            borderRadius: '9999px',
            background: 'rgba(13, 10, 22, 0.85)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            color: '#ffffff',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Quick Action Buttons - Explicit dark & violet glass design */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onOpenGenerator}
          style={{
            height: '44px',
            padding: '0 22px',
            fontSize: '13.5px',
            fontWeight: 600,
            color: '#ffffff',
            background: 'rgba(168, 85, 247, 0.18)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '9999px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 15px rgba(168, 85, 247, 0.15)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(168, 85, 247, 0.3)';
            e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.7)';
            e.currentTarget.style.boxShadow = '0 0 25px rgba(168, 85, 247, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(168, 85, 247, 0.18)';
            e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(168, 85, 247, 0.15)';
          }}
        >
          <KeyRound size={16} color="#c084fc" />
          <span>Générateur</span>
        </button>

        <button
          onClick={onAddClick}
          style={{
            height: '44px',
            padding: '0 24px',
            fontSize: '13.5px',
            fontWeight: 700,
            color: '#ffffff',
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '9999px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 25px rgba(124, 58, 237, 0.45)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 0 35px rgba(168, 85, 247, 0.65)';
            e.currentTarget.style.background = 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 0 25px rgba(124, 58, 237, 0.45)';
            e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)';
          }}
        >
          <Plus size={18} />
          <span>Nouvelle entrée</span>
        </button>
      </div>
    </header>
  );
};
