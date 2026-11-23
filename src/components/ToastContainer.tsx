import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { ToastItem } from '../types';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[250] flex flex-col gap-2.5 pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const icon =
            toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : toast.type === 'error' ? (
              <XCircle className="w-4 h-4 text-red-500 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-[var(--accent)] shrink-0" />
            );

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto surface-3d-lg rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {icon}
                <span className="text-sm font-medium text-[var(--text-primary)] leading-snug">
                  {toast.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-inset)] transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
