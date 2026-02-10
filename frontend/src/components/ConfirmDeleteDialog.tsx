'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
}

export default function ConfirmDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Удалить',
}: ConfirmDeleteDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при удалении');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[50%] translate-y-[-50%] max-w-md mx-auto bg-app-surface rounded-2xl shadow-ios-lg border border-app-border z-50 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-app-danger/10 rounded-xl shrink-0">
                  <AlertTriangle size={24} className="text-app-danger" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-app-text mb-1">{title}</h2>
                  <p className="text-sm text-app-textMuted">{description}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-app-surfaceMuted rounded-lg transition-colors shrink-0"
                >
                  <X size={20} className="text-app-textMuted" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-app-danger/10 border border-app-danger/20 rounded-xl text-app-danger text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose} className="flex-1">
                  Отмена
                </Button>
                <Button
                  variant="danger"
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    confirmText
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
