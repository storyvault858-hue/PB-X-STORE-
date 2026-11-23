import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import type { ConfirmDialogState } from '../types';

interface ConfirmModalProps {
  dialog: ConfirmDialogState | null;
  onClose: () => void;
}

export function ConfirmModal({ dialog, onClose }: ConfirmModalProps) {
  useEffect(() => {
    if (!dialog?.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog?.open, onClose]);

  return (
    <AnimatePresence>
      {dialog?.open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 surface-3d-lg rounded-3xl p-6 w-full max-w-sm"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    dialog.danger !== false
                      ? 'bg-red-500/15 text-red-500'
                      : 'bg-[var(--accent-soft)] text-[var(--accent)]'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3
                  id="confirm-modal-title"
                  className="text-base font-bold text-[var(--text-primary)]"
                >
                  {dialog.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-inset)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
              {dialog.message}
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-3d-secondary flex-1 min-h-[44px] rounded-xl text-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = dialog.onConfirm;
                  onClose();
                  void action();
                }}
                className={`${
                  dialog.danger !== false ? 'btn-3d-danger' : 'btn-3d-primary'
                } flex-1 min-h-[44px] rounded-xl text-sm font-bold cursor-pointer`}
              >
                {dialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
