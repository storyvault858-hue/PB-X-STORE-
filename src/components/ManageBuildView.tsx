import React, { useMemo, useState } from 'react';
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
  MessageSquareText,
  Pencil,
  QrCode,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import type { AppRatingSummary, AppReview, StoreApp } from '../types';
import { formatShortDate, getAppStoreUrl, getExpiryStatus } from '../lib/firebase';
import { formatReviewDate } from '../lib/reviews';
import { AppIcon } from './AppIcon';

interface ManageBuildViewProps {
  app: StoreApp;
  ratingSummary: AppRatingSummary;
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
  onDeleteReview: (review: AppReview) => void;
}

export function ManageBuildView({
  app,
  ratingSummary,
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
  onDeleteReview,
}: ManageBuildViewProps) {
  const [starFilter, setStarFilter] = useState<number>(0);
  const [commentsOnly, setCommentsOnly] = useState<boolean>(false);

  const shareUrl = getAppStoreUrl(app);
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

  const filteredReviews = useMemo(() => {
    return ratingSummary.reviews.filter((rev) => {
      if (starFilter > 0 && Math.round(rev.rating) !== starFilter) return false;
      if (commentsOnly && rev.comment.trim().length === 0) return false;
      return true;
    });
  }, [ratingSummary.reviews, starFilter, commentsOnly]);

  const detailRows = [
    { label: 'Platform', value: app.platform || 'Android', mono: false },
    { label: 'Version', value: `v${app.version}`, mono: true },
    { label: 'File Size', value: app.fileSize || 'N/A', mono: true },
    { label: 'Bundle ID', value: app.bundleId || 'com.pbxstore.app', mono: true },
    { label: 'Min OS', value: app.androidMinVersion || 'Varies', mono: true },
    { label: 'Category', value: app.category || 'Uncategorized', mono: false },
    {
      label: 'Validity',
      value: expiry.isLifetime
        ? 'Lifetime (Never Expires)'
        : app.expiryDate
          ? `${app.expiryDate}${app.expiryTime ? ` · ${app.expiryTime}` : ''}`
          : 'Timed',
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
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-mono font-semibold text-[var(--text-primary)] tabular-nums">
                  <Star
                    className={`w-3.5 h-3.5 ${
                      ratingSummary.totalReviews > 0
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-[var(--text-muted)] opacity-40'
                    }`}
                  />
                  <span>
                    {ratingSummary.totalReviews > 0
                      ? `${ratingSummary.averageRating.toFixed(1)} (${ratingSummary.totalReviews})`
                      : 'No reviews'}
                  </span>
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

            <div className="grid grid-cols-2 gap-3.5">
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
            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  Direct Package Source
                </p>
                <button
                  type="button"
                  onClick={() => onCopyLink(app.apkUrl)}
                  className="btn-3d-secondary min-h-[30px] px-2.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy URL</span>
                </button>
              </div>
              <a
                href={app.apkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block font-mono text-xs text-[var(--accent)] hover:underline break-all leading-relaxed"
              >
                {app.apkUrl}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* User Reviews, Star Ratings & Comments Reader Card */}
      <section className="surface-3d rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              User Reviews &amp; Ratings
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono tabular-nums">
              {ratingSummary.totalReviews.toLocaleString()} total{' '}
              {ratingSummary.totalReviews === 1 ? 'review' : 'reviews'} ·{' '}
              {ratingSummary.commentCount.toLocaleString()} written{' '}
              {ratingSummary.commentCount === 1 ? 'comment' : 'comments'}
            </p>
          </div>

          {ratingSummary.reviews.length > 0 && (
            <button
              type="button"
              onClick={() => setCommentsOnly((prev) => !prev)}
              aria-pressed={commentsOnly}
              className={`min-h-[36px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap self-start sm:self-auto cursor-pointer ${
                commentsOnly ? 'btn-3d-primary' : 'btn-3d-secondary'
              }`}
            >
              {commentsOnly ? 'Comments Only: On' : 'With Comments Only'}
            </button>
          )}
        </div>

        {/* Rating Score + 5-Star Breakdown Bars */}
        <div
          className="rounded-2xl p-4 sm:p-5 border border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-12 gap-5 items-center"
          style={{
            background: 'var(--surface-inset)',
            boxShadow: 'var(--shadow-inset)',
          }}
        >
          <div className="sm:col-span-4 flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-4xl font-extrabold text-[var(--text-primary)] tabular-nums">
                {ratingSummary.totalReviews > 0
                  ? ratingSummary.averageRating.toFixed(1)
                  : '0.0'}
              </span>
              <span className="font-mono text-sm text-[var(--text-muted)]">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(ratingSummary.averageRating)
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-[var(--text-muted)] opacity-30'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 font-mono tabular-nums">
              {ratingSummary.totalReviews}{' '}
              {ratingSummary.totalReviews === 1 ? 'rating' : 'ratings'} total
            </p>
          </div>

          <div className="sm:col-span-8 space-y-2">
            {([5, 4, 3, 2, 1] as const).map((starLevel) => {
              const count = ratingSummary.distribution[starLevel];
              const pct =
                ratingSummary.totalReviews > 0
                  ? Math.round((count / ratingSummary.totalReviews) * 100)
                  : 0;
              return (
                <button
                  key={starLevel}
                  type="button"
                  onClick={() =>
                    setStarFilter((prev) => (prev === starLevel ? 0 : starLevel))
                  }
                  className={`w-full flex items-center gap-2.5 text-xs cursor-pointer rounded-lg px-1.5 py-0.5 transition-colors ${
                    starFilter === starLevel
                      ? 'bg-[var(--accent-soft)]'
                      : 'hover:bg-[var(--surface)]'
                  }`}
                >
                  <span className="font-mono font-semibold text-[var(--text-secondary)] w-7 text-left inline-flex items-center gap-0.5 shrink-0">
                    {starLevel}
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  </span>
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]"
                    style={{ background: 'var(--surface)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        background:
                          'linear-gradient(90deg, var(--accent-lip), var(--accent-bright))',
                      }}
                    />
                  </div>
                  <span className="font-mono text-[var(--text-muted)] w-8 text-right tabular-nums shrink-0">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Star Filter Pills when Reviews Exist */}
        {ratingSummary.reviews.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {[0, 5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStarFilter(s)}
                className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                  starFilter === s ? 'btn-3d-primary' : 'btn-3d-secondary'
                }`}
              >
                {s === 0 ? (
                  <span>All ({ratingSummary.reviews.length})</span>
                ) : (
                  <>
                    <span>{s}</span>
                    <Star className="w-3 h-3 fill-current" />
                    <span>({ratingSummary.distribution[s as 1 | 2 | 3 | 4 | 5]})</span>
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        {/* User Comments List */}
        {filteredReviews.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <MessageSquareText className="w-6 h-6 text-[var(--text-muted)] mx-auto opacity-60" />
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {ratingSummary.reviews.length === 0
                ? 'No reviews yet for this app'
                : 'No reviews match this filter'}
            </p>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
              {ratingSummary.reviews.length === 0
                ? 'User star ratings and feedback comments submitted on PB X Store will appear here automatically.'
                : 'Reset the star or comments filter to view all reviews for this app.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-2xl p-4 border border-[var(--border-subtle)] space-y-2.5"
                style={{
                  background: 'var(--surface-inset)',
                  boxShadow: 'var(--shadow-inset)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--text-primary)]">
                        <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        {rev.author}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--text-muted)] tabular-nums">
                        {formatReviewDate(rev.createdAt)}
                      </span>
                      {rev.version && (
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                          · v{rev.version}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= rev.rating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-[var(--text-muted)] opacity-25'
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteReview(rev)}
                      aria-label={`Delete review by ${rev.author}`}
                      title="Delete Review"
                      className="btn-3d-secondary w-7 h-7 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {rev.comment ? (
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words">
                    {rev.comment}
                  </p>
                ) : (
                  <p className="text-xs italic text-[var(--text-muted)]">
                    Rated {rev.rating}/5 stars without a written comment.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

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
