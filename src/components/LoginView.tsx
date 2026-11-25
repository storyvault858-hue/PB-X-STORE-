import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, X } from 'lucide-react';
import { BrandEmblem3D } from './BrandEmblem3D';
import { ThemeSwitcher } from './ThemeSwitcher';

interface LoginViewProps {
  onLogin: (email: string, password: string, remember: boolean) => Promise<void>;
  externalError?: string;
}

export function LoginView({ onLogin, externalError }: LoginViewProps) {
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('pbx_saved_email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const displayError = localError || externalError || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setLocalError('Please enter both your administrator email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await onLogin(trimmedEmail, password, remember);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in.';
      setLocalError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full canvas-bg flex flex-col relative overflow-x-clip">
      {/* Soft atmospheric halo matching active theme */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[320px] rounded-full blur-[120px] opacity-25"
        style={{ background: 'var(--accent)' }}
      />

      {/* Seamless Top Bar */}
      <header
        className="relative z-20 w-full max-w-6xl mx-auto px-4 sm:px-8 pb-2 flex items-center justify-between"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center gap-2">
          <BrandEmblem3D size="sm" />
          <span className="text-sm font-extrabold tracking-tight text-[var(--text-primary)] whitespace-nowrap">
            PB X Store
          </span>
        </div>
        <ThemeSwitcher compact align="right" />
      </header>

      {/* Top-Anchored Mobile Login Stage (stays completely stationary when keyboard opens!) */}
      <main className="relative z-10 flex-1 flex items-start lg:items-center justify-center px-4 pt-3 pb-10 sm:pt-6 lg:py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px]"
        >
          {/* Compact Brand Header on Mobile so Email & Password stay well above the keyboard */}
          <div className="flex items-center lg:flex-col lg:text-center gap-3.5 lg:gap-0 mb-4 lg:mb-6 px-1">
            <div className="relative flex items-center justify-center shrink-0 lg:mb-4">
              <div className="lg:hidden">
                <BrandEmblem3D size="md" />
              </div>
              <div className="hidden lg:block">
                <BrandEmblem3D size="lg" animated />
              </div>
            </div>

            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] leading-tight">
                PB X Store
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] mt-0.5">
                App Distribution &amp; Control Center
              </p>
            </div>
          </div>

          {/* Sculpted 3D Login Card */}
          <div className="surface-3d-lg rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 relative overflow-hidden">
            {/* Accent top specular edge */}
            <div
              aria-hidden="true"
              className="absolute inset-x-10 top-0 h-[2px] opacity-80 pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, transparent, var(--accent-bright), transparent)',
              }}
            />

            <div className="relative z-10 mb-4">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
                Administrator Sign In
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
                Sign in with your verified PB X Store admin credentials.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10" noValidate>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 pointer-events-none" />
                    <input
                      id="login-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (localError) setLocalError('');
                      }}
                      placeholder="admin@pbxstore.com"
                      className="input-3d pl-10 pr-10 min-h-[44px] text-sm text-[var(--text-primary)]"
                    />
                    {email && (
                      <button
                        type="button"
                        onClick={() => setEmail('')}
                        aria-label="Clear email"
                        className="absolute right-1.5 w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (localError) setLocalError('');
                      }}
                      placeholder="Enter your password"
                      className="input-3d pl-10 pr-11 min-h-[44px] text-sm text-[var(--text-primary)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1.5 w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] cursor-pointer select-none min-h-[32px]">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded accent-[var(--accent)] cursor-pointer"
                  />
                  <span>Remember email</span>
                </label>
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  Verified Access
                </span>
              </div>

              {displayError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{displayError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-3d-primary w-full min-h-[46px] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] mt-4">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Encrypted PB X Store Admin Portal</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
