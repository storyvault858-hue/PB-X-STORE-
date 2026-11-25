import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  equalTo,
  onValue,
  orderByChild,
  query,
  ref,
  runTransaction,
  type Unsubscribe,
} from 'firebase/database';
import { ArrowLeft, PackageX, RefreshCw } from 'lucide-react';
import { copyToClipboard, db, isAppExpired } from './lib/firebase';
import type { StoreApp, ToastItem } from './types';
import { BrandEmblem3D } from './components/BrandEmblem3D';
import { SplashScreen } from './components/SplashScreen';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { ToastContainer } from './components/ToastContainer';
import { useTheme } from './context/ThemeContext';
import { StoreHomeView, type StorePlatformFilter } from './components/store/StoreHomeView';
import { StoreAppDetailView } from './components/store/StoreAppDetailView';
import { StorePasswordGate } from './components/store/StorePasswordGate';
import { StoreLegalModal, type LegalDocType } from './components/store/StoreLegalModal';

function readAppSlugFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('app');
    return slug && slug.trim().length > 0 ? slug.trim() : null;
  } catch {
    return null;
  }
}

export default function App() {
  const { playSound } = useTheme();

  // True Firebase server time (immune to wrong device clocks)
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [clockTick, setClockTick] = useState(() => Date.now());

  const [rawApps, setRawApps] = useState<StoreApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState('');
  const [syncKey, setSyncKey] = useState(0);

  const [activeSlug, setActiveSlug] = useState<string | null>(() => readAppSlugFromUrl());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPlatform, setSelectedPlatform] = useState<StorePlatformFilter>('All');

  const [unlockedMap, setUnlockedMap] = useState<Record<string, boolean>>({});
  const [legalDoc, setLegalDoc] = useState<LegalDocType>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const trackedOpenIdsRef = useRef<Set<string>>(new Set());

  const serverNow = clockTick + serverTimeOffset;

  const showToast = useCallback(
    (message: string, type: ToastItem['type'] = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      if (type === 'success') playSound('success');
      else if (type === 'error') playSound('error');
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3200);
    },
    [playSound]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // 1. Sync real Firebase Server Time offset
  useEffect(() => {
    const unsubOffset = onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
      const offset = Number(snap.val() || 0);
      setServerTimeOffset(Number.isFinite(offset) ? offset : 0);
      setClockTick(Date.now());
    });
    return () => unsubOffset();
  }, []);

  // 2. Real-time subscription to published apps in PB X Store Firebase RTDB
  useEffect(() => {
    let unsub: Unsubscribe | null = null;
    setSyncError('');

    const publishedQuery = query(
      ref(db, 'apps'),
      orderByChild('published'),
      equalTo(true)
    );

    unsub = onValue(
      publishedQuery,
      (snapshot) => {
        const list: StoreApp[] = [];
        snapshot.forEach((itemSnap) => {
          const val = itemSnap.val();
          if (val && typeof val === 'object') {
            list.push({
              ...val,
              id: itemSnap.key || '',
              name: String(val.name || 'Untitled App'),
              slug: String(val.slug || ''),
              version: String(val.version || '1.0.0'),
              apkUrl: String(val.apkUrl || ''),
              published: Boolean(val.published),
            });
          }
        });

        list.sort((a, b) => {
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime() || 0;
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
          return timeB - timeA;
        });

        setRawApps(list);
        setLoading(false);
      },
      (error) => {
        setSyncError(error.message || 'Unable to load store catalog.');
        setLoading(false);
        showToast('Could not connect to PB X Store catalog.', 'error');
      }
    );

    return () => {
      if (unsub) unsub();
    };
  }, [syncKey, showToast]);

  // 3. Strictly filter out expired builds using real Firebase server time
  //    (Lifetime apps NEVER expire; timed apps vanish cleanly at exact 00s)
  const activeApps = useMemo(
    () => rawApps.filter((app) => !isAppExpired(app, serverNow)),
    [rawApps, serverNow]
  );

  // Smart 1-second ticker when any app has an expiry countdown so seconds tick live
  const hasTimedApps = useMemo(
    () =>
      activeApps.some(
        (item) =>
          item.isLifetime !== true &&
          Boolean(
            (typeof item.expiryTimestamp === 'number' && item.expiryTimestamp > 0) ||
              (item.expiryDate && String(item.expiryDate).trim().length > 0)
          )
      ),
    [activeApps]
  );

  useEffect(() => {
    const interval = window.setInterval(
      () => setClockTick(Date.now()),
      hasTimedApps ? 1000 : 30000
    );
    return () => window.clearInterval(interval);
  }, [hasTimedApps]);

  // 4. URL deep-link routing (?app=<slug>) + Browser Back/Forward support
  useEffect(() => {
    const onPopState = () => {
      setActiveSlug(readAppSlugFromUrl());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openAppBySlug = useCallback((slug: string) => {
    setActiveSlug(slug);
    try {
      const nextUrl = `${window.location.pathname}?app=${encodeURIComponent(slug)}`;
      window.history.pushState({ app: slug }, '', nextUrl);
    } catch {
      // Ignore history restrictions in sandboxed frames
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goHome = useCallback(() => {
    setActiveSlug(null);
    try {
      window.history.pushState({}, '', window.location.pathname);
    } catch {
      // Ignore history restrictions
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const activeApp = useMemo(
    () => (activeSlug ? activeApps.find((a) => a.slug === activeSlug) || null : null),
    [activeApps, activeSlug]
  );

  // Sync page title dynamically
  useEffect(() => {
    if (activeApp) {
      document.title = `${activeApp.name} — PB X Store`;
    } else {
      document.title = 'PB X Store — Official App Distribution';
    }
  }, [activeApp]);

  // Check if password-protected app is unlocked in state or sessionStorage
  const isAppUnlocked = useCallback(
    (app: StoreApp) => {
      if (!app.password) return true;
      if (unlockedMap[app.id]) return true;
      try {
        return sessionStorage.getItem(`unlocked_${app.id}`) === 'true';
      } catch {
        return false;
      }
    },
    [unlockedMap]
  );

  const handleUnlockApp = useCallback(
    (app: StoreApp) => {
      try {
        sessionStorage.setItem(`unlocked_${app.id}`, 'true');
      } catch {
        // Ignore session storage errors
      }
      setUnlockedMap((prev) => ({ ...prev, [app.id]: true }));
      showToast(`${app.name} unlocked.`, 'success');
    },
    [showToast]
  );

  // Safe non-blocking live stat increment for Link Opens & Unique Devices
  useEffect(() => {
    if (!activeApp || !activeApp.id || !isAppUnlocked(activeApp)) return;
    if (trackedOpenIdsRef.current.has(activeApp.id)) return;
    trackedOpenIdsRef.current.add(activeApp.id);

    const deviceKey = `pbx_seen_device_${activeApp.id}`;
    let isNewDevice = false;
    try {
      if (!localStorage.getItem(deviceKey)) {
        isNewDevice = true;
        localStorage.setItem(deviceKey, '1');
      }
    } catch {
      // Ignore storage errors
    }

    // Attempt clean Firebase transaction (silently ignored if public RTDB writes are locked)
    void runTransaction(ref(db, `apps/${activeApp.id}`), (current) => {
      if (!current || typeof current !== 'object') return current;
      const nextOpens = (Number(current.linkOpens) || 0) + 1;
      const downloads = Number(current.downloads) || 0;
      const nextDevices = (Number(current.uniqueDevices) || 0) + (isNewDevice ? 1 : 0);
      const rate = nextOpens > 0 ? Math.min(100, Math.round((downloads / nextOpens) * 100)) : 0;
      return {
        ...current,
        linkOpens: nextOpens,
        uniqueDevices: nextDevices,
        successRate: `${rate}%`,
      };
    }).catch(() => {
      // RTDB security rules may allow admin-only writes — fail silently
    });
  }, [activeApp, isAppUnlocked]);

  const handleDownloadApp = useCallback(
    (app: StoreApp) => {
      showToast(`Downloading ${app.name}...`, 'success');

      void runTransaction(ref(db, `apps/${app.id}`), (current) => {
        if (!current || typeof current !== 'object') return current;
        const opens = Math.max(1, Number(current.linkOpens) || 1);
        const nextDownloads = (Number(current.downloads) || 0) + 1;
        const rate = Math.min(100, Math.round((nextDownloads / opens) * 100));
        return {
          ...current,
          downloads: nextDownloads,
          successRate: `${rate}%`,
        };
      }).catch(() => {
        // Silently ignore if public writes are restricted
      });
    },
    [showToast]
  );

  const handleCopyLink = useCallback(
    async (url: string) => {
      const ok = await copyToClipboard(url);
      if (ok) {
        showToast('Store link copied to clipboard.', 'success');
      } else {
        showToast('Could not copy automatically. Please copy manually.', 'error');
      }
    },
    [showToast]
  );

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <StoreLegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />

      <AnimatePresence>
        {loading && (
          <SplashScreen
            message="Loading PB X Store"
            subMessage="Syncing verified app releases..."
          />
        )}
      </AnimatePresence>

      <div className="min-h-[100dvh] w-full canvas-bg flex flex-col">
        {/* Seamless Sticky Header — unified with status bar & active theme */}
        <header
          className="sticky top-0 z-40 border-b border-[var(--border-subtle)] transition-colors duration-200"
          style={{
            backgroundColor: 'var(--canvas)',
            paddingTop: 'env(safe-area-inset-top, 0px)',
          }}
        >
          <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-2.5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goHome}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer text-left"
            >
              <BrandEmblem3D size="sm" />
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-[var(--text-primary)] leading-none whitespace-nowrap">
                PB X Store
              </span>
            </button>

            <ThemeSwitcher compact align="right" />
          </div>
        </header>

        {/* Main Storefront Content */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 pt-5 sm:pt-8 pb-12">
          {syncError && (
            <div className="surface-3d rounded-2xl p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-red-500/30">
              <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">
                Store sync error: {syncError}
              </p>
              <button
                type="button"
                onClick={() => setSyncKey((k) => k + 1)}
                className="btn-3d-secondary min-h-[36px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {!loading && !activeSlug && (
            <StoreHomeView
              apps={activeApps}
              serverNow={serverNow}
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              selectedPlatform={selectedPlatform}
              onSearchChange={setSearchQuery}
              onCategoryChange={setSelectedCategory}
              onPlatformChange={setSelectedPlatform}
              onOpenApp={openAppBySlug}
            />
          )}

          {!loading && activeSlug && activeApp && !isAppUnlocked(activeApp) && (
            <StorePasswordGate
              app={activeApp}
              onUnlock={() => handleUnlockApp(activeApp)}
              onBack={goHome}
            />
          )}

          {!loading && activeSlug && activeApp && isAppUnlocked(activeApp) && (
            <StoreAppDetailView
              app={activeApp}
              serverNow={serverNow}
              onBack={goHome}
              onCopyLink={handleCopyLink}
              onDownload={handleDownloadApp}
              onNotify={showToast}
            />
          )}

          {!loading && activeSlug && !activeApp && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className="py-12 sm:py-16 flex items-center justify-center"
            >
              <div className="surface-3d-lg rounded-3xl p-7 sm:p-9 max-w-sm w-full text-center space-y-4">
                <div
                  className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center border border-[var(--border-subtle)]"
                  style={{
                    background: 'var(--surface-inset)',
                    boxShadow: 'var(--shadow-inset)',
                  }}
                >
                  <PackageX className="w-6 h-6 text-[var(--text-muted)]" />
                </div>
                <div>
                  <h1 className="text-lg font-extrabold text-[var(--text-primary)]">
                    App Not Available
                  </h1>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                    This release does not exist, has expired, or has been unpublished by the publisher.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={goHome}
                  className="btn-3d-primary min-h-[42px] px-5 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Store</span>
                </button>
              </div>
            </motion.div>
          )}
        </main>

        {/* Clean Theme-Unified Footer with Working Legal & Support Modals */}
        <footer
          className="border-t border-[var(--border-subtle)] mt-auto transition-colors duration-200"
          style={{
            backgroundColor: 'var(--canvas)',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col items-center text-center space-y-3">
            <button
              type="button"
              onClick={goHome}
              className="flex items-center gap-2 cursor-pointer"
            >
              <BrandEmblem3D size="sm" />
              <span className="font-extrabold text-sm text-[var(--text-primary)]">
                PB X Store
              </span>
            </button>

            <p className="text-xs text-[var(--text-muted)]">
              Verified Android &amp; iOS App Distribution Platform
            </p>

            <div className="flex items-center justify-center flex-wrap gap-4 text-xs font-medium text-[var(--text-secondary)]">
              <button
                type="button"
                onClick={() => setLegalDoc('privacy')}
                className="hover:text-[var(--accent)] transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setLegalDoc('terms')}
                className="hover:text-[var(--accent)] transition-colors cursor-pointer"
              >
                Terms of Use
              </button>
              <button
                type="button"
                onClick={() => setLegalDoc('support')}
                className="hover:text-[var(--accent)] transition-colors cursor-pointer"
              >
                Support
              </button>
            </div>

            <p className="text-[11px] text-[var(--text-muted)]">
              &copy; {new Date().getFullYear()} PB X Store. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
