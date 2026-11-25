import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { onValue, push, ref, remove, set, update } from 'firebase/database';
import { AnimatePresence } from 'motion/react';
import { Box, LayoutGrid, LogOut, PlusCircle } from 'lucide-react';
import {
  auth,
  buildExpiryTimestamp,
  copyToClipboard,
  db,
  isAppExpired,
  LIVE_SITE_URL,
  slugifyText,
  translateAuthError,
} from './lib/firebase';
import { buildAllRatingsMap } from './lib/reviews';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import type {
  ActiveView,
  AppFormValues,
  AppRatingSummary,
  AppReview,
  ConfirmDialogState,
  StoreApp,
  ToastItem,
} from './types';
import { BrandEmblem3D } from './components/BrandEmblem3D';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { SplashScreen } from './components/SplashScreen';
import { LoginView } from './components/LoginView';
import { DashboardOverview } from './components/DashboardOverview';
import { BuildsListView } from './components/BuildsListView';
import { BuildFormView } from './components/BuildFormView';
import { ManageBuildView } from './components/ManageBuildView';
import { QRModal } from './components/QRModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer } from './components/ToastContainer';

const EMPTY_RATING_SUMMARY: AppRatingSummary = {
  averageRating: 0,
  totalReviews: 0,
  commentCount: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  reviews: [],
};

