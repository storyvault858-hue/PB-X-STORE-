import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Clock, Lock, Search, Smartphone, Star, X } from 'lucide-react';
import type { StoreApp } from '../../types';
import { getExpiryStatus } from '../../lib/firebase';
import { buildAppRatingSummary } from '../../lib/reviews';
import { AppIcon } from '../AppIcon';

export type StorePlatformFilter = 'All' | 'Android' | 'iOS';

interface StoreHomeViewProps {
  apps: StoreApp[];
  serverNow: number;
  searchQuery: string;
  selectedCategory: string;
  selectedPlatform: StorePlatformFilter;
  onSearchChange: (value: string) => void;
  onCategoryChange: (cat: string) => void;
  onPlatformChange: (plat: StorePlatformFilter) => void;
  onOpenApp: (slug: string) => void;
}

export function StoreHomeView({
  apps,
  serverNow,
  searchQuery,
  selectedCategory,
  selectedPlatform,
  onSearchChange,
  onCategoryChange,
  onPlatformChange,
  onOpenApp,
}: StoreHomeViewProps) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    apps.forEach((app) => {
      const cat = (app.category || '').trim();
      if (cat.length > 0) set.add(cat);
    });
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [apps]);

  const hasIosApps = useMemo(
    () => apps.some((a) => (a.platform || 'Android').toLowerCase() === 'ios'),
    [apps]
  );

  const filteredApps = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return apps.filter((app) => {
      const appPlatform = (app.platform || 'Android').trim();
      if (
        selectedPlatform !== 'All' &&
        appPlatform.toLowerCase() !== selectedPlatform.toLowerCase()
      ) {
        return false;
      }

      const appCategory = (app.category || '').trim();
      if (selectedCategory !== 'All' && appCategory !== selectedCategory) {
        return false;
      }

      if (!term) return true;

      const searchable = [
        app.name,
        app.slug,
        app.shortDescription,
        app.fullDescription,
        app.category,
        app.bundleId,
        app.version,
        appPlatform,
        ...(Array.isArray(app.aliases) ? app.aliases : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
  }, [apps, searchQuery, selectedCategory, selectedPlatform]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCategory !== 'All' ||
    selectedPlatform !== 'All';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Clean Hero + Search Stage */}
      <section className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-[var(--accent)]">
            Official App Distribution
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-tight [text-wrap:balance]">
            Discover &amp; Download{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, var(--accent-bright) 0%, var(--accent) 100%)',
              }}
            >
              Verified Builds
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl leading-relaxed">
            Direct, fast, and verified releases straight from PB X Store.
          </p>
        </div>

        {/* Recessed 3D Search Bar */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search apps, games, tools, version..."
            aria-label="Search PB X Store"
            className="input-3d pl-10 pr-10 min-h-[44px] sm:min-h-[46px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Platform & Category Filter Row */}
        {(hasIosApps || categories.length > 1) && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {hasIosApps && (
              <div
                role="group"
                aria-label="Filter by platform"
                className="inline-flex p-1 rounded-xl border border-[var(--border-subtle)] shrink-0"
                style={{
                  background: 'var(--surface-inset)',
                  boxShadow: 'var(--shadow-inset)',
                }}
              >
                {(['All', 'Android', 'iOS'] as StorePlatformFilter[]).map((plat) => {
                  const active = selectedPlatform === plat;
                  return (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => onPlatformChange(plat)}
                      className={`px-3 min-h-[30px] rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        active
                          ? 'surface-3d text-[var(--text-primary)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {plat}
                    </button>
                  );
                })}
              </div>
            )}

            {categories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1 min-w-0">
                {categories.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => onCategoryChange(cat)}
                      className={`min-h-[34px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        active
                          ? 'btn-3d-primary'
                          : 'btn-3d-secondary text-[var(--text-secondary)]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Catalog Section Header */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
            {hasActiveFilters ? 'Matching Apps' : 'Latest Releases'}
          </h2>
          <span className="font-mono text-xs text-[var(--text-muted)] tabular-nums">
            {filteredApps.length} {filteredApps.length === 1 ? 'app' : 'apps'}
          </span>
        </div>

        {filteredApps.length === 0 ? (
          <div className="surface-3d rounded-3xl p-8 sm:p-10 text-center">
            <div
              className="w-12 h-12 rounded-2xl mx-auto mb-3.5 flex items-center justify-center border border-[var(--border-subtle)]"
              style={{
                background: 'var(--surface-inset)',
                boxShadow: 'var(--shadow-inset)',
              }}
            >
              <Smartphone className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {apps.length === 0 ? 'No apps published yet' : 'No apps found'}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">
              {apps.length === 0
                ? 'Published builds from PB X Store will appear here automatically.'
                : 'Try a different app name, keyword, or reset your active filters.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  onCategoryChange('All');
                  onPlatformChange('All');
                }}
                className="btn-3d-secondary min-h-[38px] px-4 rounded-xl text-xs font-semibold mt-4 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredApps.map((app) => {
              const isIOS = (app.platform || 'Android').toLowerCase() === 'ios';
              const pkgLabel = isIOS ? 'IPA' : 'APK';
              const categoryLabel = (app.category || '').trim() || (isIOS ? 'iOS' : 'Android');
              const description =
                (app.shortDescription || '').trim() ||
                `${app.platform || 'Android'} · ${app.fileSize || 'Verified build'}`;
              const expiry = getExpiryStatus(
                app.expiryDate,
                app.isLifetime,
                serverNow,
                app.expiryTimestamp,
                app.expiryTime
              );
              const ratingSummary = buildAppRatingSummary(app);

              return (
                <div
                  key={app.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenApp(app.slug)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenApp(app.slug);
                    }
                  }}
                  className="surface-3d surface-3d-interactive rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="relative">
                        <AppIcon src={app.iconUrl} name={app.name} size="md" />
                        <span
                          className="absolute -bottom-1 -right-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shadow-sm tracking-wide"
                          style={{
                            background: 'var(--accent)',
                            color: 'var(--accent-text-on)',
                          }}
                        >
                          {pkgLabel}
                        </span>
                      </div>

                      {app.password && (
                        <span
                          title="Password protected"
                          className="w-6 h-6 rounded-lg flex items-center justify-center bg-[var(--accent-soft)] text-[var(--accent)] shrink-0"
                        >
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">
                      {app.name}
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2 min-h-[2rem] leading-snug">
                      {description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5 text-[11px]">
                      <span className="text-[var(--text-muted)] font-medium truncate">
                        {categoryLabel}
                      </span>
                      <span className="font-mono text-[var(--text-primary)] font-semibold shrink-0 tabular-nums">
                        v{app.version}
                      </span>
                    </div>

                    {ratingSummary.totalReviews > 0 && (
                      <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-secondary)] tabular-nums">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                        <span className="font-semibold text-[var(--text-primary)]">
                          {ratingSummary.averageRating.toFixed(1)}
                        </span>
                        <span className="text-[var(--text-muted)]">
                          ({ratingSummary.totalReviews})
                        </span>
                      </div>
                    )}

                    {!expiry.isLifetime && (
                      <div
                        className={`flex items-center gap-1 text-[10px] font-semibold truncate ${
                          expiry.tone === 'warning'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-[var(--text-muted)]'
                        }`}
                      >
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="truncate font-mono">{expiry.label}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </motion.div>
  );
}
