import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowUpRight,
  MessageSquareText,
  Search,
  Star,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type { AppRatingSummary, AppReview, StoreApp } from '../types';
import { formatReviewDate } from '../lib/reviews';
import { AppIcon } from './AppIcon';

interface ReviewsViewProps {
  apps: StoreApp[];
  ratingsByAppId: Record<string, AppRatingSummary>;
  allReviews: AppReview[];
  overallAverage: number;
  totalReviews: number;
  totalComments: number;
  ratedAppsCount: number;
  onManageApp: (id: string) => void;
  onDeleteReview: (review: AppReview) => void;
}

export function ReviewsView({
  apps,
  ratingsByAppId,
  allReviews,
  overallAverage,
  totalReviews,
  totalComments,
  ratedAppsCount,
  onManageApp,
  onDeleteReview,
}: ReviewsViewProps) {
  const [selectedAppId, setSelectedAppId] = useState<string>('all');
  const [starFilter, setStarFilter] = useState<number>(0);
  const [commentsOnly, setCommentsOnly] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  const appById = useMemo(() => {
    const map: Record<string, StoreApp> = {};
    for (const app of apps) map[app.id] = app;
    return map;
  }, [apps]);

  const filteredReviews = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allReviews.filter((rev) => {
      if (selectedAppId !== 'all' && rev.appId !== selectedAppId) return false;
      if (starFilter > 0 && Math.round(rev.rating) !== starFilter) return false;
      if (commentsOnly && rev.comment.trim().length === 0) return false;
      if (!q) return true;
      return (
        rev.comment.toLowerCase().includes(q) ||
        rev.author.toLowerCase().includes(q) ||
        rev.appName.toLowerCase().includes(q)
      );
    });
  }, [allReviews, selectedAppId, starFilter, commentsOnly, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
          User Reviews &amp; Ratings
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Monitor star ratings, review counts, and read user comments across all PB X Store builds.
        </p>
      </div>

      {/* Top KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="surface-3d rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Average Rating
            </span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="font-mono text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tabular-nums">
              {totalReviews > 0 ? overallAverage.toFixed(1) : '—'}
            </p>
            <span className="text-xs font-mono text-[var(--text-muted)]">/ 5.0</span>
          </div>
          <div className="flex items-center gap-0.5 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 ${
                  s <= Math.round(overallAverage)
                    ? 'text-amber-500 fill-amber-500'
                    : 'text-[var(--text-muted)] opacity-30'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="surface-3d rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Total Reviews
            </span>
            <MessageSquareText className="w-4 h-4 text-[var(--accent)] shrink-0" />
          </div>
          <p className="font-mono text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tabular-nums">
            {totalReviews.toLocaleString()}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">All star ratings received</p>
        </div>

        <div className="surface-3d rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Written Comments
            </span>
            <MessageSquareText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <p className="font-mono text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tabular-nums">
            {totalComments.toLocaleString()}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">Feedback messages to read</p>
        </div>

        <div className="surface-3d rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Rated Apps
            </span>
            <Star className="w-4 h-4 text-[var(--accent)] shrink-0" />
          </div>
          <p className="font-mono text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tabular-nums">
            {ratedAppsCount}/{apps.length}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">Builds with user ratings</p>
        </div>
      </div>

      {/* Per-App Rating Selector */}
      {apps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              App Ratings Breakdown
            </h2>
            {selectedAppId !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedAppId('all')}
                className="text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
              >
                Show all apps
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {apps.map((app) => {
              const summary = ratingsByAppId[app.id];
              const isSelected = selectedAppId === app.id;
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setSelectedAppId(isSelected ? 'all' : app.id)}
                  className={`surface-3d surface-3d-interactive rounded-2xl p-3.5 text-left flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected ? 'ring-2 ring-[var(--accent)]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AppIcon src={app.iconUrl} name={app.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {app.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] font-mono tabular-nums mt-0.5">
                        {summary && summary.totalReviews > 0
                          ? `${summary.totalReviews} ${summary.totalReviews === 1 ? 'review' : 'reviews'} · ${summary.commentCount} ${summary.commentCount === 1 ? 'comment' : 'comments'}`
                          : 'No reviews yet'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center gap-1 font-mono text-sm font-bold text-[var(--text-primary)] tabular-nums">
                      <Star
                        className={`w-3.5 h-3.5 ${
                          summary && summary.totalReviews > 0
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-[var(--text-muted)] opacity-35'
                        }`}
                      />
                      <span>
                        {summary && summary.totalReviews > 0
                          ? summary.averageRating.toFixed(1)
                          : '—'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Star Filter Bar */}
      <div className="surface-3d rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search comments, reviewer name, or app..."
              aria-label="Search user comments"
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

          <button
            type="button"
            onClick={() => setCommentsOnly((prev) => !prev)}
            aria-pressed={commentsOnly}
            className={`min-h-[42px] px-4 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer ${
              commentsOnly ? 'btn-3d-primary' : 'btn-3d-secondary'
            }`}
          >
            {commentsOnly ? 'Comments Only: On' : 'Comments Only'}
          </button>
        </div>

        {/* Star Filter Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {[0, 5, 4, 3, 2, 1].map((s) => {
            const active = starFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStarFilter(s)}
                className={`min-h-[34px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                  active ? 'btn-3d-primary' : 'btn-3d-secondary'
                }`}
              >
                {s === 0 ? (
                  <span>All Stars</span>
                ) : (
                  <>
                    <span>{s}</span>
                    <Star className="w-3 h-3 fill-current" />
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comments Reader List */}
      {filteredReviews.length === 0 ? (
        <div className="surface-3d rounded-3xl p-8 sm:p-10 text-center space-y-2.5">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border border-[var(--border-subtle)]"
            style={{
              background: 'var(--surface-inset)',
              boxShadow: 'var(--shadow-inset)',
            }}
          >
            <MessageSquareText className="w-5 h-5 text-[var(--text-muted)]" />
          </div>
          <p className="text-base font-bold text-[var(--text-primary)]">
            {allReviews.length === 0 ? 'No user reviews received yet' : 'No matching reviews'}
          </p>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
            {allReviews.length === 0
              ? 'When users rate an app or write feedback on PB X Store, their star rating and full comment will appear here in real time.'
              : 'Try clearing the star filter, app filter, or search query to view all submitted reviews.'}
          </p>
          {allReviews.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedAppId('all');
                setStarFilter(0);
                setCommentsOnly(false);
                setSearch('');
              }}
              className="btn-3d-secondary min-h-[40px] px-4 rounded-xl text-xs font-semibold mt-2 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          <p className="text-xs font-mono text-[var(--text-muted)] tabular-nums px-1">
            Showing {filteredReviews.length} of {allReviews.length}{' '}
            {allReviews.length === 1 ? 'review' : 'reviews'}
          </p>

          {filteredReviews.map((rev) => {
            const parentApp = appById[rev.appId];
            return (
              <article
                key={`${rev.appId}-${rev.id}`}
                className="surface-3d rounded-2xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <AppIcon
                      src={parentApp?.iconUrl}
                      name={rev.appName}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onManageApp(rev.appId)}
                        className="inline-flex items-center gap-1 text-sm font-bold text-[var(--text-primary)] hover:underline cursor-pointer max-w-full"
                      >
                        <span className="truncate">{rev.appName}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                      </button>
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)] mt-0.5">
                        <span className="inline-flex items-center gap-1 font-medium text-[var(--text-secondary)]">
                          <User className="w-3 h-3" />
                          {rev.author}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {formatReviewDate(rev.createdAt)}
                        </span>
                        {rev.version && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">v{rev.version}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.rating
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-[var(--text-muted)] opacity-25'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-mono text-xs font-bold text-[var(--text-primary)] tabular-nums">
                      {rev.rating}.0
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteReview(rev)}
                      aria-label={`Delete review by ${rev.author}`}
                      title="Delete Review"
                      className="btn-3d-secondary w-8 h-8 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 cursor-pointer ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {rev.comment ? (
                  <div
                    className="rounded-xl px-3.5 py-3 border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words"
                    style={{
                      background: 'var(--surface-inset)',
                      boxShadow: 'var(--shadow-inset)',
                    }}
                  >
                    {rev.comment}
                  </div>
                ) : (
                  <p className="text-xs italic text-[var(--text-muted)]">
                    Star rating submitted without a written comment.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
