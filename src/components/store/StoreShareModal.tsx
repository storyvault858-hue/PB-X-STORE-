import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Copy, Download, ExternalLink, Share2, X } from 'lucide-react';

interface StoreShareModalProps {
  open: boolean;
  appName: string;
  publicUrl: string;
  onClose: () => void;
  onCopyLink: (url: string) => void;
}

export function StoreShareModal({
  open,
  appName,
  publicUrl,
  onClose,
  onCopyLink,
}: StoreShareModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const text = `Download ${appName} from PB X Store:`;
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(publicUrl);

  const channels = [
    {
      name: 'WhatsApp',
      href: `https://wa.me/?text=${encodedText}%0A${encodedUrl}`,
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.14)',
      short: 'WA',
    },
    {
      name: 'Telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      color: '#0ea5e9',
      bg: 'rgba(14, 165, 233, 0.14)',
      short: 'TG',
    },
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.14)',
      short: 'FB',
    },
    {
      name: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      color: 'var(--text-primary)',
      bg: 'var(--surface-inset)',
      short: 'X',
    },
  ];

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${appName} — PB X Store`,
          text,
          url: publicUrl,
        });
        onClose();
        return;
      } catch {
        // User cancelled or unsupported — keep modal open
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          className="fixed inset-0 z-[210] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="surface-3d-lg w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h3
                  id="share-modal-title"
                  className="text-base font-bold text-[var(--text-primary)] truncate"
                >
                  Share {appName}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Send direct PB X Store install link
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close share dialog"
                className="btn-3d-secondary w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2.5 mb-4">
              {channels.map((ch) => (
                <a
                  key={ch.name}
                  href={ch.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all"
                  style={{ background: 'var(--surface-inset)' }}
                >
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs"
                    style={{ background: ch.bg, color: ch.color }}
                  >
                    {ch.short}
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    {ch.name}
                  </span>
                </a>
              ))}
            </div>

            <div
              className="rounded-xl px-3 py-2.5 mb-3.5 border border-[var(--border-subtle)] flex items-center justify-between gap-2"
              style={{
                background: 'var(--surface-inset)',
                boxShadow: 'var(--shadow-inset)',
              }}
            >
              <span className="font-mono text-[11px] text-[var(--text-secondary)] truncate">
                {publicUrl.replace(/^https?:\/\//, '')}
              </span>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open link"
                className="text-[var(--accent)] shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onCopyLink(publicUrl);
                  onClose();
                }}
                className="btn-3d-primary flex-1 min-h-[42px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </button>
              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="btn-3d-secondary min-h-[42px] px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>More</span>
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface StoreQRPreviewModalProps {
  open: boolean;
  appName: string;
  qrDataUrl: string;
  onClose: () => void;
  onDownload: () => void;
  onOpenShareSheet: () => void;
}

export function StoreQRPreviewModal({
  open,
  appName,
  qrDataUrl,
  onClose,
  onDownload,
  onOpenShareSheet,
}: StoreQRPreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && qrDataUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="surface-3d-lg w-full max-w-xs rounded-3xl p-5 text-center"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                {appName} QR Code
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close QR preview"
                className="btn-3d-secondary w-8 h-8 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-3 rounded-2xl inline-block shadow-md mb-4">
              <img
                src={qrDataUrl}
                alt={`${appName} QR Code`}
                className="w-56 h-56 rounded-xl object-contain block"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onDownload}
                className="btn-3d-primary min-h-[40px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save PNG</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenShareSheet();
                }}
                className="btn-3d-secondary min-h-[40px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Link</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
