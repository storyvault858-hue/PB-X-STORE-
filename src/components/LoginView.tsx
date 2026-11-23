import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
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
    <div className="min-h-screen w-full canvas-bg flex flex-col relative overflow-hidden">
      {/* Soft atmospheric halo matching active theme */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[360px] rounded-full blur-[120px] opacity-30"
        style={{ background: 'var(--accent)' }}
      />

      {/* Seamless Top Bar */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-5 sm:px-8 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandEmblem3D size="sm" />
          <span className="text-sm font-extrabold tracking-tight text-[var(--text-primary)] whitespace-nowrap">
            PB X Store
          </span>
        </div>
        <ThemeSwitcher compact align="right" />
      </header>

      {/* Executive 3D Login Stage */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[430px]"
        >
          {/* Animated 3D Brand Hero */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="mb-6 relative flex items-center justify-center">
              <motion.div
                aria-hidden="true"
                animate={{ scale: [1, 1.12, 1], opacity: [0.35, 0.55, 0.35] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute w-24 h-24 rounded-full blur-2xl pointer-events-none"
                style={{ background: 'var(--accent)' }}
              />
              <div className="relative">
                <BrandEmblem3D size="lg" animated />
              </div>
            </div>

            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-[var(--text-primary)] [text-wrap:balance]">
              PB X Store
            </h1>
            <p className="text-sm font-medium text-[var(--text-secondary)] mt-1.5">
              App Distribution &amp; Control Center
            </p>
          </div>

          {/* Sculpted 3D Login Card */}
          <div className="surface-3d-lg rounded-[28px] p-6 sm:p-8 relative overflow-hidden">
            {/* Accent top specular edge */}
            <div
              aria-hidden="true"
              className="absolute inset-x-10 top-0 h-[2px] opacity-80 pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, transparent, var(--accent-bright), transparent)',
              }}
            />

            <div className="relative z-10 mb-6">
              <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                Administrator Sign In
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Authenticate with your verified PB X Store admin credentials.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 relative z-10" noValidate>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-[var(--text-secondary)] mb-2"
                  >
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-4 pointer-events-none" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@pbxstore.com"
                      className="input-3d pl-12 pr-4 min-h-[48px] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-[var(--text-secondary)] mb-2"
                  >
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-4 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="input-3d pl-12 pr-12 min-h-[48px] text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
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
                <label className="flex items-center gap-2.5 text-xs font-medium text-[var(--text-secondary)] cursor-pointer select-none min-h-[36px]">
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
                  className="flex items-start gap-2.5 rounded-2xl px-4 py-3 text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{displayError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-3d-primary w-full min-h-[50px] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
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

          <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--text-muted)] mt-6">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Encrypted PB X Store Admin Portal</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
