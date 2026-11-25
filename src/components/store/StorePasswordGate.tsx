import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound, Unlock } from 'lucide-react';
import type { StoreApp } from '../../types';
import { AppIcon } from '../AppIcon';

interface StorePasswordGateProps {
  app: StoreApp;
  onUnlock: () => void;
  onBack: () => void;
}

export function StorePasswordGate({ app, onUnlock, onBack }: StorePasswordGateProps) {
  const [input, setInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) {
      setError('Please enter the app password.');
      return;
    }
    if (input === app.password) {
      setError('');
      onUnlock();
    } else {
      setError('Incorrect password. Please check with the publisher and try again.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="py-8 sm:py-14 flex items-center justify-center"
    >
      <div className="w-full max-w-sm space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[34px] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Store</span>
        </button>

        <div className="surface-3d-lg rounded-[26px] p-6 sm:p-7 text-center relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-x-10 top-0 h-[2px] opacity-80 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, var(--accent-bright), transparent)',
            }}
          />

          <div className="flex justify-center mb-4 relative">
            <AppIcon src={app.iconUrl} name={app.name} size="lg" />
            <span
              className="absolute -bottom-1.5 right-[calc(50%-2.5rem)] w-7 h-7 rounded-xl flex items-center justify-center shadow-md border border-white/25"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-text-on)',
              }}
            >
              <KeyRound className="w-3.5 h-3.5" />
            </span>
          </div>

          <h1 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)]">
            {app.name} is Protected
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            Enter the access password provided by the publisher to view and download this build.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5 text-left" noValidate>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter access password"
                aria-label="App access password"
                autoFocus
                className="input-3d pr-11 min-h-[44px] text-center font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn-3d-primary w-full min-h-[44px] rounded-2xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock App</span>
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}
