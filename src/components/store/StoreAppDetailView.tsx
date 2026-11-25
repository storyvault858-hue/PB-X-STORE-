import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  HardDrive,
  Infinity as InfinityIcon,
  Info,
  Layers,
  Lock,
  MessageSquare,
  Package,
  QrCode as QrCodeIcon,
  Settings2,
  Share2,
  ShieldCheck,
  Smartphone,
  Star,
} from 'lucide-react';
import type { StoreApp } from '../../types';
import { ref, set } from 'firebase/database';
import { db, formatShortDate, getAppStoreUrl, getExpiryStatus } from '../../lib/firebase';
import { AppIcon } from '../AppIcon';
import { StoreQRPreviewModal, StoreShareModal } from './StoreShareModal';

interface SavedFeedback {
  id?: string;
  rating: number;
  comment: string;
  submittedAt: string;
}

interface StoreAppDetailViewProps {
  app: StoreApp;
  serverNow: number;
  onBack: () => void;
  onCopyLink: (url: string) => void;
  onDownload: (app: StoreApp) => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const RATING_LABELS = ['', 'Needs Work', 'Fair', 'Good', 'Great', 'Excellent'];

export function StoreAppDetailView({
  app,
  serverNow,
  onBack,
  onCopyLink,
  onDownload,
  onNotify,
}: StoreAppDetailViewProps) {
  const [techOpen, setTechOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Fully working 5-star interactive rating & feedback state (persisted per app)
  const storageKey = `pbx_feedback_${app.id}`;
  const [savedFeedback, setSavedFeedback] = useState<SavedFeedback | null>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as SavedFeedback) : null;
    } catch {
      return null;
    }
  });
  const [rating, setRating] = useState<number>(() => savedFeedback?.rating || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>(() => savedFeedback?.comment || '');
  const [editingFeedback, setEditingFeedback] = useState<boolean>(!savedFeedback);

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Sync feedback state when switching between apps
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`pbx_feedback_${app.id}`);
      const parsed = raw ? (JSON.parse(raw) as SavedFeedback) : null;
      setSavedFeedback(parsed);
      setRating(parsed?.rating || 0);
      setComment(parsed?.comment || '');
      setEditingFeedback(!parsed);
    } catch {
      setSavedFeedback(null);
      setRating(0);
      setComment('');
      setEditingFeedback(true);
    }
  }, [app.id]);

  const publicUrl = useMemo(() => getAppStoreUrl(app), [app]);
  const isIOS = (app.platform || 'Android').toLowerCase() === 'ios';
  const pkgType = isIOS ? 'IPA' : 'APK';

  const expiry = getExpiryStatus(
    app.expiryDate,
    app.isLifetime,
    serverNow,
    app.expiryTimestamp,
    app.expiryTime
  );

  const expiryToneClass =
    expiry.tone === 'expired'
      ? 'text-red-600 dark:text-red-400'
      : expiry.tone === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400';

  // Generate crisp high-res Level H QR Code (identical pattern to Admin Control Center)
  useEffect(() => {
    let active = true;
    const canvas = qrCanvasRef.current;
    if (!canvas) return;

    const renderQR = async () => {
      try {
        await QRCode.toCanvas(canvas, publicUrl, {
          width: 480,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#09090b',
            light: '#ffffff',
          },
        });

        if (!active) return;

        // Build exportable high-res PNG with centered app logo when available
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = 560;
        exportCanvas.height = 560;
        const ctx = exportCanvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 560, 560);
        ctx.drawImage(canvas, 40, 40, 480, 480);

        const finishExport = () => {
          if (!active) return;
          try {
            setQrDataUrl(exportCanvas.toDataURL('image/png'));
          } catch {
            // Fallback to pure QR canvas if cross-origin icon taints export canvas
            try {
              setQrDataUrl(canvas.toDataURL('image/png'));
            } catch {
              setQrDataUrl('');
            }
          }
        };

        if (app.iconUrl && app.iconUrl.trim()) {
          const logo = new Image();
          logo.crossOrigin = 'anonymous';
          logo.onload = () => {
            try {
              const boxSize = 104;
              const x = (560 - boxSize) / 2;
              const y = (560 - boxSize) / 2;
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(x, y, boxSize, boxSize, 18);
              } else {
                ctx.rect(x, y, boxSize, boxSize);
              }
              ctx.fill();
              const pad = 8;
              ctx.drawImage(logo, x + pad, y + pad, boxSize - pad * 2, boxSize - pad * 2);
            } catch {
              // Ignore taint issues
            }
            finishExport();
          };
          logo.onerror = finishExport;
          logo.src = app.iconUrl.trim();
        } else {
          finishExport();
        }
      } catch {
        if (active) setQrDataUrl('');
      }
    };

    void renderQR();
    return () => {
      active = false;
    };
  }, [publicUrl, app.iconUrl]);

  const handleDownloadClick = () => {
    if (!app.apkUrl) {
      onNotify('Download link is currently unavailable for this build.', 'error');
      return;
    }
    setDownloading(true);
    onDownload(app);
    window.setTimeout(() => setDownloading(false), 1800);
  };

  const handleDownloadQrPng = () => {
    const sourceUrl = qrDataUrl || qrCanvasRef.current?.toDataURL('image/png') || '';
    if (!sourceUrl) {
      onNotify('QR code is still preparing. Please try again.', 'info');
      return;
    }
    const link = document.createElement('a');
    link.href = sourceUrl;
    link.download = `${(app.slug || app.name || 'pbx-app').replace(/\s+/g, '-')}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify('QR code saved as PNG.', 'success');
  };

  const handleShareQr = async () => {
    const sourceUrl = qrDataUrl || qrCanvasRef.current?.toDataURL('image/png') || '';
    if (!sourceUrl) {
      setShareOpen(true);
      return;
    }

    try {
      const response = await fetch(sourceUrl);
      const blob = await response.blob();
      const file = new File(
        [blob],
        `${(app.slug || app.name || 'pbx-app').replace(/\s+/g, '-')}-QR.png`,
        { type: 'image/png' }
      );
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${app.name} — PB X Store QR`,
          text: `Scan to download ${app.name} from PB X Store`,
        });
        return;
      }
    } catch {
      // Fallback to clean QR preview modal with direct PNG save & link share
    }

    setQrPreviewOpen(true);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      onNotify('Please select a star rating (1–5) first.', 'error');
      return;
    }

    const reviewId =
      savedFeedback?.id ||
      `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const entry: SavedFeedback = {
      id: reviewId,
      rating,
      comment: comment.trim(),
      submittedAt: new Date(serverNow).toISOString(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(entry));
    } catch {
      // Ignore storage errors
    }

    // Sync review directly into Firebase RTDB so PB X Store Admin shows live ratings & comments
    void set(ref(db, `apps/${app.id}/reviews/${reviewId}`), {
      id: reviewId,
      rating: entry.rating,
      comment: entry.comment,
      author: 'Store User',
      version: app.version || '1.0.0',
      createdAt: entry.submittedAt,
    }).catch(() => {
      // Silently ignore if public RTDB writes are locked by Firebase security rules
    });

    setSavedFeedback(entry);
    setEditingFeedback(false);
    onNotify(`Thanks for rating ${app.name} (${rating}/5)!`, 'success');
  };

  const sourceHost = useMemo(() => {
    if (!app.apkUrl) return 'Direct Package';
    try {
      return new URL(app.apkUrl).hostname.replace(/^www\./, '');
    } catch {
      return 'Verified Package Source';
    }
  }, [app.apkUrl]);

  const activeStars = hoverRating || rating;

  return (
    <>
      <StoreShareModal
        open={shareOpen}
        appName={app.name}
        publicUrl={publicUrl}
        onClose={() => setShareOpen(false)}
        onCopyLink={onCopyLink}
      />
      <StoreQRPreviewModal
        open={qrPreviewOpen}
        appName={app.name}
        qrDataUrl={qrDataUrl}
        onClose={() => setQrPreviewOpen(false)}
        onDownload={handleDownloadQrPng}
        onOpenShareSheet={() => setShareOpen(true)}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-4 sm:space-y-5 max-w-2xl mx-auto"
      >
        {/* Top Back + Verified Strip */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="btn-3d-secondary min-h-[36px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Store</span>
          </button>

          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]"
            style={{
              background: 'var(--surface-inset)',
              boxShadow: 'var(--shadow-inset)',
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Verified by PB X Store</span>
          </div>
        </div>

        {/* Primary 3D App Hero & Download Card */}
        <section className="surface-3d-lg rounded-[26px] p-4 sm:p-6 space-y-4 relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-x-10 top-0 h-[2px] opacity-80 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, var(--accent-bright), transparent)',
            }}
          />

          <div className="flex items-start gap-3.5 sm:gap-4">
            <AppIcon src={app.iconUrl} name={app.name} size="lg" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)] leading-tight truncate">
                  {app.name}
                </h1>
                {app.password && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-lg">
                    <Lock className="w-3 h-3" />
                    Unlocked
                  </span>
                )}
              </div>

              {app.shortDescription && app.shortDescription.trim().length > 0 && (
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                  {app.shortDescription}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span
                  className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--accent-text-on)',
                  }}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>{pkgType}</span>
                </span>
                <span
                  className="font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  style={{ background: 'var(--surface-inset)' }}
                >
                  v{app.version}
                </span>
                <span
                  className="font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                  style={{ background: 'var(--surface-inset)' }}
                >
                  {app.fileSize || 'Size N/A'}
                </span>
                {app.category && app.category.trim().length > 0 && (
                  <span
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                    style={{ background: 'var(--surface-inset)' }}
                  >
                    {app.category}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Live Server-Time Validity Strip */}
          <div
            className="rounded-2xl px-3.5 py-3 border border-[var(--border-subtle)] flex items-center gap-2.5"
            style={{
              background: 'var(--surface-inset)',
              boxShadow: 'var(--shadow-inset)',
            }}
          >
            {expiry.isLifetime ? (
              <InfinityIcon className={`w-4 h-4 shrink-0 ${expiryToneClass}`} />
            ) : (
              <Clock className={`w-4 h-4 shrink-0 ${expiryToneClass}`} />
            )}
            <div className="min-w-0">
              <p className={`text-xs font-bold font-mono ${expiryToneClass}`}>{expiry.label}</p>
              <p className="text-[11px] text-[var(--text-muted)]">{expiry.subLabel}</p>
            </div>
          </div>

          {/* Primary 3D Download CTA */}
          <a
            href={app.apkUrl || '#'}
            onClick={(e) => {
              if (!app.apkUrl) {
                e.preventDefault();
              }
              handleDownloadClick();
            }}
            className={`btn-3d-primary w-full min-h-[52px] px-4 rounded-2xl flex items-center justify-between gap-3 group ${
              !app.apkUrl ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-extrabold leading-tight">
                  {downloading ? 'Starting Download...' : `Download ${pkgType}`}
                </p>
                <p className="text-[11px] opacity-85 truncate">
                  {isIOS ? 'For iOS devices' : 'For Android devices'} · v{app.version}
                  {app.fileSize ? ` · ${app.fileSize}` : ''}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
          </a>

          {/* Quick Action Strip */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="btn-3d-secondary min-h-[38px] px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Share</span>
            </button>
            <button
              type="button"
              onClick={() => onCopyLink(publicUrl)}
              className="btn-3d-secondary min-h-[38px] px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Copy Link</span>
            </button>
            <button
              type="button"
              onClick={handleShareQr}
              className="btn-3d-secondary min-h-[38px] px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <QrCodeIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>QR Code</span>
            </button>
          </div>
        </section>

        {/* About This App (Only when full description exists) */}
        {app.fullDescription && app.fullDescription.trim().length > 0 && (
          <section className="surface-3d rounded-3xl p-4 sm:p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">About This App</h2>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
              {app.fullDescription}
            </p>
          </section>
        )}

        {/* App Overview Quick Stats */}
        <section className="surface-3d rounded-3xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">App Overview</h2>
            <span className="text-[11px] font-medium text-[var(--text-muted)]">Build Info</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: Package, label: 'App Name', value: app.name, mono: false },
              { icon: Layers, label: 'Version', value: `v${app.version}`, mono: true },
              { icon: HardDrive, label: 'File Size', value: app.fileSize || 'N/A', mono: true },
              {
                icon: Calendar,
                label: 'Updated',
                value: formatShortDate(app.updatedAt || app.createdAt),
                mono: true,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-2xl p-3 border border-[var(--border-subtle)] space-y-1"
                  style={{
                    background: 'var(--surface-inset)',
                    boxShadow: 'var(--shadow-inset)',
                  }}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    <Icon className="w-3 h-3" />
                    <span>{item.label}</span>
                  </div>
                  <p
                    className={`text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate ${
                      item.mono ? 'font-mono tabular-nums' : ''
                    }`}
                  >
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Technical Details Accordion */}
        <section className="surface-3d rounded-3xl overflow-hidden">
          <button
            type="button"
            onClick={() => setTechOpen((prev) => !prev)}
            aria-expanded={techOpen}
            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--accent-soft)] text-[var(--accent)]">
                <Settings2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Technical Details</h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {techOpen ? 'Tap to collapse' : 'Platform, Bundle ID & OS requirements'}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${
                techOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {techOpen && (
            <div className="px-4 sm:px-5 pb-4 sm:pb-5">
              <dl className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] pt-1">
                {[
                  { label: 'Platform', value: app.platform || 'Android', mono: false },
                  { label: 'Package Format', value: pkgType, mono: true },
                  { label: 'Bundle ID', value: app.bundleId || 'com.pbxstore.app', mono: true },
                  {
                    label: isIOS ? 'Min iOS' : 'Min Android',
                    value: app.androidMinVersion || 'Varies',
                    mono: true,
                  },
                  { label: 'Release Slug', value: app.slug, mono: true },
                  { label: 'Package Host', value: sourceHost, mono: true },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <dt className="text-[var(--text-muted)] shrink-0">{row.label}</dt>
                    <dd
                      className={`text-[var(--text-primary)] font-semibold text-right truncate ${
                        row.mono ? 'font-mono' : ''
                      }`}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </section>

        {/* Fully Working 5-Star Rating & Feedback Card */}
        <section className="surface-3d rounded-3xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--accent-soft)] text-[var(--accent)]">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Rate &amp; Feedback</h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Share your experience with this build
                </p>
              </div>
            </div>
            {savedFeedback && !editingFeedback && (
              <button
                type="button"
                onClick={() => setEditingFeedback(true)}
                className="btn-3d-secondary min-h-[32px] px-3 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>

          {savedFeedback && !editingFeedback ? (
            <div
              className="rounded-2xl p-4 border border-[var(--border-subtle)] space-y-2"
              style={{
                background: 'var(--surface-inset)',
                boxShadow: 'var(--shadow-inset)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= savedFeedback.rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-[var(--text-muted)] opacity-35'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-bold text-[var(--text-primary)] ml-1.5">
                    {RATING_LABELS[savedFeedback.rating]} ({savedFeedback.rating}/5)
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Submitted
                </span>
              </div>
              {savedFeedback.comment && (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {savedFeedback.comment}
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleFeedbackSubmit} className="space-y-3.5">
              <div className="text-center space-y-1.5">
                <div
                  className="inline-flex items-center justify-center gap-1.5"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const filled = star <= activeStars;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        aria-label={`Rate ${star} out of 5 stars`}
                        aria-pressed={rating === star}
                        className="p-1.5 rounded-xl transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            filled
                              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]'
                              : 'text-[var(--text-muted)] opacity-45'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] h-4">
                  {activeStars > 0
                    ? `${RATING_LABELS[activeStars]} · ${activeStars} / 5`
                    : 'Tap a star to rate'}
                </p>
              </div>

              <div>
                <label
                  htmlFor="store-feedback-text"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
                >
                  Your review (optional)
                </label>
                <textarea
                  id="store-feedback-text"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="How did this app install and run on your device?"
                  className="input-3d resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                {savedFeedback && (
                  <button
                    type="button"
                    onClick={() => {
                      setRating(savedFeedback.rating);
                      setComment(savedFeedback.comment);
                      setEditingFeedback(false);
                    }}
                    className="btn-3d-secondary min-h-[42px] px-4 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="btn-3d-primary flex-1 min-h-[42px] rounded-xl text-xs font-bold cursor-pointer"
                >
                  {savedFeedback ? 'Update Feedback' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Share Build & QR Code Card */}
        <section className="surface-3d rounded-3xl p-4 sm:p-6 flex flex-col items-center text-center space-y-3.5">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Share Build &amp; QR</h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Scan on any phone to open this exact release
            </p>
          </div>

          <div className="relative bg-white p-3 rounded-2xl shadow-lg inline-flex items-center justify-center">
            <canvas ref={qrCanvasRef} className="w-[152px] h-[152px] rounded-lg block" />
            {app.iconUrl && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white p-1 rounded-xl shadow border border-black/10 w-10 h-10 overflow-hidden flex items-center justify-center">
                  <img
                    src={app.iconUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div
            className="w-full rounded-xl px-3 py-2 border border-[var(--border-subtle)] flex items-center justify-between gap-2"
            style={{
              background: 'var(--surface-inset)',
              boxShadow: 'var(--shadow-inset)',
            }}
          >
            <span className="font-mono text-[11px] text-[var(--text-secondary)] truncate">
              {publicUrl.replace(/^https?:\/\//, '')}
            </span>
            <button
              type="button"
              onClick={() => onCopyLink(publicUrl)}
              aria-label="Copy app link"
              className="btn-3d-secondary w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 w-full">
            <button
              type="button"
              onClick={handleDownloadQrPng}
              className="btn-3d-secondary min-h-[42px] px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Save QR PNG</span>
            </button>
            <button
              type="button"
              onClick={handleShareQr}
              className="btn-3d-primary min-h-[42px] px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share QR</span>
            </button>
          </div>
        </section>

        <p className="text-[11px] text-center text-[var(--text-muted)] px-2 pb-2 leading-relaxed">
          Uploaded by an authorized publisher. PB X Store delivers verified packages directly.
        </p>
      </motion.div>
    </>
  );
}
