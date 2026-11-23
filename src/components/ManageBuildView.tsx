import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Infinity as InfinityIcon,
  Lock,
  Pencil,
  QrCode,
  Trash2,
} from 'lucide-react';
import type { StoreApp } from '../types';
import { formatShortDate, getAppStoreUrl, getExpiryStatus } from '../lib/firebase';
import { AppIcon } from './AppIcon';

interface ManageBuildViewProps {
  app: StoreApp;
  serverNow: number;
  togglingPublish: boolean;
  updatingValidity: boolean;
  onBack: () => void;
  onEdit: (app: StoreApp) => void;
  onShowQR: (app: StoreApp) => void;
  onCopyLink: (url: string) => void;
  onTogglePublish: (app: StoreApp) => void;
  onMakeLifetime: (app: StoreApp) => void;
  onDelete: (app: StoreApp) => void;
}

export function ManageBuildView({
  app,
  serverNow,
  togglingPublish,
  updatingValidity,
  onBack,
  onEdit,
  onShowQR,
  onCopyLink,
  onTogglePublish,
  onMakeLifetime,
  onDelete,
}: ManageBuildViewProps) {
  const shareUrl = getAppStoreUrl(app);
  const expiry = getExpiryStatus(app.expiryDate, app.isLifetime, serverNow);

  const expiryToneClass =
    expiry.tone === 'expired'
      ? 'text-red-600 dark:text-red-400'
      : expiry.tone === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400';

  const detailRows = [
    { label: 'Platform', value: app.platform || 'Android', mono: false },
    { label: 'Version', value: `v${app.version}`, mono: true },
    { label: 'File Size', value: app.fileSize || 'N/A', mono: true },
    { label: 'Bundle ID', value: app.bundleId || 'com.pbxstore.app', mono: true },
    { label: 'Min OS', value: app.androidMinVersion || 'Varies', mono: true },
    { label: 'Category', value: app.category || 'Uncategorized', mono: false },
    {
      label: 'Validity',
      value: expiry.isLifetime ? 'Lifetime (Never Expires)' : app.expiryDate || 'Timed',
      mono: !expiry.isLifetime,
    },
    { label: 'Created', value: formatShortDate(app.createdAt), mono: true },
    { label: 'Last Updated', value: formatShortDate(app.updatedAt), mono: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 max-w-4xl"
    >
      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[36px] cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Builds</span>
      </button>

      {/* Primary 3D App Control Card */}
      <div className="surface-3d rounded-3xl p-5 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <AppIcon src={app.iconUrl} name={app.name} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)] truncate">
                  {app.name}
                </h1>
                <span
                  className={`text-xs font-bold ${
                    app.published
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {app.published ? 'Active' : 'Draft'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-secondary)] mt-1">
                <span className="font-mono">v{app.version}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{app.fileSize || 'Size N/A'}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[var(--text-muted)]">
                  {app.bundleId || 'com.pbxstore.app'}
                </span>
              </div>

              {app.shortDescription && (
                <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                  {app.shortDescription}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tactile Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onShowQR(app)}
            className="btn-3d-primary min-h-[42px] px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Show QR</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(app)}
            className="btn-3d-secondary min-h-[42px] px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button
            type="button"
            onClick={() => onCopyLink(shareUrl)}
            className="btn-3d-secondary min-h-[42px] px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Link</span>
          </button>

          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-3d-secondary min-h-[42px] px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Store</span>
          </a>

          <button
            type="button"
            disabled={togglingPublish}
            onClick={() => onTogglePublish(app)}
            className="btn-3d-secondary min-h-[42px] px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            {app.published ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                <span>Move to Draft</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-500" />
                <span>Publish Live</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onDelete(app)}
            className="btn-3d-danger min-h-[42px] px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer sm:ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>

        {/* Access & Expiry Info Bar */}
        <div
          className="rounded-2xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[var(--border-subtle)]"
          style={{
            background: 'var(--surface-inset)',
            boxShadow: 'var(--shadow-inset)',
          }}
        >
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            {expiry.isLifetime ? (
              <InfinityIcon className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${expiryToneClass}`} />
            ) : (
              <Clock className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${expiryToneClass}`} />
            )}
            <div className="min-w-0">
              <p className={`text-xs font-bold ${expiryToneClass}`}>{expiry.label}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{expiry.subLabel}</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 shrink-0">
            {!expiry.isLifetime && (
              <button
                type="button"
                disabled={updatingValidity}
                onClick={() => onMakeLifetime(app)}
                className="btn-3d-secondary min-h-[36px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 whitespace-nowrap cursor-pointer"
              >
                <InfinityIcon className="w-3.5 h-3.5" />
                <span>{updatingValidity ? 'Updating...' : 'Make Lifetime'}</span>
              </button>
            )}
            {app.password && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
                <Lock className="w-3.5 h-3.5 text-[var(--accent)]" />
                Password protected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Two-column Details & Real-Time Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Build Details */}
        <div className="lg:col-span-7 surface-3d rounded-3xl p-5 sm:p-6">
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">
            Build Details
          </h2>
          <dl className="divide-y divide-[var(--border-subtle)]">
            {detailRows.map((row) => (
              <div
                key={row.label}
                className="py-2.5 flex items-center justify-between gap-4 text-xs sm:text-sm"
              >
                <dt className="text-[var(--text-muted)] shrink-0">{row.label}</dt>
                <dd
                  className={`text-[var(--text-primary)] font-medium text-right truncate ${
                    row.mono ? 'font-mono tabular-nums' : ''
                  }`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Real-Time Statistics */}
        <div className="lg:col-span-5 surface-3d rounded-3xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">
              Live Statistics
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div
                className="rounded-2xl p-4 border border-[var(--border-subtle)]"
                style={{
                  background: 'var(--surface-inset)',
                  boxShadow: 'var(--shadow-inset)',
                }}
              >
                <p className="text-xs text-[var(--text-muted)]">Link Opens</p>
                <p className="font-mono text-2xl font-bold text-[var(--text-primary)] tabular-nums mt-1">
                  {(app.linkOpens || 0).toLocaleString()}
                </p>
              </div>

              <div
                className="rounded-2xl p-4 border border-[var(--border-subtle)]"
                style={{
                  background: 'var(--surface-inset)',
                  boxShadow: 'var(--shadow-inset)',
                }}
              >
                <p className="text-xs text-[var(--text-muted)]">Total Downloads</p>
                <p className="font-mono text-2xl font-bold text-[var(--accent)] tabular-nums mt-1">
                  {(app.downloads || 0).toLocaleString()}
                </p>
              </div>

              <div
                className="rounded-2xl p-4 border border-[var(--border-subtle)]"
                style={{
                  background: 'var(--surface-inset)',
                  boxShadow: 'var(--shadow-inset)',
                }}
              >
                <p className="text-xs text-[var(--text-muted)]">Success Rate</p>
                <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                  {app.successRate || '0%'}
                </p>
              </div>

              <div
                className="rounded-2xl p-4 border border-[var(--border-subtle)]"
                style={{
                  background: 'var(--surface-inset)',
                  boxShadow: 'var(--shadow-inset)',
                }}
              >
                <p className="text-xs text-[var(--text-muted)]">Unique Devices</p>
                <p className="font-mono text-2xl font-bold text-[var(--text-primary)] tabular-nums mt-1">
                  {(app.uniqueDevices || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {app.apkUrl && (
            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
              <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Direct Package Source
              </p>
              <a
                href={app.apkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-[var(--accent)] hover:underline break-all line-clamp-2"
              >
                {app.apkUrl}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Full Description if present */}
      {app.fullDescription && (
        <div className="surface-3d rounded-3xl p-5 sm:p-6">
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-2.5">
            Full Description
          </h2>
          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
            {app.fullDescription}
          </p>
        </div>
      )}
    </motion.div>
  );
}
