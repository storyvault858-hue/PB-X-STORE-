import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  child,
  get,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
  type Unsubscribe,
} from 'firebase/database';
import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Package,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import {
  auth,
  copyToClipboard,
  db,
  isAppExpired,
  LIVE_SITE_URL,
  slugifyText,
  translateAuthError,
} from './lib/firebase';
import type {
  ActiveView,
  AppFormValues,
  ConfirmDialogState,
  StoreApp,
  ToastItem,
} from './types';
import { BrandEmblem3D } from './components/BrandEmblem3D';
import { SplashScreen } from './components/SplashScreen';
import { LoginView } from './components/LoginView';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { DashboardOverview } from './components/DashboardOverview';
import { BuildsListView } from './components/BuildsListView';
import { BuildFormView } from './components/BuildFormView';
import { ManageBuildView } from './components/ManageBuildView';
import { QRModal } from './components/QRModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ToastContainer } from './components/ToastContainer';
import { useTheme } from './context/ThemeContext';

type BootStage = 'booting' | 'verifying' | 'syncing' | 'ready';

export default function App() {
  const { playSound } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bootStage, setBootStage] = useState<BootStage>('booting');
  const [authError, setAuthError] = useState('');
  const [syncError, setSyncError] = useState('');

  // True real-world Firebase Server Time (immune to incorrect device clocks)
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [serverTimeReady, setServerTimeReady] = useState(false);
  const [clockTick, setClockTick] = useState(() => Date.now());

  const [apps, setApps] = useState<StoreApp[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [managedAppId, setManagedAppId] = useState<string | null>(null);
  const [editingApp, setEditingApp] = useState<StoreApp | null>(null);
  const [qrApp, setQrApp] = useState<StoreApp | null>(null);
  const [savingBuild, setSavingBuild] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState(false);
  const [updatingValidity, setUpdatingValidity] = useState(false);
  const [syncKey, setSyncKey] = useState(0);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const mainRef = useRef<HTMLElement>(null);
  const autoDeletingIdsRef = useRef<Set<string>>(new Set());

  const serverNow = clockTick + serverTimeOffset;

  const showToast = useCallback(
    (message: string, type: ToastItem['type'] = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      if (type === 'success') playSound('success');
      else if (type === 'error') playSound('error');
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3400);
    },
    [playSound]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const scrollMainToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // 0. Sync true Firebase Server Time offset so device clock drift never causes false expiry
  useEffect(() => {
    const offsetRef = ref(db, '.info/serverTimeOffset');
    const unsubOffset = onValue(offsetRef, (snap) => {
      const offset = Number(snap.val() || 0);
      setServerTimeOffset(Number.isFinite(offset) ? offset : 0);
      setServerTimeReady(true);
      setClockTick(Date.now());
    });

    const interval = window.setInterval(() => {
      setClockTick(Date.now());
    }, 30000);

    return () => {
      unsubOffset();
      window.clearInterval(interval);
    };
  }, []);

  // 1. Firebase Authentication + Admin UID Verification
  useEffect(() => {
    let active = true;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;

      if (!firebaseUser) {
        setUser(null);
        setIsAdmin(false);
        setApps([]);
        setManagedAppId(null);
        setEditingApp(null);
        setQrApp(null);
        setSyncError('');
        setBootStage('ready');
        return;
      }

      setBootStage('verifying');
      setAuthError('');

      try {
        const snapshot = await get(child(ref(db), `admins/${firebaseUser.uid}`));
        if (!active) return;

        if (snapshot.exists() && snapshot.val()?.enabled === true) {
          setUser(firebaseUser);
          setIsAdmin(true);
          setBootStage('syncing');
        } else {
          setAuthError('Access Denied: Your UID is not enabled in the "admins" node.');
          setUser(null);
          setIsAdmin(false);
          await signOut(auth);
          if (active) setBootStage('ready');
        }
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Unable to verify admin status.';
        setAuthError(`Database Error: ${msg}`);
        setUser(null);
        setIsAdmin(false);
        setBootStage('ready');
      }
    });

    return () => {
      active = false;
      unsubscribeAuth();
    };
  }, []);

  // 2. Real-time PB X Store Apps Subscription (exact original `apps` node)
  useEffect(() => {
    if (!user || !isAdmin) return;

    let unsub: Unsubscribe | null = null;
    setSyncError('');

    const appsRef = ref(db, 'apps');
    unsub = onValue(
      appsRef,
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
        setBootStage('ready');
      },
      (error) => {
        setSyncError(error.message || 'Failed to sync builds from database.');
        setBootStage('ready');
        showToast(`Sync error: ${error.message}`, 'error');
      }
    );

    return () => {
      if (unsub) unsub();
    };
  }, [user, isAdmin, syncKey, showToast]);

  // 3. Server-Time Verified Auto-Expiry Removal:
  // ONLY runs after Firebase `.info/serverTimeOffset` is synced so wrong device clocks
  // can NEVER remove unexpired builds. Lifetime apps (expiryDate: null or isLifetime: true)
  // are NEVER touched.
  useEffect(() => {
    if (!user || !isAdmin || !serverTimeReady || apps.length === 0) return;

    const trueNow = Date.now() + serverTimeOffset;
    const expiredApps = apps.filter(
      (item) =>
        item.id &&
        isAppExpired(item, trueNow) &&
        !autoDeletingIdsRef.current.has(item.id)
    );

    if (expiredApps.length === 0) return;

    expiredApps.forEach(async (expired) => {
      autoDeletingIdsRef.current.add(expired.id);
      try {
        await remove(ref(db, `apps/${expired.id}`));
        showToast(
          `Expired build "${expired.name}" was automatically removed from PB X Store.`,
          'info'
        );
      } catch {
        autoDeletingIdsRef.current.delete(expired.id);
      }
    });
  }, [apps, user, isAdmin, serverTimeReady, serverTimeOffset, clockTick, showToast]);

  // Keep managedApp reactive so real-time RTDB changes appear immediately
  const managedApp = useMemo(
    () => (managedAppId ? apps.find((a) => a.id === managedAppId) || null : null),
    [apps, managedAppId]
  );

  // If currently managed app was deleted, return cleanly to Builds list
  useEffect(() => {
    if (activeView === 'manage' && managedAppId && !managedApp && bootStage === 'ready') {
      setActiveView('builds');
      setManagedAppId(null);
    }
  }, [activeView, managedAppId, managedApp, bootStage]);

  // Handlers
  const handleLogin = async (email: string, password: string, remember: boolean) => {
    setAuthError('');
    try {
      if (remember) {
        localStorage.setItem('pbx_saved_email', email);
      } else {
        localStorage.removeItem('pbx_saved_email');
      }
    } catch {
      // Ignore storage failures
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string; message?: string };
      throw new Error(translateAuthError(firebaseErr.code, firebaseErr.message));
    }
  };

  const requestLogout = () => {
    setConfirmDialog({
      open: true,
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of PB X Store Control Center?',
      confirmLabel: 'Sign Out',
      danger: true,
      onConfirm: async () => {
        try {
          await signOut(auth);
          showToast('Signed out successfully.', 'info');
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unable to sign out.';
          showToast(msg, 'error');
        }
      },
    });
  };

  const navigateTo = (view: ActiveView) => {
    if (view !== 'add') {
      setEditingApp(null);
    }
    setActiveView(view);
    scrollMainToTop();
  };

  const openAddBuild = () => {
    setEditingApp(null);
    setActiveView('add');
    scrollMainToTop();
  };

  const openManageBuild = (id: string) => {
    setManagedAppId(id);
    setActiveView('manage');
    scrollMainToTop();
  };

  const openEditBuild = (app: StoreApp) => {
    setEditingApp(app);
    setActiveView('add');
    scrollMainToTop();
  };

  const handleCopyLink = useCallback(
    async (url: string) => {
      const ok = await copyToClipboard(url);
      if (ok) {
        showToast('Store link copied to clipboard.', 'success');
      } else {
        showToast('Could not copy automatically. Please copy from the link field.', 'error');
      }
    },
    [showToast]
  );

  const handleSaveBuild = async (values: AppFormValues, editingId: string | null) => {
    const trimmedName = values.name.trim();
    const cleanedSlug = slugifyText(values.slug);
    const trimmedVersion = values.version.trim();
    const rawApkUrl = values.apkUrl.trim();

    if (!trimmedName || !cleanedSlug || !trimmedVersion || !rawApkUrl) {
      showToast('Please fill in App Name, Slug, Version, and APK Download URL.', 'error');
      return;
    }

    const isLifetime = values.expiryMode === 'lifetime';
    const trimmedExpiry = values.expiryDate.trim();
    const trueNow = Date.now() + serverTimeOffset;

    if (!isLifetime) {
      if (!trimmedExpiry) {
        showToast('Please select an expiry date or switch to Lifetime.', 'error');
        return;
      }
      if (isAppExpired({ expiryDate: trimmedExpiry, isLifetime: false }, trueNow)) {
        showToast('Expiry date cannot be in the past. Pick today or a future date.', 'error');
        return;
      }
    }

    const finalApkUrl =
      rawApkUrl.startsWith('http://') || rawApkUrl.startsWith('https://')
        ? rawApkUrl
        : `https://${rawApkUrl}`;

    const permanentAppUrl = `${LIVE_SITE_URL}/?app=${cleanedSlug}`;
    const aliasesArray = values.aliases
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: trimmedName,
      slug: cleanedSlug,
      appUrl: permanentAppUrl,
      bundleId: values.bundleId.trim() || 'com.pbxstore.app',
      platform: values.platform || 'Android',
      iconUrl: values.iconUrl.trim(),
      shortDescription: values.shortDescription.trim(),
      fullDescription: values.fullDescription.trim(),
      version: trimmedVersion,
      fileSize: values.fileSize.trim(),
      category: values.category.trim(),
      androidMinVersion: values.androidMinVersion.trim() || 'Varies',
      apkUrl: finalApkUrl,
      password: values.password.trim() || null,
      aliases: aliasesArray,
      published: Boolean(values.published),
      isLifetime,
      expiryDate: isLifetime ? null : trimmedExpiry,
      updatedAt: new Date(trueNow).toISOString(),
    };

    setSavingBuild(true);
    try {
      if (editingId) {
        await update(ref(db, `apps/${editingId}`), payload);
        showToast(`${trimmedName} updated successfully.`, 'success');
        setEditingApp(null);
        setManagedAppId(editingId);
        setActiveView('manage');
      } else {
        const newRef = push(ref(db, 'apps'));
        await set(newRef, {
          ...payload,
          createdAt: new Date(trueNow).toISOString(),
          downloads: 0,
          linkOpens: 0,
          uniqueDevices: 0,
          successRate: '0%',
        });
        showToast(`${trimmedName} added to PB X Store.`, 'success');
        setEditingApp(null);
        setActiveView('builds');
      }
      scrollMainToTop();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save build.';
      showToast(`Error: ${msg}`, 'error');
    } finally {
      setSavingBuild(false);
    }
  };

  const handleTogglePublish = async (app: StoreApp) => {
    setTogglingPublish(true);
    try {
      const nextPublished = !app.published;
      const trueNow = Date.now() + serverTimeOffset;
      await update(ref(db, `apps/${app.id}`), {
        published: nextPublished,
        updatedAt: new Date(trueNow).toISOString(),
      });
      showToast(
        nextPublished ? `${app.name} is now live on PB X Store.` : `${app.name} moved to Drafts.`,
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update status.';
      showToast(`Error: ${msg}`, 'error');
    } finally {
      setTogglingPublish(false);
    }
  };

  const handleMakeLifetime = async (app: StoreApp) => {
    setUpdatingValidity(true);
    try {
      const trueNow = Date.now() + serverTimeOffset;
      await update(ref(db, `apps/${app.id}`), {
        isLifetime: true,
        expiryDate: null,
        updatedAt: new Date(trueNow).toISOString(),
      });
      showToast(`${app.name} is now set to Lifetime (Never Expires).`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update validity.';
      showToast(`Error: ${msg}`, 'error');
    } finally {
      setUpdatingValidity(false);
    }
  };

  const handleDeleteApp = (app: StoreApp) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Application',
      message: `Are you sure you want to permanently delete "${app.name}"? This cannot be undone.`,
      confirmLabel: 'Delete Build',
      danger: true,
      onConfirm: async () => {
        try {
          await remove(ref(db, `apps/${app.id}`));
          showToast(`${app.name} deleted.`, 'success');
          if (managedAppId === app.id) {
            setManagedAppId(null);
            setActiveView('builds');
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to delete build.';
          showToast(`Error: ${msg}`, 'error');
        }
      },
    });
  };

  const mobilePageTitle =
    activeView === 'dashboard'
      ? 'Dashboard'
      : activeView === 'builds'
        ? 'All Builds'
        : activeView === 'add'
          ? editingApp
            ? 'Edit Build'
            : 'Upload Build'
          : managedApp?.name || 'Manage Build';

  const splashCopy =
    bootStage === 'verifying'
      ? {
          message: 'Verifying Admin Access',
          subMessage: 'Checking authorized PB X Store credentials...',
        }
      : bootStage === 'syncing'
        ? {
            message: 'Syncing Store Catalog',
            subMessage: 'Loading builds and live statistics...',
          }
        : {
            message: 'Initializing Control Center',
            subMessage: 'Connecting to PB X Store...',
          };

  const navItems: Array<{
    id: ActiveView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
    count?: number;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      action: () => navigateTo('dashboard'),
    },
    {
      id: 'builds',
      label: 'Builds',
      icon: Package,
      action: () => navigateTo('builds'),
      count: apps.length,
    },
    {
      id: 'add',
      label: 'Upload Build',
      icon: PlusCircle,
      action: openAddBuild,
    },
  ];

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ConfirmModal dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
      <QRModal app={qrApp} onClose={() => setQrApp(null)} onCopyLink={handleCopyLink} />

      <AnimatePresence>
        {bootStage !== 'ready' && (
          <SplashScreen message={splashCopy.message} subMessage={splashCopy.subMessage} />
        )}
      </AnimatePresence>

      {bootStage === 'ready' && (!user || !isAdmin) ? (
        <LoginView onLogin={handleLogin} externalError={authError} />
      ) : null}

      {bootStage === 'ready' && user && isAdmin ? (
        <div className="min-h-screen w-full canvas-bg flex flex-col lg:flex-row">
          {/* Desktop Sidebar — seamlessly unified with theme canvas */}
          <aside
            className="hidden lg:flex flex-col w-72 shrink-0 h-screen sticky top-0 border-r border-[var(--border-subtle)] p-5 justify-between transition-colors duration-200"
            style={{ backgroundColor: 'var(--canvas)' }}
          >
            <div className="space-y-7">
              {/* Brand Wordmark */}
              <div className="flex items-center gap-3 px-1">
                <BrandEmblem3D size="sm" />
                <div className="min-w-0">
                  <p className="font-extrabold text-base tracking-tight text-[var(--text-primary)] leading-none truncate">
                    PB X Store
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                    Control Center
                  </p>
                </div>
              </div>

              {/* Primary Navigation */}
              <nav aria-label="Main navigation" className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    activeView === item.id ||
                    (item.id === 'builds' && activeView === 'manage');

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.action}
                      className={`w-full min-h-[44px] px-3.5 rounded-xl flex items-center justify-between gap-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'surface-3d text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-inset)]'
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {typeof item.count === 'number' && (
                        <span className="font-mono text-xs text-[var(--text-muted)] tabular-nums">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Quick Live Store Link */}
              <div className="pt-3 border-t border-[var(--border-subtle)]">
                <a
                  href={LIVE_SITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[40px] px-3.5 rounded-xl flex items-center justify-between gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-inset)] transition-colors"
                >
                  <span className="truncate">Open Live Store</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                </a>
              </div>
            </div>

            {/* Sidebar Footer: Appearance + Admin Account */}
            <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
              <ThemeSwitcher />

              <div
                className="rounded-2xl p-3 border border-[var(--border-subtle)] space-y-2.5"
                style={{
                  background: 'var(--surface-inset)',
                  boxShadow: 'var(--shadow-inset)',
                }}
              >
                <div className="px-1 min-w-0">
                  <p className="text-[11px] text-[var(--text-muted)]">Signed in as</p>
                  <p
                    className="text-xs font-semibold text-[var(--text-primary)] truncate mt-0.5"
                    title={user.email || ''}
                  >
                    {user.email || 'Administrator'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={requestLogout}
                  className="btn-3d-secondary w-full min-h-[38px] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 text-[var(--text-primary)] cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Mobile Top Header — seamlessly matches status bar & active theme */}
          <header
            className="lg:hidden sticky top-0 z-40 min-h-[56px] pt-[env(safe-area-inset-top)] px-3.5 py-2 flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] transition-colors duration-200"
            style={{ backgroundColor: 'var(--canvas)' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <BrandEmblem3D size="sm" />
              <span className="font-bold text-sm text-[var(--text-primary)] truncate">
                {mobilePageTitle}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <ThemeSwitcher compact align="right" />
              <button
                type="button"
                onClick={requestLogout}
                aria-label="Sign out"
                className="btn-3d-secondary min-h-[40px] min-w-[40px] px-2.5 rounded-xl flex items-center justify-center text-red-500 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Main Content Viewport */}
          <main
            ref={mainRef}
            className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 pb-24 lg:pb-10 lg:h-screen lg:overflow-y-auto"
          >
            <div className="max-w-5xl mx-auto">
              {syncError && (
                <div className="surface-3d rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-red-500/30">
                  <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">
                    Database sync issue: {syncError}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSyncKey((k) => k + 1)}
                    className="btn-3d-secondary min-h-[38px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Sync</span>
                  </button>
                </div>
              )}

              {activeView === 'dashboard' && (
                <DashboardOverview
                  apps={apps}
                  onOpenAdd={openAddBuild}
                  onViewBuilds={() => navigateTo('builds')}
                  onManageApp={openManageBuild}
                />
              )}

              {activeView === 'builds' && (
                <BuildsListView
                  apps={apps}
                  serverNow={serverNow}
                  onOpenAdd={openAddBuild}
                  onManageApp={openManageBuild}
                  onCopyLink={handleCopyLink}
                  onShowQR={(app) => setQrApp(app)}
                />
              )}

              {activeView === 'add' && (
                <BuildFormView
                  editingApp={editingApp}
                  saving={savingBuild}
                  serverNow={serverNow}
                  onSubmit={handleSaveBuild}
                  onCancel={() => {
                    const returnToManage = editingApp ? editingApp.id : null;
                    setEditingApp(null);
                    if (returnToManage) {
                      setManagedAppId(returnToManage);
                      setActiveView('manage');
                    } else {
                      setActiveView('dashboard');
                    }
                    scrollMainToTop();
                  }}
                />
              )}

              {activeView === 'manage' && managedApp && (
                <ManageBuildView
                  app={managedApp}
                  serverNow={serverNow}
                  togglingPublish={togglingPublish}
                  updatingValidity={updatingValidity}
                  onBack={() => navigateTo('builds')}
                  onEdit={openEditBuild}
                  onShowQR={(app) => setQrApp(app)}
                  onCopyLink={handleCopyLink}
                  onTogglePublish={handleTogglePublish}
                  onMakeLifetime={handleMakeLifetime}
                  onDelete={handleDeleteApp}
                />
              )}
            </div>
          </main>

          {/* Mobile Bottom Navigation — exact 3 clean tabs matching active theme */}
          <nav
            aria-label="Mobile navigation"
            className="lg:hidden fixed bottom-0 inset-x-0 z-40 min-h-[64px] pb-[env(safe-area-inset-bottom)] px-2 border-t border-[var(--border-subtle)] flex items-center justify-around transition-colors duration-200"
            style={{ backgroundColor: 'var(--canvas)' }}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeView === item.id ||
                (item.id === 'builds' && activeView === 'manage');

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  className={`flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[var(--accent)] font-bold'
                      : 'text-[var(--text-muted)] font-medium'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[11px] leading-none whitespace-nowrap">
                    {item.id === 'add' ? 'Upload' : item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      ) : null}
    </>
  );
}
