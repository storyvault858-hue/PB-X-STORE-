import React, { useEffect, useRef, useState } from 'react';
import { Check, Moon, Palette, Sun, Volume2, VolumeX } from 'lucide-react';
import { THEME_OPTIONS, useTheme } from '../context/ThemeContext';

interface ThemeSwitcherProps {
  compact?: boolean;
  align?: 'left' | 'right';
}

export function ThemeSwitcher({ compact = false, align = 'right' }: ThemeSwitcherProps) {
  const { mode, theme, soundEnabled, toggleMode, setTheme, toggleSound } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const currentTheme = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  if (!compact) {
    return (
      <div className="space-y-3.5">
        {/* Dark / Light Mode + Sound Row */}
        <div className="flex items-center gap-2">
          <div
            className="flex-1 grid grid-cols-2 gap-1 p-1 rounded-xl border border-[var(--border-subtle)]"
            style={{
              background: 'var(--surface-inset)',
              boxShadow: 'var(--shadow-inset)',
            }}
          >
            <button
              type="button"
              data-no-tap-sound="true"
              onClick={() => mode !== 'dark' && toggleMode()}
              aria-pressed={mode === 'dark'}
              className={`flex items-center justify-center gap-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                mode === 'dark'
                  ? 'surface-3d text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
            <button
              type="button"
              data-no-tap-sound="true"
              onClick={() => mode !== 'light' && toggleMode()}
              aria-pressed={mode === 'light'}
              className={`flex items-center justify-center gap-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                mode === 'light'
                  ? 'surface-3d text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
          </div>

          <button
            type="button"
            data-no-tap-sound="true"
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute touch sounds' : 'Enable touch sounds'}
            aria-pressed={soundEnabled}
            title={soundEnabled ? 'Touch Sound: On' : 'Touch Sound: Off'}
            className="btn-3d-secondary min-h-[42px] min-w-[42px] rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[var(--accent)]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </button>
        </div>

        {/* 12 Distinct Dual-Tone Theme Swatches */}
        <div>
          <div className="flex items-center justify-between mb-2 px-0.5">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Theme</span>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {currentTheme.name}
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {THEME_OPTIONS.map((opt) => {
              const selected = opt.id === theme;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-no-tap-sound="true"
                  onClick={() => setTheme(opt.id)}
                  title={opt.name}
                  aria-label={`Select ${opt.name} theme`}
                  aria-pressed={selected}
                  className="relative h-7 rounded-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  style={{
                    background: `linear-gradient(135deg, ${opt.swatchEnd} 0%, ${opt.swatch} 100%)`,
                    boxShadow: selected
                      ? `0 0 0 2px var(--canvas), 0 0 0 3.5px ${opt.swatch}`
                      : 'inset 0 1px 0 rgba(255,255,255,0.38), 0 2px 4px rgba(0,0,0,0.22)',
                  }}
                >
                  {selected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5">
      {/* Touch Sound Toggle */}
      <button
        type="button"
        data-no-tap-sound="true"
        onClick={toggleSound}
        aria-label={soundEnabled ? 'Mute touch sounds' : 'Enable touch sounds'}
        aria-pressed={soundEnabled}
        title={soundEnabled ? 'Touch Sound: On' : 'Touch Sound: Off'}
        className="btn-3d-secondary min-h-[34px] min-w-[34px] sm:min-h-[38px] sm:min-w-[38px] px-2 rounded-xl flex items-center justify-center cursor-pointer"
      >
        {soundEnabled ? (
          <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--accent)]" />
        ) : (
          <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--text-muted)]" />
        )}
      </button>

      {/* Dark / Light Mode Toggle */}
      <button
        type="button"
        data-no-tap-sound="true"
        onClick={toggleMode}
        aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="btn-3d-secondary min-h-[34px] min-w-[34px] sm:min-h-[38px] sm:min-w-[38px] px-2 rounded-xl flex items-center justify-center cursor-pointer"
      >
        {mode === 'dark' ? (
          <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
        ) : (
          <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
        )}
      </button>

      {/* 12-Theme Palette Popover Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Choose color theme"
        aria-expanded={open}
        className="btn-3d-secondary min-h-[34px] sm:min-h-[38px] px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap"
      >
        <span
          className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full shrink-0 border border-white/30"
          style={{
            background: `linear-gradient(135deg, ${currentTheme.swatchEnd} 0%, ${currentTheme.swatch} 100%)`,
          }}
        />
        <Palette className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
      </button>

      {open && (
        <div
          className={`absolute top-full mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] p-4 rounded-2xl surface-3d-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-[var(--text-primary)]">Select Theme</p>
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {currentTheme.name}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {THEME_OPTIONS.map((opt) => {
              const selected = opt.id === theme;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-no-tap-sound="true"
                  onClick={() => {
                    setTheme(opt.id);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-2 min-h-[38px] rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[var(--accent-soft)] text-[var(--text-primary)] font-semibold'
                      : 'hover:bg-[var(--surface-inset)] text-[var(--text-secondary)]'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${opt.swatchEnd} 0%, ${opt.swatch} 100%)`,
                    }}
                  >
                    {selected && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                  <span className="truncate">{opt.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
