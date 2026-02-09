'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Check, X, AlertTriangle, ArrowRightLeft, Plus } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  text: string;
  subtext?: string;
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const TOAST_ICONS = {
  success: <Check size={16} className="text-white" />,
  error: <AlertTriangle size={16} className="text-white" />,
  info: <ArrowRightLeft size={16} className="text-white" />,
};

const TOAST_COLORS = {
  success: 'bg-app-success',
  error: 'bg-app-danger',
  info: 'bg-app-accent',
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-ios-lg bg-app-surface border border-app-border transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${TOAST_COLORS[toast.type]}`}>
        {TOAST_ICONS[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-app-text">{toast.text}</p>
        {toast.subtext && (
          <p className="text-xs text-app-textMuted mt-0.5">{toast.subtext}</p>
        )}
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="w-6 h-6 rounded-full flex items-center justify-center text-app-textMuted hover:bg-app-surfaceMuted transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// Hook для toast
let toastCounter = 0;
let globalAddToast: ((toast: Omit<ToastMessage, 'id'>) => void) | null = null;

export function showToast(type: ToastType, text: string, subtext?: string) {
  globalAddToast?.({ type, text, subtext });
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register global handler
  useEffect(() => {
    globalAddToast = addToast;
    return () => {
      globalAddToast = null;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={dismissToast} />
        </div>
      ))}
    </div>
  );
}
