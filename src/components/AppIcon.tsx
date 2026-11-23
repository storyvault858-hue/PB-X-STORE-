import React, { useEffect, useState } from 'react';
import { Package } from 'lucide-react';

interface AppIconProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AppIcon({ src, name, size = 'md' }: AppIconProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const sizeClass =
    size === 'sm'
      ? 'w-11 h-11 rounded-xl text-sm'
      : size === 'lg'
        ? 'w-16 h-16 rounded-2xl text-xl'
        : 'w-12 h-12 rounded-xl text-base';

  const initials = (name || 'App')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const showImg = Boolean(src && src.trim().length > 0 && !failed);

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-[var(--border-strong)] ${sizeClass} flex items-center justify-center`}
      style={{
        background: showImg
          ? 'var(--surface-inset)'
          : 'linear-gradient(145deg, var(--accent-soft), var(--surface-inset))',
        boxShadow:
          'inset 0 1px 0 var(--highlight-top), 0 4px 10px -2px rgba(0, 0, 0, 0.25)',
      }}
    >
      {showImg ? (
        <img
          src={src}
          alt={`${name} icon`}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-[var(--accent)] font-bold select-none">
          {initials ? (
            <span>{initials}</span>
          ) : (
            <Package className="w-5 h-5 opacity-80" />
          )}
        </div>
      )}
    </div>
  );
}
