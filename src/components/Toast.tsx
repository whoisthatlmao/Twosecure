import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // ms, default 4000
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────
interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

// ─────────────────────────────────────────────
// Design tokens per type
// ─────────────────────────────────────────────
const TOAST_STYLES: Record<ToastType, {
  icon: React.ElementType;
  iconColor: string;
  borderColor: string;
  glowColor: string;
  bg: string;
  labelColor: string;
  label: string;
}> = {
  success: {
    icon: CheckCircle2,
    iconColor: '#10b981',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    glowColor: 'rgba(16, 185, 129, 0.2)',
    bg: 'rgba(10, 20, 16, 0.95)',
    labelColor: '#34d399',
    label: 'Succès',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: '#f59e0b',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    glowColor: 'rgba(245, 158, 11, 0.15)',
    bg: 'rgba(20, 16, 8, 0.95)',
    labelColor: '#fbbf24',
    label: 'Attention',
  },
  error: {
    icon: XCircle,
    iconColor: '#ef4444',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    glowColor: 'rgba(239, 68, 68, 0.15)',
    bg: 'rgba(20, 8, 8, 0.95)',
    labelColor: '#f87171',
    label: 'Erreur',
  },
  info: {
    icon: Info,
    iconColor: '#8b5cf6',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    glowColor: 'rgba(139, 92, 246, 0.2)',
    bg: 'rgba(12, 8, 20, 0.95)',
    labelColor: '#c084fc',
    label: 'Info',
  },
};

// ─────────────────────────────────────────────
// Single Toast Card
// ─────────────────────────────────────────────
interface ToastCardProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss }) => {
  const style = TOAST_STYLES[toast.type];
  const Icon = style.icon;
  const [exiting, setExiting] = React.useState(false);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 280);
  };

  React.useEffect(() => {
    const dur = toast.duration ?? 4000;
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 280);
    }, dur);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '16px',
        background: style.bg,
        border: `1px solid ${style.borderColor}`,
        boxShadow: `0 0 24px ${style.glowColor}, 0 8px 32px rgba(0,0,0,0.7)`,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        minWidth: '300px',
        maxWidth: '400px',
        animation: exiting
          ? 'toastSlideOut 0.28s ease-in forwards'
          : 'toastSlideIn 0.32s cubic-bezier(0.34,1.56,0.64,1) forwards',
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* Icon */}
      <div style={{
        flexShrink: 0,
        width: '34px',
        height: '34px',
        borderRadius: '10px',
        background: `rgba(255,255,255,0.04)`,
        border: `1px solid ${style.borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon size={18} color={style.iconColor} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, paddingTop: '1px' }}>
        <span style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.7px',
          color: style.labelColor,
          marginBottom: '3px',
        }}>
          {style.label}
        </span>
        <span style={{
          display: 'block',
          fontSize: '13.5px',
          color: 'rgba(226, 232, 240, 0.92)',
          lineHeight: 1.4,
          fontWeight: 500,
        }}>
          {toast.message}
        </span>
      </div>

      {/* Close */}
      <button
        onClick={dismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(203,213,225,0.4)',
          padding: '2px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(203,213,225,0.4)'; }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────
// Toast Container (renders toasts)
// ─────────────────────────────────────────────
interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'all' }}>
          <ToastCard toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// Provider (wrap at App root)
// ─────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};
