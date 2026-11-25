import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  onValue,
  push,
  ref,
  remove,
  set,
  update,
  type Unsubscribe,
} from 'firebase/database';
import {
  Box,
  LayoutGrid,
  LogOut,
  PlusCircle,
} from 'lucide-react';
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
import type {
  ActiveView,
  AppFormValues,
  AppReview,
  ConfirmDialogState,
  StoreApp,
  ToastItem,
} from './types';
import { BrandEmblem3D } from './components/BrandEmblem3D';
import { BuildFormView } from './components/BuildFormView';
import { BuildsListView } from './components/BuildsListView';
import { ConfirmModal } from './components/ConfirmModal';
import { DashboardOverview } from './components/DashboardOverview';
import { LoginView } from './components/LoginView';
import { ManageBuildView } from './components/ManageBuildView';
import { QRModal } from './components/QRModal';
import { SplashScreen } from './components/SplashScreen';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { ToastContainer } from './components/ToastContainer';
import { useTheme } from './context/ThemeContext';

const EMPTY_RATING_SUMMARY = {
  averageRating: 0,
  totalReviews: 0,
  commentCount: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  reviews: [] as AppReview[],
};

export default function App() {
  const { playSound } = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const [apps, setApps] = useState<StoreApp[]>([]);
  const [rootReviewsTree, setRootReviewsTree] = useState<Record<string, unknown> | null>(null);

  // True Firebase server time (immune to wrong phone/PC clocks)
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [clockTick, setClockTick] = useState(() => Date.now());

  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [editingApp, setEditingApp] = useState<StoreApp | null>(null);

  const [savingBuild, setSavingBuild] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState(false);
  const [updatingValidity, setUpdatingValidity] = useState(false);

  const [qrApp, setQrApp] = useState<StoreApp | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const deletingExpiredIdsRef = useRef<Set<string>>(new Set());
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

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (!currentUser) {
        setApps([]);
        setRootReviewsTree(null);
        setDataReady(false);
        setSelectedAppId(null);
        setEditingApp(null);
        setActiveView('dashboard');
      }
    });
    return () => unsub();
  }, []);

  // 2. Sync real Firebase Server Time offset
  useEffect(() => {
    const unsubOffset = onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
      const offset = Number(snap.val() || 0);
      setServerTimeOffset(Number.isFinite(offset) ? offset : 0);
      setClockTick(Date.now());
    });
    return () => unsubOffset();
  }, []);

  // 3. Real-time Firebase RTDB subscription for Apps + optional root Reviews node
  useEffect(() => {
    if (!user) return;
    let unsubApps: Unsubscribe | null = null;
    let unsubReviews: Unsubscribe | null = null;

    unsubApps = onValue(
      ref(db, 'apps'),
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

        setApps(list);
        setDataReady(true);
      },
      (error) => {
        setDataReady(true);
        showToast(error.message || 'Unable to sync PB X Store database.', 'error');
      }
    );

    unsubReviews = onValue(
      ref(db, 'reviews'),
      (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          setRootReviewsTree(val as Record<string, unknown>);
        } else {
          setRootReviewsTree(null);
        }
      },
      () => {
        setRootReviewsTree(null);
      }
    );

    return () => {
      if (unsubApps) unsubApps();
      if (unsubReviews) unsubReviews();
    };
  }, [user, showToast]);

  // 4. Smart 1-second ticker when any timed app is active
  const hasTimedApps = useMemo(
    () =>
      apps.some(
        (item) =>
          item.isLifetime !== true &&
          Boolean(
            (typeof item.expiryTimestamp === 'number' && item.expiryTimestamp > 0) ||
              (item.expiryDate && String(item.expiryDate).trim().length > 0)
          )
      ),
    [apps]
  );

  useEffect(() => {
    const interval = window.setInterval(
      () => setClockTick(Date.now()),
      hasTimedApps ? 1000 : 30000
    );
    return () => window.clearInterval(interval);
  }, [hasTimedApps]);

  // 5. Server-Time Verified Auto-Expiry Removal
  useEffect(() => {
    if (!user || apps.length === 0) return;

    const expiredApps = apps.filter(
      (item) =>
        isAppExpired(item, serverNow) && !deletingExpiredIdsRef.current.has(item.id)
    );

    if (expiredApps.length === 0) return;

    for (const item of expiredApps) {
      deletingExpiredIdsRef.current.add(item.id);
      void remove(ref(db, `apps/${item.id}`))
        .then(() => {
          showToast(`"${item.name}" expired and was automatically removed.`, 'info');
          if (selectedAppId === item.id) {
            setSelectedAppId(null);
            setActiveView('builds');
          }
        })
        .catch(() => {
          deletingExpiredIdsRef.current.delete(item.id);
        });
    }
  }, [apps, serverNow, user, selectedAppId, showToast]);

  const ratingsAggregate = useMemo(
    () => buildAllRatingsMap(apps, rootReviewsTree),
    [apps, rootReviewsTree]
  );

  const selectedApp = useMemo(
    () => (selectedAppId ? apps.find((a) => a.id === selectedAppId) || null : null),
    [apps, selectedAppId]
  );

  useEffect(() => {
    if (activeView === 'manage' && selectedAppId && !selectedApp && dataReady) {
      setSelectedAppId(null);
      setActiveView('builds');
    }
  }, [activeView, selectedAppId, selectedApp, dataReady]);

  const navigateTo = useCallback((view: ActiveView) => {
    setActiveView(view);
    if (view !== 'add') {
      setEditingApp(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleLogin = useCallback(
    async (email: string, password: string, remember: boolean) => {
      try {
        await signInWithEmailAndPassword(auth, email, password);
        try {
          if (remember) {
            localStorage.setItem('pbx_saved_email', email);
          } else {
            localStorage.removeItem('pbx_saved_email');
          }
        } catch {
          // Ignore storage errors
        }
        playSound('success');
      } catch (err: unknown) {
        const firebaseErr = err as { code?: string; message?: string };
        playSound('error');
        throw new Error(translateAuthError(firebaseErr?.code, firebaseErr?.message));
      }
    },
    [playSound]
  );

  const handleSignOut = useCallback(() => {
    setConfirmDialog({
      open: true,
      title: 'Sign Out',
      message: 'Sign out of PB X Store Admin Control Center?',
      confirmLabel: 'Sign Out',
      danger: true,
      onConfirm: async () => {
        try {
          await signOut(auth);
          showToast('Signed out successfully.', 'info');
        } catch {
          showToast('Unable to sign out right now.', 'error');
        }
      },
    });
  }, [showToast]);

  const handleCopyLink = useCallback(
    async (url: string) => {
      const ok = await copyToClipboard(url);
      if (ok) {
        showToast('Copied to clipboard.', 'success');
      } else {
        showToast('Could not copy automatically. Please copy manually.', 'error');
      }
    },
    [showToast]
  );

  const handleOpenAdd = useCallback(() => {
    setEditingApp(null);
    setActiveView('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleManageApp = useCallback((id: string) => {
    setSelectedAppId(id);
    setEditingApp(null);
    setActiveView('manage');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleEditApp = useCallback((app: StoreApp) => {
    setEditingApp(app);
    setActiveView('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSubmitBuild = useCallback(
    async (values: AppFormValues, editingId: string | null) => {
      const cleanName = values.name.trim();
      const cleanSlug = slugifyText(values.slug || values.name);
      const cleanVersion = values.version.trim();
      const cleanApkUrl = values.apkUrl.trim();

      if (!cleanName || !cleanSlug || !cleanVersion || !cleanApkUrl) {
        showToast('Please fill in App Name, Slug, Version, and Download URL.', 'error');
        return;
      }

      const isLifetime = values.expiryMode === 'lifetime';
      let expiryDate: string | null = null;
      let expiryTime: string | null = null;
      let expiryTimestamp: number | null = null;

      if (!isLifetime) {
        expiryDate = values.expiryDate.trim() || null;
        expiryTime = values.expiryTime.trim() || '23:59';
        expiryTimestamp = buildExpiryTimestamp(expiryDate, expiryTime);
        if (!expiryDate || !expiryTimestamp) {
          showToast('Please choose a valid expiry date and time.', 'error');
          return;
        }
        if (expiryTimestamp <= serverNow) {
          showToast('Expiry date & time must be in the future.', 'error');
          return;
        }
      }

      const duplicate = apps.find(
        (item) => item.slug.toLowerCase() === cleanSlug.toLowerCase() && item.id !== editingId
      );
      if (duplicate) {
        showToast(`Slug "${cleanSlug}" is already used by "${duplicate.name}".`, 'error');
        return;
      }

      setSavingBuild(true);
      try {
        const nowIso = new Date(serverNow).toISOString();
        const aliasesArray = values.aliases
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        const basePayload = {
          name: cleanName,
          slug: cleanSlug,
          appUrl: `${LIVE_SITE_URL}/?app=${encodeURIComponent(cleanSlug)}`,
          platform: values.platform,
          bundleId: values.bundleId.trim() || 'com.pbxstore.app',
          isLifetime,
          expiryDate,
          expiryTime,
          expiryTimestamp,
          iconUrl: values.iconUrl.trim(),
          shortDescription: values.shortDescription.trim(),
          category: values.category.trim(),
          fullDescription: values.fullDescription.trim(),
          version: cleanVersion,
          fileSize: values.fileSize.trim(),
          androidMinVersion: values.androidMinVersion.trim() || 'Varies',
          apkUrl: cleanApkUrl,
          password: values.password.trim() || null,
          aliases: aliasesArray,
          published: values.published,
          updatedAt: nowIso,
        };

        if (editingId) {
          await update(ref(db, `apps/${editingId}`), basePayload);
          showToast(`"${cleanName}" updated successfully.`, 'success');
          setEditingApp(null);
          setSelectedAppId(editingId);
          setActiveView('manage');
        } else {
          const newRef = push(ref(db, 'apps'));
          await set(newRef, {
            ...basePayload,
            createdAt: nowIso,
            downloads: 0,
            linkOpens: 0,
            uniqueDevices: 0,
            successRate: '0%',
          });
          showToast(`"${cleanName}" published to PB X Store!`, 'success');
          setSelectedAppId(newRef.key);
          setActiveView('manage');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save application.';
        showToast(msg, 'error');
      } finally {
        setSavingBuild(false);
      }
    },
    [apps, serverNow, showToast]
  );

  const handleTogglePublish = useCallback(
    async (app: StoreApp) => {
      setTogglingPublish(true);
      try {
        const nextPublished = !app.published;
        await update(ref(db, `apps/${app.id}`), {
          published: nextPublished,
          updatedAt: new Date(serverNow).toISOString(),
        });
        showToast(
          nextPublished
            ? `"${app.name}" is now Live on PB X Store.`
            : `"${app.name}" moved to Draft.`,
          'success'
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to update status.';
        showToast(msg, 'error');
      } finally {
        setTogglingPublish(false);
      }
    },
    [serverNow, showToast]
  );

  const handleMakeLifetime = useCallback(
    async (app: StoreApp) => {
      setUpdatingValidity(true);
      try {
        await update(ref(db, `apps/${app.id}`), {
          isLifetime: true,
          expiryDate: null,
          expiryTime: null,
          expiryTimestamp: null,
          updatedAt: new Date(serverNow).toISOString(),
        });
        showToast(`"${app.name}" is now set to Lifetime Access.`, 'success');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to update validity.';
        showToast(msg, 'error');
      } finally {
        setUpdatingValidity(false);
      }
    },
    [serverNow, showToast]
  );

  const handleDeleteApp = useCallback(
    (app: StoreApp) => {
      setConfirmDialog({
        open: true,
        title: 'Delete Application',
        message: `Permanently delete "${app.name}" (v${app.version}) from PB X Store? This action cannot be undone.`,
        confirmLabel: 'Delete Permanently',
        danger: true,
        onConfirm: async () => {
          try {
            await remove(ref(db, `apps/${app.id}`));
            showToast(`"${app.name}" has been deleted.`, 'success');
            if (selectedAppId === app.id) {
              setSelectedAppId(null);
              setActiveView('builds');
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to delete build.';
            showToast(msg, 'error');
          }
        },
      });
    },
    [selectedAppId, showToast]
  );

  const handleDeleteReview = useCallback(
    (review: AppReview) => {
      setConfirmDialog({
        open: true,
        title: 'Delete Review',
        message: `Remove this ${review.rating}-star review by "${review.author}" on "${review.appName}"?`,
        confirmLabel: 'Delete Review',
        danger: true,
        onConfirm: async () => {
          try {
            if (review.sourcePath === 'nested') {
              await remove(ref(db, `apps/${review.appId}/reviews/${review.id}`));
            } else {
              await remove(ref(db, `reviews/${review.appId}/${review.id}`));
            }
            showToast('Review removed successfully.', 'success');
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unable to delete review.';
            showToast(msg, 'error');
          }
        },
      });
    },
    [showToast]
  );

  // Exactly 3 main sections: Dashboard, Builds, Upload
  const navItems: { id: ActiveView; label: string; icon: typeof LayoutGrid; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'builds', label: 'Builds', icon: Box, badge: apps.length },
    { id: 'add', label: 'Upload', icon: PlusCircle },
  ];

  const activeNavId: ActiveView = activeView === 'manage' ? 'builds' : activeView;

  const mobilePageTitle =
    activeView === 'dashboard'
      ? 'Dashboard'
      : activeView === 'builds'
        ? 'All Builds'
        : activeView === 'add'
          ? editingApp
            ? 'Edit Build'
            : 'Upload Build'
          : selectedApp?.name || 'Manage Build';

  if (!authReady) {
    return (
      <SplashScreen
        message="Initializing Control Center"
        subMessage="Checking administrator session..."
      />
    );
  }

  if (!user) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <LoginView onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <QRModal
        app={qrApp}
        onClose={() => setQrApp(null)}
        onCopyLink={handleCopyLink}
      />
      <ConfirmModal
        dialog={confirmDialog}
        onClose={() => setConfirmDialog(null)}
      />

      <AnimatePresence>
        {!dataReady && (
          <SplashScreen
            message="Syncing PB X Store"
            subMessage="Loading live builds and user reviews..."
          />
        )}
      </AnimatePresence>

      <div className="min-h-[100dvh] w-full canvas-bg flex flex-col lg:flex-row">
        {/* Desktop Persistent Left Sidebar */}
        <aside
          className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:left-0 z-30 border-r border-[var(--border-subtle)] p-5 justify-between transition-colors duration-200"
          style={{ backgroundColor: 'var(--canvas)' }}
        >
          <div className="space-y-6">
            {/* Brand Lockup */}
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className="flex items-center gap-3 text-left w-full px-1 cursor-pointer"
            >
              <BrandEmblem3D size="sm" />
              <div className="min-w-0">
                <p className="font-extrabold text-base tracking-tight text-[var(--text-primary)] leading-tight truncate">
                  PB X Store
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  Admin Control Center
                </p>
              </div>
            </button>

            {/* Primary Navigation */}
            <nav aria-label="Primary navigation" className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeNavId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      item.id === 'add' ? handleOpenAdd() : navigateTo(item.id)
                    }
                    className={`w-full min-h-[44px] px-3.5 rounded-xl text-sm font-semibold flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      active
                        ? 'btn-3d-primary'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-inset)]'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span
                        className={`font-mono text-xs tabular-nums ${
                          active ? 'opacity-90' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Controls: Theme, Sound & Sign Out */}
          <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
            <ThemeSwitcher />

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                  Administrator
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">
                  {user.email || 'Authenticated'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign Out"
                className="btn-3d-secondary w-9 h-9 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400 shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Sticky Top Header */}
        <header
          className="lg:hidden sticky top-0 z-40 border-b border-[var(--border-subtle)] transition-colors duration-200"
          style={{
            backgroundColor: 'var(--canvas)',
            paddingTop: 'env(safe-area-inset-top, 0px)',
          }}
        >
          <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigateTo('dashboard')}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer"
            >
              <BrandEmblem3D size="sm" />
              <span className="font-extrabold text-sm tracking-tight text-[var(--text-primary)] truncate">
                {mobilePageTitle}
              </span>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <ThemeSwitcher compact align="right" />
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign Out"
                className="btn-3d-secondary min-h-[34px] min-w-[34px] px-2 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Scrollable Content Viewport */}
        <main className="flex-1 w-full lg:pl-72">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-44 sm:pb-40 lg:pb-12">
            {activeView === 'dashboard' && (
              <DashboardOverview
                apps={apps}
                ratingsByAppId={ratingsAggregate.byAppId}
                overallAverage={ratingsAggregate.overallAverage}
                totalReviews={ratingsAggregate.totalReviews}
                totalComments={ratingsAggregate.totalComments}
                onOpenAdd={handleOpenAdd}
                onViewBuilds={() => navigateTo('builds')}
                onManageApp={handleManageApp}
              />
            )}

            {activeView === 'builds' && (
              <BuildsListView
                apps={apps}
                ratingsByAppId={ratingsAggregate.byAppId}
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
                saving={savingBuild}
                serverNow={serverNow}
                onSubmit={handleSubmitBuild}
                onCancel={() => {
                  if (editingApp) {
                    setSelectedAppId(editingApp.id);
                    setEditingApp(null);
                    setActiveView('manage');
                  } else {
                    navigateTo('dashboard');
                  }
                }}
              />
            )}

            {activeView === 'manage' && selectedApp && (
              <ManageBuildView
                app={selectedApp}
                ratingSummary={
                  ratingsAggregate.byAppId[selectedApp.id] || EMPTY_RATING_SUMMARY
                }
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

            <div aria-hidden="true" className="h-10 lg:hidden" />
          </div>
        </main>

        {/* Mobile Bottom Tab Bar — Exactly 3 tabs: Dashboard | Builds | Upload */}
        <nav
          aria-label="Mobile navigation"
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[var(--border-subtle)] transition-colors duration-200"
          style={{
            backgroundColor: 'var(--canvas)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            boxShadow: '0 -8px 24px -10px rgba(0, 0, 0, 0.14)',
          }}
        >
          <div className="grid grid-cols-3 items-center px-2 py-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeNavId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    item.id === 'add' ? handleOpenAdd() : navigateTo(item.id)
                  }
                  className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                    active
                      ? 'text-[var(--text-primary)] font-bold'
                      : 'text-[var(--text-muted)] font-medium'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      active ? 'text-[var(--accent)] stroke-[2.4]' : ''
                    }`}
                  />
                  <span className="text-[10.5px] leading-tight whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
