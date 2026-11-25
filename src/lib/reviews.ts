import type { AppRatingSummary, AppReview, RawReviewRecord, StoreApp } from '../types';

function clampRating(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.max(1, Math.min(5, Math.round(num)));
}

function resolveTimestamp(raw: RawReviewRecord): { iso: string; ms: number } {
  const candidate = raw.createdAt ?? raw.submittedAt ?? raw.timestamp;
  if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
    const ms = candidate < 1e12 ? candidate * 1000 : candidate;
    return { iso: new Date(ms).toISOString(), ms };
  }
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    const parsed = Date.parse(candidate);
    if (!Number.isNaN(parsed)) {
      return { iso: new Date(parsed).toISOString(), ms: parsed };
    }
  }
  return { iso: '', ms: 0 };
}

function normalizeReviewRecord(
  id: string,
  raw: RawReviewRecord,
  app: StoreApp,
  sourcePath: 'nested' | 'root'
): AppReview | null {
  if (!raw || typeof raw !== 'object') return null;

  const rating = clampRating(raw.rating ?? raw.stars);
  const commentText = String(raw.comment ?? raw.review ?? raw.text ?? raw.message ?? '').trim();

  // Ignore completely empty/corrupt entries
  if (rating === 0 && commentText.length === 0) return null;

  const authorRaw = String(raw.author ?? raw.userName ?? raw.name ?? '').trim();
  const author = authorRaw.length > 0 ? authorRaw : 'Store User';
  const { iso, ms } = resolveTimestamp(raw);

  return {
    id: String(raw.id || id),
    appId: app.id,
    appName: app.name,
    appSlug: app.slug,
    rating: rating || 5,
    comment: commentText,
    author,
    version: raw.version ? String(raw.version) : undefined,
    createdAt: iso,
    timestampMs: ms,
    sourcePath,
  };
}

export function buildAppRatingSummary(
  app: StoreApp,
  rootReviewsForApp: Record<string, RawReviewRecord> | null = null
): AppRatingSummary {
  const deduped = new Map<string, AppReview>();

  // 1. Nested reviews directly under /apps/<appId>/reviews
  if (app.reviews && typeof app.reviews === 'object') {
    if (Array.isArray(app.reviews)) {
      app.reviews.forEach((rec, idx) => {
        const normalized = normalizeReviewRecord(String(idx), rec, app, 'nested');
        if (normalized) deduped.set(normalized.id, normalized);
      });
    } else {
      Object.entries(app.reviews).forEach(([key, rec]) => {
        const normalized = normalizeReviewRecord(key, rec, app, 'nested');
        if (normalized) deduped.set(normalized.id, normalized);
      });
    }
  }

  // 2. Optional top-level /reviews/<appId> node if present & readable
  if (rootReviewsForApp && typeof rootReviewsForApp === 'object') {
    Object.entries(rootReviewsForApp).forEach(([key, rec]) => {
      if (!deduped.has(key)) {
        const normalized = normalizeReviewRecord(key, rec, app, 'root');
        if (normalized) deduped.set(normalized.id, normalized);
      }
    });
  }

  const reviews = Array.from(deduped.values()).sort((a, b) => b.timestampMs - a.timestampMs);

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  let ratingSum = 0;
  let commentCount = 0;

  for (const rev of reviews) {
    const bucket = Math.max(1, Math.min(5, Math.round(rev.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[bucket] += 1;
    ratingSum += rev.rating;
    if (rev.comment.trim().length > 0) {
      commentCount += 1;
    }
  }

  if (reviews.length > 0) {
    return {
      averageRating: Math.round((ratingSum / reviews.length) * 10) / 10,
      totalReviews: reviews.length,
      commentCount,
      distribution,
      reviews,
    };
  }

  // Fallback to summary counters if present on the app record
  const fallbackCount = Number(app.reviewCount ?? app.reviewsCount ?? 0) || 0;
  const fallbackAvg = Number(app.averageRating ?? app.rating ?? 0) || 0;

  return {
    averageRating: fallbackCount > 0 ? Math.round(fallbackAvg * 10) / 10 : 0,
    totalReviews: fallbackCount,
    commentCount: 0,
    distribution,
    reviews: [],
  };
}

export function buildAllRatingsMap(
  apps: StoreApp[],
  rootReviewsTree: Record<string, unknown> | null = null
): {
  byAppId: Record<string, AppRatingSummary>;
  allReviews: AppReview[];
  overallAverage: number;
  totalReviews: number;
  totalComments: number;
  ratedAppsCount: number;
} {
  const byAppId: Record<string, AppRatingSummary> = {};
  const allReviews: AppReview[] = [];

  let weightedSum = 0;
  let totalReviews = 0;
  let totalComments = 0;
  let ratedAppsCount = 0;

  for (const app of apps) {
    let rootBucket: Record<string, RawReviewRecord> | null = null;
    if (rootReviewsTree && typeof rootReviewsTree === 'object') {
      const byId = rootReviewsTree[app.id];
      const bySlug = app.slug ? rootReviewsTree[app.slug] : undefined;
      const candidate =
        byId && typeof byId === 'object'
          ? (byId as Record<string, RawReviewRecord>)
          : bySlug && typeof bySlug === 'object'
            ? (bySlug as Record<string, RawReviewRecord>)
            : null;
      rootBucket = candidate;
    }

    const summary = buildAppRatingSummary(app, rootBucket);
    byAppId[app.id] = summary;

    if (summary.totalReviews > 0) {
      ratedAppsCount += 1;
      totalReviews += summary.totalReviews;
      totalComments += summary.commentCount;
      weightedSum += summary.averageRating * summary.totalReviews;
    }

    allReviews.push(...summary.reviews);
  }

  allReviews.sort((a, b) => b.timestampMs - a.timestampMs);

  const overallAverage =
    totalReviews > 0 ? Math.round((weightedSum / totalReviews) * 10) / 10 : 0;

  return {
    byAppId,
    allReviews,
    overallAverage,
    totalReviews,
    totalComments,
    ratedAppsCount,
  };
}

export function formatReviewDate(iso?: string): string {
  if (!iso) return 'Recently';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Recently';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
