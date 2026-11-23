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
 * Computes exact expiry epoch timestamp (ms) from YYYY-MM-DD and optional HH:MM.
 * - If time is omitted or '23:59', expires at 23:59:59.999 of that date (end of full day).
 * - If a specific HH:MM is set (e.g. '15:30'), expires at the exact second 15:30:00.000.
 * Returns null if date is blank or invalid.
 */
export function buildExpiryTimestamp(
  expiryDate?: string | null,
  expiryTime?: string | null
): number | null {
  if (!expiryDate || typeof expiryDate !== 'string' || expiryDate.trim() === '') {
    return null;
  }

  const trimmedDate = expiryDate.trim();
  const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedDate);
  if (!ymdMatch) {
    return null;
  }

  const year = Number(ymdMatch[1]);
  const month = Number(ymdMatch[2]);
  const day = Number(ymdMatch[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const trimmedTime = typeof expiryTime === 'string' ? expiryTime.trim() : '';
  const hmMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmedTime);

  let targetDate: Date;
  if (hmMatch) {
    const hours = Number(hmMatch[1]);
    const minutes = Number(hmMatch[2]);
    const hasSeconds = hmMatch[3] !== undefined;
    const seconds = hasSeconds ? Number(hmMatch[3]) : hours === 23 && minutes === 59 ? 59 : 0;
    const millis = hours === 23 && minutes === 59 && !hasSeconds ? 999 : 0;
    if (hours > 23 || minutes > 59 || seconds > 59) {
      return null;
    }
    targetDate = new Date(year, month - 1, day, hours, minutes, seconds, millis);
  } else {
    targetDate = new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  // Ensure calendar date didn't overflow (e.g. Feb 30)
  if (
    Number.isNaN(targetDate.getTime()) ||
    targetDate.getFullYear() !== year ||
    targetDate.getMonth() !== month - 1 ||
    targetDate.getDate() !== day
  ) {
    return null;
  }

  return targetDate.getTime();
}

/**
 * Strictly resolves the exact expiry timestamp (ms) for an app.
 * - Lifetime apps ALWAYS return null (can NEVER expire or be deleted).
 * - Uses saved exact expiryTimestamp (ms) when present; falls back to expiryDate + expiryTime.
 */
export function parseExpiryEndTimestamp(
  expiryDate?: string | null,
  isLifetime?: boolean,
  expiryTimestamp?: number | null,
  expiryTime?: string | null
): number | null {
  if (isLifetime === true) return null;

  if (
    typeof expiryTimestamp === 'number' &&
    Number.isFinite(expiryTimestamp) &&
    expiryTimestamp > 0
  ) {
    return expiryTimestamp;
  }

  return buildExpiryTimestamp(expiryDate, expiryTime);
}

/**
 * Returns true ONLY if:
 * 1. The app is NOT Lifetime (`isLifetime !== true`), AND
 * 2. It has a valid expiry timestamp (`endTs !== null`), AND
 * 3. True Firebase server time has reached or passed the exact expiry instant (`serverNowMs >= endTs`).
 * If even 1 second remains (`endTs - serverNowMs > 0`), this strictly returns false.
 */
export function isAppExpired(
  app: Pick<StoreApp, 'expiryDate' | 'isLifetime' | 'expiryTimestamp' | 'expiryTime'>,
  serverNowMs: number
): boolean {
  if (app.isLifetime === true) return false;
  const endTs = parseExpiryEndTimestamp(
    app.expiryDate,
    app.isLifetime,
    app.expiryTimestamp,
    app.expiryTime
  );
  if (endTs === null) return false;
  return serverNowMs >= endTs;
}

export function getExpiryStatus(
  expiryDate?: string | null,
  isLifetime?: boolean,
  serverNowMs: number = Date.now(),
  expiryTimestamp?: number | null,
  expiryTime?: string | null
): {
  label: string;
  subLabel: string;
  isLifetime: boolean;
  tone: 'nominal' | 'warning' | 'expired';
} {
  const endTs = parseExpiryEndTimestamp(expiryDate, isLifetime, expiryTimestamp, expiryTime);
  if (endTs === null) {
    return {
      label: 'Lifetime Access',
      subLabel: 'Never expires · Permanent listing',
      isLifetime: true,
      tone: 'nominal',
    };
  }

  const diffMs = endTs - serverNowMs;
  const targetDateObj = new Date(endTs);
  const formattedTarget = targetDateObj.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (diffMs <= 0) {
    return {
      label: 'Expired',
      subLabel: `Expired at ${formattedTarget}`,
      isLifetime: false,
      tone: 'expired',
    };
  }

  const totalSeconds = Math.ceil(diffMs / 1000);
  if (totalSeconds < 86400) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    const countdown =
      hrs > 0
        ? `${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s`
        : mins > 0
          ? `${pad(mins)}m ${pad(secs)}s`
          : `${pad(secs)}s`;

    return {
      label: `Expires in ${countdown}`,
      subLabel: `Auto-removes at ${formattedTarget}`,
      isLifetime: false,
      tone: 'warning',
    };
  }

  const days = Math.floor(totalSeconds / 86400);
  const remHours = Math.floor((totalSeconds % 86400) / 3600);

  if (days < 7) {
    return {
      label: remHours > 0 ? `Expires in ${days}d ${remHours}h` : `Expires in ${days} ${days === 1 ? 'day' : 'days'}`,
      subLabel: `Auto-removes at ${formattedTarget}`,
      isLifetime: false,
      tone: 'warning',
    };
  }

  return {
    label: `Expires in ${days} days`,
    subLabel: `Auto-removes at ${formattedTarget}`,
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
