import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Plus, QrCode, Search, Settings2, X } from 'lucide-react';
import type { StoreApp } from '../types';
import { getAppStoreUrl, getExpiryStatus } from '../lib/firebase';
import { AppIcon } from './AppIcon';

interface BuildsListViewProps {
  apps: StoreApp[];
  serverNow: number;
  onOpenAdd: () => void;
  onManageApp: (id: string) => void;
  onCopyLink: (url: string) => void;
  onShowQR: (app: StoreApp) => void;
}

type StatusFilter = 'all' | 'active' | 'draft';
type PlatformFilter = 'all' | 'Android' | 'iOS';

export function BuildsListView({
  apps,
  serverNow,
  onOpenAdd,
  onManageApp,
  onCopyLink,
  onShowQR,
}: BuildsListViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');

  const filteredApps = useMemo(() => {
    const term = search.trim().toLowerCase();
    return apps.filter((app) => {
      if (statusFilter === 'active' && !app.published) return false;
      if (statusFilter === 'draft' && app.published) return false;
      if (platformFilter !== 'all' && (app.platform || 'Android') !== platformFilter) {
        return false;
      }
      if (!term) return true;

      const searchable = [
        app.name,
        app.slug,
        app.category,
        app.bundleId,
        app.version,
        ...(Array.isArray(app.aliases) ? app.aliases : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [apps, search, statusFilter, platformFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            All Builds
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-mono tabular-nums">
            Showing {filteredApps.length} of {apps.length}{' '}
            {apps.length === 1 ? 'build' : 'builds'}
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

      {/* Filter & Search Toolbar */}
      <div className="surface-3d rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by app name, slug, category, bundle ID, or alias..."
            aria-label="Filter builds"
            className="input-3d pl-10 pr-9 min-h-[42px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Segmented Status Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label="Filter by status"
            className="inline-flex p-1 rounded-xl border border-[var(--border-subtle)]"
            style={{
              background: 'var(--surface-inset)',
              boxShadow: 'var(--shadow-inset)',
            }}
          >
            {(['all', 'active', 'draft'] as StatusFilter[]).map((status) => {
              const active = statusFilter === status;
              const label =
                status === 'all' ? 'All' : status === 'active' ? 'Active' : 'Drafts';
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 min-h-[34px] rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? 'surface-3d text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Segmented Platform Filter */}
          <div
            role="group"
            aria-label="Filter by platform"
            className="inline-flex p-1 rounded-xl border border-[var(--border-subtle)]"
            style={{
              background: 'var(--surface-inset)',
              boxShadow: 'var(--shadow-inset)',
            }}
          >
            {(['all', 'Android', 'iOS'] as PlatformFilter[]).map((plat) => {
              const active = platformFilter === plat;
              return (
                <button
                  key={plat}
                  type="button"
                  onClick={() => setPlatformFilter(plat)}
                  className={`px-3 min-h-[34px] rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? 'surface-3d text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {plat === 'all' ? 'All OS' : plat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Builds List */}
      {filteredApps.length === 0 ? (
        <div className="surface-3d rounded-2xl p-10 text-center">
          <p className="text-base font-bold text-[var(--text-primary)]">
            {apps.length === 0 ? 'No builds uploaded yet' : 'No builds match your filters'}
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
            {apps.length === 0
              ? 'Click Upload Build to publish your first app to PB X Store.'
              : 'Try adjusting your search query or switching status and platform filters.'}
          </p>
          {apps.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setPlatformFilter('all');
              }}
              className="btn-3d-secondary min-h-[42px] px-4 rounded-xl text-xs font-semibold mt-4 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApps.map((app) => {
            const expiry = getExpiryStatus(
              app.expiryDate,
              app.isLifetime,
              serverNow,
              app.expiryTimestamp,
              app.expiryTime
            );
            const url = getAppStoreUrl(app);

            return (
              <div
                key={app.id}
                onClick={() => onManageApp(app.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onManageApp(app.id);
                  }
                }}
                className="surface-3d surface-3d-interactive rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <AppIcon src={app.iconUrl} name={app.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">
                        {app.name}
                      </h3>
                      <span
                        className={`text-xs font-semibold ${
                          app.published
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {app.published ? 'Active' : 'Draft'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-[var(--text-muted)]">
                      <span className="font-mono">v{app.version}</span>
                      <span aria-hidden="true">·</span>
                      <span>{app.fileSize || 'Size N/A'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{app.platform || 'Android'}</span>
                      {app.category && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{app.category}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          expiry.isLifetime
                            ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                            : expiry.tone === 'expired'
                              ? 'text-red-500 font-semibold'
                              : expiry.tone === 'warning'
                                ? 'text-amber-600 dark:text-amber-400 font-medium'
                                : 'text-[var(--text-secondary)]'
                        }
                      >
                        {expiry.isLifetime ? 'Lifetime' : expiry.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div
                  className="flex items-center gap-2 shrink-0 justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onShowQR(app)}
                    aria-label={`Show QR code for ${app.name}`}
                    className="btn-3d-secondary min-h-[40px] min-w-[40px] px-2.5 rounded-xl flex items-center justify-center cursor-pointer"
                    title="Show QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onCopyLink(url)}
                    aria-label={`Copy store link for ${app.name}`}
                    className="btn-3d-secondary min-h-[40px] min-w-[40px] px-2.5 rounded-xl flex items-center justify-center cursor-pointer"
                    title="Copy Store Link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onManageApp(app.id)}
                    className="btn-3d-primary min-h-[40px] px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span>Manage</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
