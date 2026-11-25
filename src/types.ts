export type ColorMode = 'dark' | 'light';

export type ThemeId =
  | 'titanium'
  | 'sapphire'
  | 'mint'
  | 'sakura'
  | 'orchid'
  | 'gold'
  | 'coral'
  | 'arctic'
  | 'matcha'
  | 'ruby'
  | 'mocha'
  | 'lavender';

export type ActiveView = 'dashboard' | 'builds' | 'add' | 'manage';

export type PlatformType = 'Android' | 'iOS';

export type ExpiryMode = 'lifetime' | 'date';

export interface RawReviewRecord {
  id?: string;
  appId?: string;
  appSlug?: string;
  rating?: number;
  stars?: number;
  comment?: string;
  review?: string;
  text?: string;
  message?: string;
  author?: string;
  userName?: string;
  name?: string;
  version?: string;
  device?: string;
  createdAt?: string | number;
  submittedAt?: string | number;
  timestamp?: string | number;
}

export interface AppReview {
  id: string;
  appId: string;
  appName: string;
  appSlug: string;
  rating: number;
  comment: string;
  author: string;
  version?: string;
  createdAt: string;
  timestampMs: number;
  sourcePath: 'nested' | 'root';
}

export interface AppRatingSummary {
  averageRating: number;
  totalReviews: number;
  commentCount: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  reviews: AppReview[];
}

export interface StoreApp {
  id: string;
  name: string;
  slug: string;
  appUrl?: string;
  bundleId?: string;
  platform?: PlatformType | string;
  iconUrl?: string;
  shortDescription?: string;
  fullDescription?: string;
  version: string;
  fileSize?: string;
  category?: string;
  androidMinVersion?: string;
  apkUrl: string;
  password?: string | null;
  aliases?: string[];
  published: boolean;
  isLifetime?: boolean;
  expiryDate?: string | null;
  expiryTime?: string | null;
  expiryTimestamp?: number | null;
  createdAt?: string;
  updatedAt?: string;
  downloads?: number;
  linkOpens?: number;
  uniqueDevices?: number;
  successRate?: string;
  rating?: number;
  averageRating?: number;
  reviewCount?: number;
  reviewsCount?: number;
  reviews?: Record<string, RawReviewRecord> | RawReviewRecord[] | null;
}

export interface AppFormValues {
  name: string;
  slug: string;
  platform: PlatformType;
  bundleId: string;
  expiryMode: ExpiryMode;
  expiryDate: string;
  expiryTime: string;
  iconUrl: string;
  shortDescription: string;
  category: string;
  fullDescription: string;
  version: string;
  fileSize: string;
  androidMinVersion: string;
  apkUrl: string;
  password: string;
  aliases: string;
  published: boolean;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}
