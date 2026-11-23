import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import QRCode from 'qrcode';
import { Check, Copy, Download, ExternalLink, X } from 'lucide-react';
import type { StoreApp } from '../types';
import { getAppStoreUrl } from '../lib/firebase';
import { AppIcon } from './AppIcon';

interface QRModalProps {
  app: StoreApp | null;
  onClose: () => void;
  onCopyLink: (url: string) => void;
}

export function QRModal({ app, onClose, onCopyLink }: QRModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const shareUrl = app ? getAppStoreUrl(app) : '';

  useEffect(() => {
    if (!app || !shareUrl) {
      setQrDataUrl('');
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(shareUrl, {
      width: 440,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#09090b',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [app, shareUrl]);

  useEffect(() => {
    if (!app) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [app, onClose]);

  const handleCopy = () => {
    if (!shareUrl) return;
    onCopyLink(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl || !app) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${app.slug || 'pbx-app'}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {app && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 surface-3d-lg rounded-3xl p-6 w-full max-w-sm overflow-hidden"
          >
            {/* Soft ambient glow */}
            <div
              aria-hidden="true"
              className="absolute -top-20 left-1/2 -translate-x-1/2 w-52 h-36 rounded-full blur-3xl opacity-25 pointer-events-none"
              style={{ background: 'var(--accent)' }}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="min-w-0">
                  <h3
                    id="qr-modal-title"
                    className="text-lg font-bold text-[var(--text-primary)] truncate"
                  >
                    Scan QR Code
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {app.name} · v{app.version}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close QR modal"
                  className="btn-3d-secondary w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Crisp elevated QR plate */}
              <div className="flex justify-center mb-5">
                <div
                  className="relative bg-white p-3.5 rounded-2xl border border-slate-200"
                  style={{
                    boxShadow:
                      '0 14px 30px -8px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255,255,255,0.2)',
                  }}
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR code for ${app.name}`}
                      className="w-[216px] h-[216px] block rounded-lg"
                    />
                  ) : (
                    <div className="w-[216px] h-[216px] rounded-lg bg-slate-100 animate-pulse" />
                  )}

                  {/* Centered app logo */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white p-1.5 rounded-2xl shadow-md border border-slate-200">
                      <AppIcon src={app.iconUrl} name={app.name} size="sm" />
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] text-center mb-4">
                Scan with any camera to open the live PB X Store download page directly.
              </p>

              {/* Permanent Link Box */}
              <div
                className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 mb-4 border border-[var(--border-subtle)]"
                style={{
                  background: 'var(--surface-inset)',
                  boxShadow: 'var(--shadow-inset)',
                }}
              >
                <span className="font-mono text-xs text-[var(--text-secondary)] truncate select-all">
                  {shareUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn-3d-secondary px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Action Row */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  disabled={!qrDataUrl}
                  className="btn-3d-primary min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save QR PNG</span>
                </button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-3d-secondary min-h-[44px] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Page</span>
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
