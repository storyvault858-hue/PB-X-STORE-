import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CalendarClock, Globe, Infinity as InfinityIcon, Save, X } from 'lucide-react';
import type { AppFormValues, ExpiryMode, PlatformType, StoreApp } from '../types';
import { getServerDateString, LIVE_SITE_URL, slugifyText } from '../lib/firebase';
import { AppIcon } from './AppIcon';

interface BuildFormViewProps {
  editingApp: StoreApp | null;
  saving: boolean;
  serverNow: number;
  onSubmit: (values: AppFormValues, editingId: string | null) => Promise<void>;
  onCancel: () => void;
}

const EMPTY_FORM: AppFormValues = {
  name: '',
  slug: '',
  platform: 'Android',
  bundleId: '',
  expiryMode: 'lifetime',
  expiryDate: '',
  iconUrl: '',
  shortDescription: '',
  category: '',
  fullDescription: '',
  version: '',
  fileSize: '',
  androidMinVersion: '',
  apkUrl: '',
  password: '',
  aliases: '',
  published: true,
};

export function BuildFormView({
  editingApp,
  saving,
  serverNow,
  onSubmit,
  onCancel,
}: BuildFormViewProps) {
  const [form, setForm] = useState<AppFormValues>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);

  const todayStr = getServerDateString(serverNow, 0);

  useEffect(() => {
    if (editingApp) {
      const hasExpiry = Boolean(
        !editingApp.isLifetime &&
          editingApp.expiryDate &&
          String(editingApp.expiryDate).trim().length > 0
      );

      setForm({
        name: editingApp.name || '',
        slug: editingApp.slug || '',
        platform: (editingApp.platform === 'iOS' ? 'iOS' : 'Android') as PlatformType,
        bundleId: editingApp.bundleId || '',
        expiryMode: hasExpiry ? 'date' : 'lifetime',
        expiryDate: hasExpiry ? String(editingApp.expiryDate) : '',
        iconUrl: editingApp.iconUrl || '',
        shortDescription: editingApp.shortDescription || '',
        category: editingApp.category || '',
        fullDescription: editingApp.fullDescription || '',
        version: editingApp.version || '',
        fileSize: editingApp.fileSize || '',
        androidMinVersion: editingApp.androidMinVersion || '',
        apkUrl: editingApp.apkUrl || '',
        password: editingApp.password || '',
        aliases: Array.isArray(editingApp.aliases) ? editingApp.aliases.join(', ') : '',
        published: Boolean(editingApp.published),
      });
      setSlugTouched(true);
    } else {
      setForm(EMPTY_FORM);
      setSlugTouched(false);
    }
  }, [editingApp]);

  const updateField = <K extends keyof AppFormValues>(key: K, value: AppFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleExpiryModeChange = (mode: ExpiryMode) => {
    setForm((prev) => ({
      ...prev,
      expiryMode: mode,
      expiryDate: mode === 'lifetime' ? '' : prev.expiryDate || getServerDateString(serverNow, 30),
    }));
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: !editingApp && !slugTouched ? slugifyText(value) : prev.slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form, editingApp ? editingApp.id : null);
  };

  const previewSlug = slugifyText(form.slug || form.name || 'your-app');
  const previewStoreUrl = `${LIVE_SITE_URL}/?app=${previewSlug}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 max-w-4xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Go back"
            className="btn-3d-secondary w-10 h-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {editingApp ? 'Edit Application' : 'Upload New Build'}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {editingApp
                ? `Updating ${editingApp.name} in PB X Store`
                : 'Add a new Android or iOS package to your PB X Store catalog'}
            </p>
          </div>
        </div>

        {editingApp && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-3d-secondary min-h-[40px] px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-red-600 dark:text-red-400 whitespace-nowrap cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel Edit</span>
          </button>
        )}
      </div>

      {/* Live Preview Strip */}
      <div className="surface-3d rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <AppIcon src={form.iconUrl} name={form.name || 'New App'} size="md" />
          <div className="min-w-0">
            <p className="font-bold text-sm text-[var(--text-primary)] truncate">
              {form.name || 'Untitled Application'}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-0.5">
              <Globe className="w-3.5 h-3.5 shrink-0 text-[var(--accent)]" />
              <span className="font-mono truncate">{previewStoreUrl}</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span
            className={`block text-xs font-semibold ${
              form.published
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {form.published ? 'Active' : 'Draft'}
          </span>
          <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">
            {form.expiryMode === 'lifetime' ? 'Lifetime' : form.expiryDate || 'Timed'}
          </span>
        </div>
      </div>

      {/* Form Card */}
      <div className="surface-3d rounded-3xl p-5 sm:p-7">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Core Identity */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)] pb-2 border-b border-[var(--border-subtle)]">
              Application Identity
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="f-name"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
                >
                  App Name *
                </label>
                <input
                  id="f-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Punjab Esports"
                  className="input-3d min-h-[44px]"
                />
              </div>

              <div>
                <label
                  htmlFor="f-slug"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
                >
                  Unique Slug * (URL friendly)
                </label>
                <input
                  id="f-slug"
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    updateField('slug', e.target.value);
                  }}
                  placeholder="e.g. punjab-esports"
                  className="input-3d font-mono min-h-[44px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="f-platform"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
                >
                  Platform
                </label>
                <select
                  id="f-platform"
                  value={form.platform}
                  onChange={(e) => updateField('platform', e.target.value as PlatformType)}
                  className="input-3d min-h-[44px]"
                >
                  <option value="Android">Android</option>
                  <option value="iOS">iOS</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="f-bundle"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
                >
                  Bundle ID
                </label>
                <input
                  id="f-bundle"
                  type="text"
                  value={form.bundleId}
                  onChange={(e) => updateField('bundleId', e.target.value)}
                  placeholder="com.pbxstore.app"
                  className="input-3d font-mono min-h-[44px]"
                />
              </div>
            </div>

            {/* Validity & Auto-Expiry Selector */}
            <div
              className="rounded-2xl p-4 border border-[var(--border-subtle)] space-y-3.5"
              style={{
                background: 'var(--surface-inset)',
                boxShadow: 'var(--shadow-inset)',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    App Validity &amp; Expiry
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Choose Lifetime to keep this app permanently, or set an auto-delete expiry date.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleExpiryModeChange('lifetime')}
                  aria-pressed={form.expiryMode === 'lifetime'}
                  className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    form.expiryMode === 'lifetime'
                      ? 'btn-3d-primary'
                      : 'btn-3d-secondary text-[var(--text-secondary)]'
                  }`}
                >
                  <InfinityIcon className="w-4 h-4 shrink-0" />
                  <span>Lifetime</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExpiryModeChange('date')}
                  aria-pressed={form.expiryMode === 'date'}
                  className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    form.expiryMode === 'date'
                      ? 'btn-3d-primary'
                      : 'btn-3d-secondary text-[var(--text-secondary)]'
                  }`}
                >
                  <CalendarClock className="w-4 h-4 shrink-0" />
                  <span>Set Expiry Date</span>
                </button>
              </div>

              {form.expiryMode === 'lifetime' ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Lifetime selected — this app will never expire and will never be auto-removed from PB X Store.
                </p>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <input
                      id="f-expiry"
                      type="date"
                      min={todayStr}
                      required={form.expiryMode === 'date'}
                      value={form.expiryDate}
                      onChange={(e) => updateField('expiryDate', e.target.value)}
                      className="input-3d font-mono min-h-[44px] sm:flex-1"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      {[
                        { label: '+7d', days: 7 },
                        { label: '+30d', days: 30 },
                        { label: '+90d', days: 90 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            updateField('expiryDate', getServerDateString(serverNow, preset.days))
                          }
                          className="btn-3d-secondary min-h-[40px] px-3 rounded-xl text-xs font-mono font-semibold cursor-pointer whitespace-nowrap"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Auto-Expiry Active: Once this date completes, the app will be automatically removed from both this Control Center and PB X Store.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="f-icon"
                className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
              >
                Icon URL (Direct image link)
              </label>
              <input
                id="f-icon"
                type="url"
                value={form.iconUrl}
                onChange={(e) => updateField('iconUrl', e.target.value)}
                placeholder="https://example.com/icon.png"
                className="input-3d min-h-[44px]"
              />
            </div>
          </div>

          {/* Store Listing Info */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)] pb-2 border-b border-[var(--border-subtle)]">
              Store Details &amp; Description
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="f-short-desc"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
                >
                  Short Description
                </label>
                <input
                  id="f-short-desc"
                  type="text"
                  value={form.shortDescription}
                  onChange={(e) => updateField('shortDescription', e.target.value)}
                  placeholder="Brief summary of the app"
                  className="input-3d min-h-[44px]"
                />
              </div>

              <div>
                <label
                  htmlFor="f-category"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
                >
                  Category
                </label>
                <input
                  id="f-category"
                  type="text"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  placeholder="e.g. Gaming, Utility, Tools"
                  className="input-3d min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="f-full-desc"
                className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
              >
                Full Description
              </label>
              <textarea
                id="f-full-desc"
                rows={4}
                value={form.fullDescription}
                onChange={(e) => updateField('fullDescription', e.target.value)}
                placeholder="Detailed changelog, installation instructions, or feature notes..."
                className="input-3d resize-y"
              />
            </div>
          </div>

          {/* Build Package & Distribution */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)] pb-2 border-b border-[var(--border-subtle)]">
              Package &amp; Distribution
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="f-version"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
                >
                  Version *
                </label>
                <input
                  id="f-version"
                  type="text"
                  required
                  value={form.version}
                  onChange={(e) => updateField('version', e.target.value)}
                  placeholder="1.0.0"
                  className="input-3d font-mono min-h-[44px]"
                />
              </div>

              <div>
                <label
                  htmlFor="f-size"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
                >
                  File Size
                </label>
                <input
                  id="f-size"
                  type="text"
                  value={form.fileSize}
                  onChange={(e) => updateField('fileSize', e.target.value)}
                  placeholder="15.2 MB"
                  className="input-3d font-mono min-h-[44px]"
                />
              </div>

              <div>
                <label
                  htmlFor="f-android"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
                >
                  Minimum OS Version
                </label>
                <input
                  id="f-android"
                  type="text"
                  value={form.androidMinVersion}
                  onChange={(e) => updateField('androidMinVersion', e.target.value)}
                  placeholder="7.0+"
                  className="input-3d font-mono min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="f-apk-url"
                className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
              >
                APK / Package Download URL * (GitHub Release Link)
              </label>
              <input
                id="f-apk-url"
                type="text"
                required
                value={form.apkUrl}
                onChange={(e) => updateField('apkUrl', e.target.value)}
                placeholder="https://github.com/user/repo/releases/download/v1.0.0/app.apk"
                className="input-3d font-mono min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="f-password"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
                >
                  App Password (Optional)
                </label>
                <input
                  id="f-password"
                  type="text"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Leave blank for open access"
                  className="input-3d min-h-[44px]"
                />
              </div>

              <div>
                <label
                  htmlFor="f-aliases"
                  className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
                >
                  Search Aliases (comma separated)
                </label>
                <input
                  id="f-aliases"
                  type="text"
                  value={form.aliases}
                  onChange={(e) => updateField('aliases', e.target.value)}
                  placeholder="esports, gaming, tournament"
                  className="input-3d min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Publish Switch */}
          <label
            htmlFor="f-published"
            className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--border-subtle)] cursor-pointer select-none"
            style={{
              background: 'var(--surface-inset)',
              boxShadow: 'var(--shadow-inset)',
            }}
          >
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Publish immediately to PB X Store
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                When enabled, users can view and download this build right away.
              </p>
            </div>
            <input
              id="f-published"
              type="checkbox"
              checked={form.published}
              onChange={(e) => updateField('published', e.target.checked)}
              className="w-5 h-5 rounded accent-[var(--accent)] cursor-pointer shrink-0"
            />
          </label>

          {/* Submit Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="btn-3d-secondary min-h-[46px] px-5 rounded-xl text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-3d-primary min-h-[46px] px-7 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Saving Build...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{editingApp ? 'Update Application' : 'Save Application'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
