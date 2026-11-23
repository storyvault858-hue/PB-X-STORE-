import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import type { StoreApp } from '../types';

export const LIVE_SITE_URL = 'https://pbxstore1.site.je';

const firebaseConfig = {
  apiKey: 'AIzaSyA0lhHdupnDuzS42GVesC78NL_e84o7Ysc',
  authDomain: 'pb-x-store.firebaseapp.com',
  databaseURL: 'https://pb-x-store-default-rtdb.firebaseio.com',
  projectId: 'pb-x-store',
  storageBucket: 'pb-x-store.firebasestorage.app',
  messagingSenderId: '740102526435',
  appId: '1:740102526435:web:5f3c1581ab4fd9bd8b7cd6',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

export function getAppStoreUrl(item: Pick<StoreApp, 'appUrl' | 'slug'>): string {
  if (item.appUrl && item.appUrl.trim().length > 0) {
    return item.appUrl.trim();
  }
  return `${LIVE_SITE_URL}/?app=${encodeURIComponent(item.slug || '')}`;
}

export function slugifyText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Returns YYYY-MM-DD based on accurate Firebase server timestamp (immune to wrong device clocks).
 */
export function getServerDateString(nowMs: number = Date.now(), offsetDays = 0): string {
  const d = new Date(nowMs);
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Strictly parses YYYY-MM-DD to the end of that calendar day (23:59:59.999).
 * Returns null for Lifetime apps or blank/invalid strings.
 */
export function parseExpiryEndTimestamp(
  expiryDate?: string | null,
  isLifetime?: boolean
): number | null {
  if (isLifetime === true) return null;
  if (!expiryDate || typeof expiryDate !== 'string' || expiryDate.trim() === '') {
    return null;
  }

  const trimmed = expiryDate.trim();
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!ymdMatch) {
    return null;
  }

  const year = Number(ymdMatch[1]);
  const month = Number(ymdMatch[2]);
  const day = Number(ymdMatch[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
  return Number.isNaN(endOfDay.getTime()) ? null : endOfDay.getTime();
}

/**
 * Returns true ONLY if the app is NOT Lifetime AND its strict YYYY-MM-DD expiry date
 * has completely passed according to real Firebase server time.
 */
export function isAppExpired(
  app: Pick<StoreApp, 'expiryDate' | 'isLifetime'>,
  serverNowMs: number
): boolean {
  const endTs = parseExpiryEndTimestamp(app.expiryDate, app.isLifetime);
  if (endTs === null) return false;
  return serverNowMs > endTs;
}

export function getExpiryStatus(
  expiryDate?: string | null,
  isLifetime?: boolean,
  serverNowMs: number = Date.now()
): {
  label: string;
  subLabel: string;
  isLifetime: boolean;
  tone: 'nominal' | 'warning' | 'expired';
} {
  const endTs = parseExpiryEndTimestamp(expiryDate, isLifetime);
  if (endTs === null) {
    return {
      label: 'Lifetime Access',
      subLabel: 'Never expires · Permanent listing',
      isLifetime: true,
      tone: 'nominal',
    };
  }

  const diffMs = endTs - serverNowMs;
  const formattedTarget = new Date(endTs).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  if (diffMs <= 0) {
    return {
      label: 'Expired',
      subLabel: `Expired on ${formattedTarget}`,
      isLifetime: false,
      tone: 'expired',
    };
  }

  const hoursLeft = Math.ceil(diffMs / (1000 * 60 * 60));
  if (hoursLeft <= 24) {
    return {
      label: 'Expires today',
      subLabel: `Auto-removes after ${formattedTarget}`,
      isLifetime: false,
      tone: 'warning',
    };
  }

  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (daysLeft <= 7) {
    return {
      label: `Expires in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`,
      subLabel: `Auto-removes after ${formattedTarget}`,
      isLifetime: false,
      tone: 'warning',
    };
  }

  return {
    label: `Expires in ${daysLeft} days`,
    subLabel: `Auto-removes after ${formattedTarget}`,
    isLifetime: false,
    tone: 'nominal',
  };
}

export function formatShortDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function translateAuthError(code?: string, fallback?: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many login attempts. Please wait a moment before trying again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/user-disabled':
      return 'This admin account has been disabled.';
    default:
      return fallback || 'Authentication failed. Please try again.';
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textArea);
    return ok;
  } catch {
    return false;
  }
}
