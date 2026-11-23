import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import type { ColorMode, ThemeId } from '../types';
import { playTactileSound, unlockAudioEngine, type SoundEffect } from '../lib/sound';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  swatch: string;
  swatchEnd: string;
  darkCanvas: string;
  lightCanvas: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'sapphire',
    name: 'Sapphire',
    swatch: '#2563eb',
    swatchEnd: '#0ea5e9',
    darkCanvas: '#081020',
    lightCanvas: '#e8f0fe',
  },
  {
    id: 'mint',
    name: 'Mint',
    swatch: '#009975',
    swatchEnd: '#10d4a4',
    darkCanvas: '#071713',
    lightCanvas: '#e5f7f1',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    swatch: '#db2777',
    swatchEnd: '#f472b6',
    darkCanvas: '#1a0b15',
    lightCanvas: '#fce9f3',
  },
  {
    id: 'orchid',
    name: 'Orchid',
    swatch: '#7c3aed',
    swatchEnd: '#c084fc',
    darkCanvas: '#120b20',
    lightCanvas: '#f0e9fe',
  },
  {
    id: 'gold',
    name: 'Gold',
    swatch: '#ca8a04',
    swatchEnd: '#facc15',
    darkCanvas: '#171207',
    lightCanvas: '#faf2dc',
  },
  {
    id: 'coral',
    name: 'Coral',
    swatch: '#ea580c',
    swatchEnd: '#fb7185',
    darkCanvas: '#1b0d0a',
    lightCanvas: '#fdece6',
  },
  {
    id: 'arctic',
    name: 'Arctic',
    swatch: '#0284c7',
    swatchEnd: '#22d3ee',
    darkCanvas: '#07141b',
    lightCanvas: '#e4f5fb',
  },
  {
    id: 'matcha',
    name: 'Matcha',
    swatch: '#4d7c0f',
    swatchEnd: '#84cc16',
    darkCanvas: '#0e1609',
    lightCanvas: '#eef5e4',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    swatch: '#be123c',
    swatchEnd: '#f43f5e',
    darkCanvas: '#1a080e',
    lightCanvas: '#fbe8ed',
  },
  {
    id: 'mocha',
    name: 'Mocha',
    swatch: '#9a5b35',
    swatchEnd: '#d08c60',
    darkCanvas: '#160f0b',
    lightCanvas: '#f4ece6',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    swatch: '#4f46e5',
    swatchEnd: '#818cf8',
    darkCanvas: '#0d0e20',
    lightCanvas: '#ebecfe',
  },
  {
    id: 'titanium',
    name: 'Titanium',
    swatch: '#3f3f46',
    swatchEnd: '#94a3b8',
    darkCanvas: '#0b0c0f',
    lightCanvas: '#eceef2',
  },
];

export function getThemeCanvasColor(mode: ColorMode, theme: ThemeId): string {
  const option = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];
  return mode === 'dark' ? option.darkCanvas : option.lightCanvas;
}

interface ThemeContextValue {
  mode: ColorMode;
  theme: ThemeId;
  soundEnabled: boolean;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
  setTheme: (theme: ThemeId) => void;
  toggleSound: () => void;
  playSound: (effect?: SoundEffect) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>(() => {
    try {
      const saved = localStorage.getItem('pbx_color_mode');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem('pbx_accent_theme') as ThemeId | null;
      if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
        return saved;
      }
      return 'sapphire';
    } catch {
      return 'sapphire';
    }
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('pbx_sound_enabled');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-theme', theme);

    const canvasColor = getThemeCanvasColor(mode, theme);
    root.style.backgroundColor = canvasColor;
    document.body.style.backgroundColor = canvasColor;

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', canvasColor);

    if (Capacitor.isNativePlatform()) {
      void (async () => {
        try {
          await StatusBar.setOverlaysWebView({ overlay: false });
          await StatusBar.setBackgroundColor({ color: canvasColor });
          await StatusBar.setStyle({
            style: mode === 'dark' ? Style.Dark : Style.Light,
          });
        } catch {
          // Ignore on platforms where StatusBar API is restricted
        }
      })();
    }

    try {
      localStorage.setItem('pbx_color_mode', mode);
      localStorage.setItem('pbx_accent_theme', theme);
    } catch {
      // Ignore storage failures
    }
  }, [mode, theme]);

  useEffect(() => {
    try {
      localStorage.setItem('pbx_sound_enabled', String(soundEnabled));
    } catch {
      // Ignore storage failures
    }
  }, [soundEnabled]);

  // Listen on trusted `click` events ONLY (so pointerdown NEVER steals debounce from click on mobile Chrome!)
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!soundEnabled) return;
      unlockAudioEngine();

      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-no-tap-sound="true"]')) return;

      const interactive = target.closest(
        'button:not(:disabled), a[href], [role="button"], input, select, textarea, label'
      );
      if (interactive) {
        playTactileSound('tap');
      }
    };

    document.addEventListener('click', handleClick, { capture: true });

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [soundEnabled]);

  const playSound = useCallback(
    (effect: SoundEffect = 'tap') => {
      if (soundEnabled) {
        unlockAudioEngine();
        playTactileSound(effect);
      }
    },
    [soundEnabled]
  );

  const setMode = (next: ColorMode) => {
    setModeState(next);
    if (soundEnabled) {
      unlockAudioEngine();
      playTactileSound('toggle');
    }
  };

  const toggleMode = () => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
    if (soundEnabled) {
      unlockAudioEngine();
      playTactileSound('toggle');
    }
  };

  const setTheme = (next: ThemeId) => {
    setThemeState(next);
    if (soundEnabled) {
      unlockAudioEngine();
      playTactileSound('toggle');
    }
  };

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (next) {
        unlockAudioEngine();
        playTactileSound('toggle');
      }
      return next;
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        theme,
        soundEnabled,
        setMode,
        toggleMode,
        setTheme,
        toggleSound,
        playSound,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return ctx;
}
