import React from 'react';
import { motion } from 'motion/react';
import { BrandEmblem3D } from './BrandEmblem3D';

interface SplashScreenProps {
  message?: string;
  subMessage?: string;
}

export function SplashScreen({
  message = 'Initializing Control Center',
  subMessage = 'Connecting to PB X Store...',
}: SplashScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[300] canvas-bg flex flex-col items-center justify-center px-6"
    >
      <div className="surface-3d-lg rounded-3xl p-8 sm:p-10 w-full max-w-sm flex flex-col items-center text-center relative overflow-hidden">
        {/* Subtle accent top illumination */}
        <div
          aria-hidden="true"
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-40 rounded-full blur-3xl opacity-45 pointer-events-none"
          style={{ background: 'var(--accent)' }}
        />

        <div className="relative z-10 mb-6">
          <BrandEmblem3D size="lg" animated />
        </div>

        <h1 className="relative z-10 text-xl font-extrabold tracking-tight text-[var(--text-primary)]">
          PB X Store
        </h1>
        <p className="relative z-10 text-sm font-medium text-[var(--text-secondary)] mt-1">
          {message}
        </p>

        {/* Tactile 3D recessed progress track */}
        <div
          className="relative z-10 w-full h-2.5 rounded-full mt-7 overflow-hidden border border-[var(--border-subtle)]"
          style={{
            background: 'var(--surface-inset)',
            boxShadow: 'var(--shadow-inset)',
          }}
        >
          <div
            className="h-full w-1/2 rounded-full animate-loader-slide"
            style={{
              background:
                'linear-gradient(90deg, var(--accent-lip), var(--accent-bright), var(--accent))',
              boxShadow: '0 0 12px var(--accent-glow)',
            }}
          />
        </div>

        <p className="relative z-10 text-xs text-[var(--text-muted)] mt-3.5 font-mono">
          {subMessage}
        </p>
      </div>
    </motion.div>
  );
}