function parseTimestampMs(iso?: string): number {
  if (!iso) return 0;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function AdminControlCenter() {
  const { playSound } = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');

  const [apps, setApps] = useState<StoreApp[]>([]);
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [rootReviewsTree, setRootReviewsTree] = useState<Record<string, unknown> | null>(null);

  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState(false);
  const [updatingValidity, setUpdatingValidity] = useState(false);

  const [qrApp, setQrApp] = useState<StoreApp | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Firebase server-time synchronization for accurate auto-expiry
  const [serverOffset, setServerOffset] = useState(0);
  const [serverOffsetReady, setServerOffsetReady] = useState(false);
  const [serverNow, setServerNow] = useState(() => Date.now());
  const deletingExpiredRef = useRef<Set<string>>(new Set());

  const addToast = useCallback(
    (message: string, type: ToastItem['type'] = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
      if (type === 'success') playSound('success');
      if (type === 'error') playSound('error');

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3600);
    },
    [playSound]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // 1. Auth session observer
  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthReady(true);
        if (!currentUser) {
          setApps([]);
          setRootReviewsTree(null);
          setAppsLoaded(false);
          setSelectedAppId(null);
          setEditingAppId(null);
          setActiveView('dashboard');
        }
      },
      (err) => {
        setAuthError(translateAuthError(err?.name, err?.message));
        setAuthReady(true);
      }
    );
    return () => unsub();
  }, []);

  // 2. Firebase server time offset subscription
  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsub = onValue(
      offsetRef,
      (snap) => {
        const offset = Number(snap.val()) || 0;
        setServerOffset(offset);
        setServerNow(Date.now() + offset);
        setServerOffsetReady(true);
      },
      () => {
        setServerOffsetReady(true);
      }
    );
    return () => unsub();
  }, []);

  // Tick serverNow cleanly for live countdowns & exact expiry checks
  const hasTimedApps = useMemo(
    () => apps.some((item) => !item.isLifetime && (item.expiryTimestamp || item.expiryDate)),
    [apps]
  );

  useEffect(() => {
    const intervalMs = hasTimedApps ? 1000 : 15000;
    const timer = window.setInterval(() => {
      setServerNow(Date.now() + serverOffset);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [serverOffset, hasTimedApps]);

  // 3. Live Realtime Database subscription for /apps and optional /reviews
  useEffect(() => {
    if (!user) return;

    const appsRef = ref(db, 'apps');
    const unsubApps = onValue(
      appsRef,
      (snapshot) => {
        const raw = snapshot.val() as Record<string, Record<string, unknown>> | null;
        if (!raw || typeof raw !== 'object') {
          setApps([]);
          setAppsLoaded(true);
          return;
        }

        const list: StoreApp[] = Object.entries(raw)
          .filter(([, val]) => val && typeof val === 'object')
          .map(([id, val]) => {
            const record = val as Partial<StoreApp>;
            const hasExpiry = Boolean(
              record.isLifetime !== true &&
                ((typeof record.expiryTimestamp === 'number' && record.expiryTimestamp > 0) ||
                  (typeof record.expiryDate === 'string' && record.expiryDate.trim().length > 0))
            );
            return {
              ...record,
              id,
              name: String(record.name || 'Untitled App'),
              slug: String(record.slug || id),
              version: String(record.version || '1.0.0'),
              apkUrl: String(record.apkUrl || ''),
              published: record.published !== false,
              isLifetime: record.isLifetime === true ? true : !hasExpiry,
              downloads: Number(record.downloads) || 0,
              linkOpens: Number(record.linkOpens) || 0,
              uniqueDevices: Number(record.uniqueDevices) || 0,
            } as StoreApp;
          })
          .sort((a, b) => {
            const timeA = parseTimestampMs(a.updatedAt || a.createdAt);
            const timeB = parseTimestampMs(b.updatedAt || b.createdAt);
            return timeB - timeA;
          });

        setApps(list);
        setAppsLoaded(true);
      },
      (error) => {
        setAppsLoaded(true);
        addToast(error.message || 'Failed to sync applications from Firebase.', 'error');
      }
    );

    // Optional top-level /reviews node (silently ignored if rules don't expose it)
    const reviewsRef = ref(db, 'reviews');
    const unsubReviews = onValue(
      reviewsRef,
      (snapshot) => {
        const val = snapshot.val();
        setRootReviewsTree(val && typeof val === 'object' ? (val as Record<string, unknown>) : null);
      },
      () => {
        setRootReviewsTree(null);
      }
    );

    return () => {
      unsubApps();
      unsubReviews();
    };
  }, [user, addToast]);

  // 4. Server-time-verified auto-expiry cleanup (Lifetime apps are NEVER deleted)
  useEffect(() => {
    if (!user || !appsLoaded || !serverOffsetReady) return;

    const expiredApps = apps.filter(
      (item) => !deletingExpiredRef.current.has(item.id) && isAppExpired(item, serverNow)
    );

    if (expiredApps.length === 0) return;

    expiredApps.forEach((item) => {
      deletingExpiredRef.current.add(item.id);
      void remove(ref(db, `apps/${item.id}`))
        .then(() => {
          addToast(`"${item.name}" expired and was automatically removed.`, 'info');
        })
        .catch(() => {
          deletingExpiredRef.current.delete(item.id);
        });
    });
  }, [user, apps, appsLoaded, serverOffsetReady, serverNow, addToast]);

  // Ratings computed exclusively for ManageBuildView (not shown on Dashboard or Builds list)
  const ratingsAggregate = useMemo(
    () => buildAllRatingsMap(apps, rootReviewsTree),
    [apps, rootReviewsTree]
  );

  const selectedApp = useMemo(
    () => (selectedAppId ? apps.find((item) => item.id === selectedAppId) || null : null),
    [apps, selectedAppId]
  );

  const editingApp = useMemo(
    () => (editingAppId ? apps.find((item) => item.id === editingAppId) || null : null),
    [apps, editingAppId]
  );

  // If currently managed app was deleted or expired, return safely to Builds
  useEffect(() => {
    if (activeView === 'manage' && appsLoaded && selectedAppId && !selectedApp) {
      setSelectedAppId(null);
      setActiveView('builds');
    }
  }, [activeView, appsLoaded, selectedAppId, selectedApp]);

  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  const navigateTo = (view: ActiveView) => {
    if (view !== 'add') {
      setEditingAppId(null);
    }
    if (view !== 'manage') {
      setSelectedAppId(null);
    }
    setActiveView(view);
    scrollToTop();
  };

  const handleOpenAdd = () => {
    setEditingAppId(null);
    setSelectedAppId(null);
    setActiveView('add');
    scrollToTop();
  };

  const handleManageApp = (id: string) => {
    setSelectedAppId(id);
    setEditingAppId(null);
    setActiveView('manage');
    scrollToTop();
  };

  const handleEditApp = (item: StoreApp) => {
    setEditingAppId(item.id);
    setActiveView('add');
    scrollToTop();
  };

  const handleLogin = async (email: string, password: string, remember: boolean) => {
    setAuthError('');
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      try {
        if (remember) {
          localStorage.setItem('pbx_saved_email', email);
        } else {
          localStorage.removeItem('pbx_saved_email');
        }
      } catch {
        // Ignore storage restrictions
      }
      addToast('Signed in to PB X Store Control Center.', 'success');
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : undefined;
      const fallback = err instanceof Error ? err.message : undefined;
      throw new Error(translateAuthError(code, fallback));
    }
  };

  const handleRequestLogout = () => {
    setConfirmDialog({
      open: true,
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of PB X Store Admin?',
      confirmLabel: 'Sign Out',
      danger: true,
      onConfirm: async () => {
        try {
          await signOut(auth);
          addToast('Signed out successfully.', 'info');
        } catch {
          addToast('Failed to sign out. Please try again.', 'error');
        }
      },
    });
  };

  const handleCopyLink = async (url: string) => {
    const ok = await copyToClipboard(url);
    if (ok) {
      addToast('Link copied to clipboard.', 'success');
    } else {
      addToast('Could not copy link automatically.', 'error');
    }
  };

  const handleSaveBuild = async (values: AppFormValues, editingId: string | null) => {
    const cleanName = values.name.trim();
    const cleanSlug = slugifyText(values.slug || cleanName);
    const cleanVersion = values.version.trim();
    const cleanApkUrl = values.apkUrl.trim();

    if (!cleanName || !cleanSlug || !cleanVersion || !cleanApkUrl) {
      addToast('Please complete App Name, Unique Slug, Version, and Download URL.', 'error');
      return;
    }

    const slugConflict = apps.some(
      (item) => item.slug.toLowerCase() === cleanSlug.toLowerCase() && item.id !== editingId
    );
    if (slugConflict) {
      addToast(`The slug "${cleanSlug}" is already in use by another build.`, 'error');
      return;
    }

    let isLifetime = values.expiryMode === 'lifetime';
    let expiryDate: string | null = null;
    let expiryTime: string | null = null;
    let expiryTimestamp: number | null = null;

    if (!isLifetime) {
      expiryDate = values.expiryDate.trim();
      expiryTime = values.expiryTime.trim() || '23:59';
      expiryTimestamp = buildExpiryTimestamp(expiryDate, expiryTime);
      if (!expiryTimestamp) {
        addToast('Please pick a valid expiry date and time.', 'error');
        return;
      }
      if (expiryTimestamp <= serverNow) {
        addToast('Expiry time must be in the future.', 'error');
        return;
      }
    }

    const aliasesArray = values.aliases
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const nowIso = new Date().toISOString();
    const appUrl = `${LIVE_SITE_URL}/?app=${encodeURIComponent(cleanSlug)}`;

    const payload = {
      name: cleanName,
      slug: cleanSlug,
      appUrl,
      platform: values.platform || 'Android',
      bundleId: values.bundleId.trim() || 'com.pbxstore.app',
      iconUrl: values.iconUrl.trim(),
      shortDescription: values.shortDescription.trim(),
      category: values.category.trim(),
      fullDescription: values.fullDescription.trim(),
      version: cleanVersion,
      fileSize: values.fileSize.trim(),
      androidMinVersion: values.androidMinVersion.trim(),
      apkUrl: cleanApkUrl,
      password: values.password.trim() || null,
      aliases: aliasesArray,
      published: Boolean(values.published),
      isLifetime,
      expiryDate,
      expiryTime,
      expiryTimestamp,
      updatedAt: nowIso,
    };

    setSaving(true);
    try {
      if (editingId) {
        await update(ref(db, `apps/${editingId}`), payload);
        addToast(`Updated "${cleanName}" successfully.`, 'success');
        setEditingAppId(null);
        setSelectedAppId(editingId);
        setActiveView('manage');
        scrollToTop();
      } else {
        const newRef = push(ref(db, 'apps'));
        const newId = newRef.key;
        if (!newId) {
          throw new Error('Could not generate build ID.');
        }
        await set(newRef, {
          ...payload,
          id: newId,
          createdAt: nowIso,
          downloads: 0,
          linkOpens: 0,
          uniqueDevices: 0,
          successRate: '0%',
        });
        addToast(`Published "${cleanName}" to PB X Store.`, 'success');
        setEditingAppId(null);
        setSelectedAppId(newId);
        setActiveView('manage');
        scrollToTop();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save build.';
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (item: StoreApp) => {
    setTogglingPublish(true);
    try {
      const nextState = !item.published;
      await update(ref(db, `apps/${item.id}`), {
        published: nextState,
        updatedAt: new Date().toISOString(),
      });
      addToast(
        nextState ? `"${item.name}" is now live in PB X Store.` : `"${item.name}" moved to Draft.`,
        'success'
      );
    } catch {
      addToast('Failed to update publish status.', 'error');
    } finally {
      setTogglingPublish(false);
    }
  };

  const handleMakeLifetime = async (item: StoreApp) => {
    setUpdatingValidity(true);
    try {
      await update(ref(db, `apps/${item.id}`), {
        isLifetime: true,
        expiryDate: null,
        expiryTime: null,
        expiryTimestamp: null,
        updatedAt: new Date().toISOString(),
      });
      addToast(`"${item.name}" upgraded to Lifetime access.`, 'success');
    } catch {
      addToast('Could not update validity.', 'error');
    } finally {
      setUpdatingValidity(false);
    }
  };

  const handleDeleteApp = (item: StoreApp) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Application',
      message: `Permanently delete "${item.name}" (v${item.version}) from PB X Store? Its download link and reviews will stop working immediately.`,
      confirmLabel: 'Delete Build',
      danger: true,
      onConfirm: async () => {
        try {
          await remove(ref(db, `apps/${item.id}`));
          // Clean up optional root reviews node if present
          void remove(ref(db, `reviews/${item.id}`)).catch(() => {});
          addToast(`Deleted "${item.name}".`, 'success');
          if (selectedAppId === item.id) {
            setSelectedAppId(null);
            setActiveView('builds');
          }
        } catch {
          addToast('Failed to delete application.', 'error');
        }
      },
    });
  };

  const handleDeleteReview = (review: AppReview) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Review',
      message: `Remove this ${review.rating}-star review by "${review.author}"? This action cannot be undone.`,
      confirmLabel: 'Delete Review',
      danger: true,
      onConfirm: async () => {
        try {
          const targetPath =
            review.sourcePath === 'root'
              ? `reviews/${review.appId}/${review.id}`
              : `apps/${review.appId}/reviews/${review.id}`;
          await remove(ref(db, targetPath));

          // Recompute summary counters on the app record so user storefront stays accurate
          const currentSummary = ratingsAggregate.byAppId[review.appId];
          if (currentSummary) {
            const remaining = currentSummary.reviews.filter((r) => r.id !== review.id);
            const nextCount = remaining.length;
            const nextAvg =
              nextCount > 0
                ? Math.round(
                    (remaining.reduce((sum, r) => sum + r.rating, 0) / nextCount) * 10
                  ) / 10
                : 0;
            void update(ref(db, `apps/${review.appId}`), {
              reviewCount: nextCount,
              averageRating: nextAvg,
            }).catch(() => {});
          }

          addToast('Review removed.', 'success');
        } catch {
          addToast('Failed to delete review.', 'error');
        }
      },
    });
  };

  // Strictly 3 Navigation Sections: Dashboard, Builds, Upload
  const navItems: {
    id: 'dashboard' | 'builds' | 'add';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'builds', label: 'Builds', icon: Box },
    { id: 'add', label: 'Upload', icon: PlusCircle },
  ];

  const isNavActive = (id: 'dashboard' | 'builds' | 'add') => {
    if (id === 'builds') {
      return activeView === 'builds' || activeView === 'manage';
    }
    return activeView === id;
  };

  const mobilePageTitle =
    activeView === 'dashboard'
      ? 'Dashboard'
      : activeView === 'builds'
        ? 'Builds'
        : activeView === 'add'
          ? editingApp
            ? 'Edit Build'
            : 'Upload'
          : selectedApp?.name || 'Manage Build';

  if (!authReady) {
    return (
      <>
        <SplashScreen
          message="Initializing Control Center"
          subMessage="Verifying PB X Store session..."
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <LoginView onLogin={handleLogin} externalError={authError} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full canvas-bg flex flex-col lg:flex-row relative">
      {/* Initial Sync Splash Overlay */}
      <AnimatePresence>
        {!appsLoaded && (
          <SplashScreen
            message="Syncing Store Catalog"
            subMessage="Loading live PB X Store builds..."
          />
        )}
      </AnimatePresence>

      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:shrink-0 lg:sticky lg:top-0 lg:h-[100dvh] border-r border-[var(--border-subtle)] p-5 justify-between bg-[var(--surface-sidebar)]">
        <div className="space-y-7">
          {/* Brand Lockup */}
          <div className="flex items-center gap-3 px-1">
            <BrandEmblem3D size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-extrabold tracking-tight text-[var(--text-primary)] truncate">
                PB X Store
              </p>
              <p className="text-[11px] font-medium text-[var(--text-muted)] truncate">
                Admin Control Center
              </p>
            </div>
          </div>

          {/* 3-Tab Navigation */}
          <nav aria-label="Primary navigation" className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => (item.id === 'add' ? handleOpenAdd() : navigateTo(item.id))}
                  className={`w-full min-h-[44px] px-3.5 rounded-xl text-sm font-semibold flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    active
                      ? 'btn-3d-primary'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.id === 'builds' && (
                    <span
                      className={`font-mono text-xs px-2 py-0.5 rounded-md tabular-nums ${
                        active
                          ? 'bg-white/20 text-current'
                          : 'bg-[var(--surface-inset)] text-[var(--text-muted)]'
                      }`}
                    >
                      {apps.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Theme & Account Controls */}
        <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
          <ThemeSwitcher />

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">Administrator</p>
              <p className="text-[11px] text-[var(--text-muted)] truncate font-mono">
                {user.email || 'Signed In'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRequestLogout}
              aria-label="Sign out"
              title="Sign Out"
              className="btn-3d-secondary w-9 h-9 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Sticky Header */}
        <header
          className="lg:hidden sticky top-0 z-30 border-b border-[var(--border-subtle)] px-4 pb-3 flex items-center justify-between gap-2"
          style={{
            backgroundColor: 'var(--canvas)',
            paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              aria-label="Go to Dashboard"
              className="shrink-0 cursor-pointer"
            >
              <BrandEmblem3D size="sm" />
            </button>
            <span className="text-sm font-extrabold tracking-tight text-[var(--text-primary)] truncate">
              {mobilePageTitle}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <ThemeSwitcher compact align="right" />
            <button
              type="button"
              onClick={handleRequestLogout}
              aria-label="Sign out"
              title="Sign Out"
              className="btn-3d-secondary min-h-[34px] min-w-[34px] sm:min-h-[38px] sm:min-w-[38px] rounded-xl flex items-center justify-center text-red-600 dark:text-red-400 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Content Stage (natural full-page scroll + generous bottom clearance for mobile nav) */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-5 sm:pt-7 pb-28 lg:pb-12">
          {activeView === 'dashboard' && (
            <DashboardOverview
              apps={apps}
              onOpenAdd={handleOpenAdd}
              onViewBuilds={() => navigateTo('builds')}
              onManageApp={handleManageApp}
            />
          )}

          {activeView === 'builds' && (
            <BuildsListView
              apps={apps}
              serverNow={serverNow}
              onOpenAdd={handleOpenAdd}
              onManageApp={handleManageApp}
              onCopyLink={handleCopyLink}
              onShowQR={(item) => setQrApp(item)}
            />
          )}

          {activeView === 'add' && (
            <BuildFormView
              editingApp={editingApp}
              saving={saving}
              serverNow={serverNow}
              onSubmit={handleSaveBuild}
              onCancel={() => {
                if (editingApp) {
                  setEditingAppId(null);
                  setSelectedAppId(editingApp.id);
                  setActiveView('manage');
                } else {
                  navigateTo('builds');
                }
              }}
            />
          )}

          {activeView === 'manage' && selectedApp && (
            <ManageBuildView
              app={selectedApp}
              ratingSummary={ratingsAggregate.byAppId[selectedApp.id] || EMPTY_RATING_SUMMARY}
              serverNow={serverNow}
              togglingPublish={togglingPublish}
              updatingValidity={updatingValidity}
              onBack={() => navigateTo('builds')}
              onEdit={handleEditApp}
              onShowQR={(item) => setQrApp(item)}
              onCopyLink={handleCopyLink}
              onTogglePublish={handleTogglePublish}
              onMakeLifetime={handleMakeLifetime}
              onDelete={handleDeleteApp}
              onDeleteReview={handleDeleteReview}
            />
          )}
        </main>
      </div>

      {/* Mobile Fixed 3-Tab Bottom Navigation Bar */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border-subtle)] backdrop-blur-xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--canvas) 92%, transparent)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="grid grid-cols-3 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavActive(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => (item.id === 'add' ? handleOpenAdd() : navigateTo(item.id))}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 min-h-[58px] transition-colors cursor-pointer ${
                  active
                    ? 'text-[var(--text-primary)] font-bold'
                    : 'text-[var(--text-muted)] font-medium'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    active ? 'scale-110 text-[var(--accent)]' : ''
                  }`}
                />
                <span className="text-[11px] leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals & Toasts */}
      <QRModal app={qrApp} onClose={() => setQrApp(null)} onCopyLink={handleCopyLink} />
      <ConfirmModal dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AdminControlCenter />
    </ThemeProvider>
  );
}
