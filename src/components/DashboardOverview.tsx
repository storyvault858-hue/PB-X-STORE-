import React from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  ChevronRight,
  Download,
  FileEdit,
  Layers,
  Plus,
  Star,
} from 'lucide-react';
import type { AppRatingSummary, StoreApp } from '../types';
import { formatShortDate } from '../lib/firebase';
import { AppIcon } from './AppIcon';

interface DashboardOverviewProps {
  apps: StoreApp[];
  ratingsByAppId: Record<string, AppRatingSummary>;
  overallAverage: number;
  totalReviews: number;
  totalComments: number;
  onOpenAdd: () => void;
  onViewBuilds: () => void;
  onManageApp: (id: string) => void;
}

export function DashboardOverview({
  apps,
  ratingsByAppId,
  overallAverage,
  totalReviews,
  totalComments,
  onOpenAdd,
  onViewBuilds,
  onManageApp,
}: DashboardOverviewProps) {
  const totalBuilds = apps.length;
  const activeCount = apps.filter((a) => a.published).length;
  const draftCount = apps.filter((a) => !a.published).length;
  const totalDownloads = apps.reduce((sum, a) => sum + (Number(a.downloads) || 0), 0);

  const activePercent = totalBuilds > 0 ? Math.round((activeCount / totalBuilds) * 100) : 0;
  const recentBuilds = apps.slice(0, 6);

  const kpis = [
    {
      label: 'Total Builds',
      value: totalBuilds.toLocaleString(),
      sub: 'Across Android & iOS',
      icon: Layers,
      accentClass: 'text-[var(--accent)]',
    },
    {
      label: 'Active Live',
      value: activeCount.toLocaleString(),
      sub: `${activePercent}% published`,
      icon: CheckCircle2,
      accentClass: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Drafts',
      value: draftCount.toLocaleString(),
      sub: 'Hidden from store',
      icon: FileEdit,
      accentClass: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Downloads',
      value: totalDownloads.toLocaleString(),
      sub: 'Total store installs',
      icon: Download,
      accentClass: 'text-[var(--accent)]',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 sm:space-y-8"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Dashboard Overview
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Real-time overview of your PB X Store applications, ratings, and release activity.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAdd}
          className="btn-3d-primary min-h-[44px] px-5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Build</span>
        </button>
      </div>

      {/* 4-Column 3D KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="surface-3d rounded-2xl p-4 sm:p-5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  {item.label}
                </span>
                <Icon className={`w-4 h-4 shrink-0 ${item.accentClass}`} />
              </div>
              <p className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
                {item.value}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1.5">{item.sub}</p>
            </div>
          );
        })}
      </div>

      {/* User Ratings & Reviews Summary Strip */}
      <div className="surface-3d rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-[var(--border-subtle)]"
            style={{
              background: 'var(--surface-inset)',
              boxShadow: 'var(--shadow-inset)',
            }}
          >
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Store Ratings &amp; Reviews
              </h2>
              <span className="font-mono text-xs font-bold text-[var(--text-primary)] tabular-nums">
                {totalReviews > 0 ? `${overallAverage.toFixed(1)} / 5.0 ★` : 'No ratings yet'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono tabular-nums">
              {totalReviews.toLocaleString()} total{' '}
              {totalReviews === 1 ? 'review' : 'reviews'} · {totalComments.toLocaleString()}{' '}
              {totalComments === 1 ? 'comment' : 'comments'} across your builds
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewBuilds}
          className="btn-3d-secondary min-h-[40px] px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>View Builds &amp; Reviews</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Publish Readiness Bar */}
      {totalBuilds > 0 && (
        <div className="surface-3d rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Store Release Status
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {activeCount} live in store · {draftCount} in draft
              </p>
            </div>
            <span className="font-mono text-sm font-bold text-[var(--text-primary)] tabular-nums">
              {activePercent}%
            </span>
          </div>
          <div
            className="w-full h-3 rounded-full overflow-hidden border border-[var(--border-subtle)]"
            style={{
              background: 'var(--surface-inset)',
              boxShadow: 'var(--shadow-inset)',
            }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${activePercent}%`,
                background:
                  'linear-gradient(90deg, var(--accent-lip), var(--accent-bright))',
                boxShadow: '0 0 12px var(--accent-glow)',
              }}
            />
          </div>
        </div>
      )}

      {/* Recent Builds Section */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Recent Builds</h2>
          <button
            type="button"
            onClick={onViewBuilds}
            className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1 whitespace-nowrap cursor-pointer min-h-[36px] px-1"
          >
            <span>View all builds</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentBuilds.length === 0 ? (
          <div className="surface-3d rounded-2xl p-10 text-center">
            <p className="text-base font-bold text-[var(--text-primary)]">
              No builds published yet
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1.5 max-w-sm mx-auto">
              Upload your first Android or iOS build to generate its PB X Store listing and QR code.
            </p>
            <button
              type="button"
              onClick={onOpenAdd}
              className="btn-3d-primary min-h-[44px] px-5 rounded-xl text-sm font-bold inline-flex items-center gap-2 mt-5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Upload First Build</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {recentBuilds.map((app) => {
              const ratingSummary = ratingsByAppId[app.id];
              const hasReviews = ratingSummary && ratingSummary.totalReviews > 0;
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => onManageApp(app.id)}
                  className="surface-3d surface-3d-interactive rounded-2xl p-4 text-left flex items-center justify-between gap-3.5 cursor-pointer w-full"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <AppIcon src={app.iconUrl} name={app.name} size="md" />
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">
                        {app.name}
                      </h3>
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)] mt-1">
                        <span className="font-mono">v{app.version}</span>
                        <span aria-hidden="true">·</span>
                        <span>{app.platform || 'Android'}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            app.published
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-amber-600 dark:text-amber-400 font-semibold'
                          }
                        >
                          {app.published ? 'Active' : 'Draft'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-0.5 font-mono tabular-nums text-[var(--text-secondary)]">
                          <Star
                            className={`w-3 h-3 ${
                              hasReviews
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-[var(--text-muted)] opacity-40'
                            }`}
                          />
                          <span>
                            {hasReviews
                              ? `${ratingSummary.averageRating.toFixed(1)} (${ratingSummary.totalReviews})`
                              : '0 reviews'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:block text-right">
                      <p className="font-mono text-xs font-semibold text-[var(--text-primary)] tabular-nums">
                        {(app.downloads || 0).toLocaleString()} dl
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {formatShortDate(app.updatedAt || app.createdAt)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
