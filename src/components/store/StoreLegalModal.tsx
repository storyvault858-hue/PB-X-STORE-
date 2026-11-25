import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FileText, HelpCircle, ShieldCheck, X } from 'lucide-react';

export type LegalDocType = 'privacy' | 'terms' | 'support' | null;

interface StoreLegalModalProps {
  doc: LegalDocType;
  onClose: () => void;
}

const LEGAL_CONTENT: Record<
  Exclude<LegalDocType, null>,
  {
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    sections: Array<{ heading: string; body: string }>;
  }
> = {
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'PB X Store Data & Transparency',
    icon: ShieldCheck,
    sections: [
      {
        heading: 'Minimal Local Preferences',
        body: 'PB X Store stores only your appearance preferences (selected color theme, Dark/Light mode, touch sound toggle) and optional app unlock session states locally on your device.',
      },
      {
        heading: 'No Invasive Tracking',
        body: 'We do not sell personal data or require account creation to browse and download published applications. Anonymous aggregate counts (such as download counters) may be used to display release activity.',
      },
      {
        heading: 'Third-Party Packages',
        body: 'Applications distributed via PB X Store are hosted directly by their respective publishers. Review each app’s requested permissions on your device before installing.',
      },
    ],
  },
  terms: {
    title: 'Terms of Use',
    subtitle: 'Guidelines for PB X Store Users',
    icon: FileText,
    sections: [
      {
        heading: 'Authorized Distribution',
        body: 'PB X Store provides direct access to verified Android (APK) and iOS builds published by authorized administrators.',
      },
      {
        heading: 'Timed & Protected Releases',
        body: 'Some builds are password-protected or time-limited by their publisher. Once a build expires or is unpublished, it is automatically removed from the catalog.',
      },
      {
        heading: 'User Responsibility',
        body: 'By downloading and installing packages from PB X Store, you confirm that you trust the publisher and comply with your device’s installation security prompts.',
      },
    ],
  },
  support: {
    title: 'Help & Support',
    subtitle: 'Installation Guide & Troubleshooting',
    icon: HelpCircle,
    sections: [
      {
        heading: 'How to Install an Android APK',
        body: 'Tap "Download APK" on any app page. Once the file finishes downloading, open it from your browser downloads or Files app. If Android asks, enable "Install unknown apps" for your browser and tap Install.',
      },
      {
        heading: 'App Asking for Password?',
        body: 'Private or beta builds require an access password set by the app publisher. Request the password directly from the person who shared the PB X Store link or QR code.',
      },
      {
        heading: 'App Missing or Link Expired?',
        body: 'Publishers can set exact expiry timers or move builds to draft. If a link shows "App Not Found", ask the publisher for the latest build link.',
      },
    ],
  },
};

export function StoreLegalModal({ doc, onClose }: StoreLegalModalProps) {
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [doc, onClose]);

  const data = doc ? LEGAL_CONTENT[doc] : null;
  const Icon = data?.icon || ShieldCheck;

  return (
    <AnimatePresence>
      {doc && data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[220] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="surface-3d-lg w-full max-w-md rounded-3xl p-5 sm:p-6 max-h-[82vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--accent-soft)] text-[var(--accent)] shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-[var(--text-primary)] truncate">
                    {data.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] truncate">{data.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="btn-3d-secondary w-8 h-8 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              {data.sections.map((sec) => (
                <div
                  key={sec.heading}
                  className="rounded-2xl p-3.5 border border-[var(--border-subtle)]"
                  style={{
                    background: 'var(--surface-inset)',
                    boxShadow: 'var(--shadow-inset)',
                  }}
                >
                  <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                    {sec.heading}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {sec.body}
                  </p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn-3d-primary w-full min-h-[42px] rounded-xl text-xs font-bold mt-4 cursor-pointer"
            >
              Got It
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
