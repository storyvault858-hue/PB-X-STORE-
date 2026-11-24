import React from 'react';
import { motion } from 'motion/react';

interface BrandEmblem3DProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export function BrandEmblem3D({ size = 'md', animated = false }: BrandEmblem3DProps) {
  const dims =
    size === 'sm'
      ? 'w-8 h-8 rounded-[10px] text-[11px]'
      : size === 'lg'
        ? 'w-16 h-16 sm:w-20 sm:h-20 rounded-[20px] sm:rounded-[24px] text-xl sm:text-2xl'
        : 'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-base sm:text-lg';

  const depthOffset = size === 'sm' ? '2.5px' : size === 'lg' ? '6px' : '4px';

  const emblemFace = (
    <div className="relative inline-flex select-none">
      {/* Rotating precision halo ring on animated hero emblem */}
      {animated && size === 'lg' && (
        <div
          aria-hidden="true"
          className="absolute -inset-2 sm:-inset-2.5 rounded-[25px] sm:rounded-[30px] pointer-events-none opacity-65 animate-orbit"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0%, var(--accent-bright) 28%, transparent 55%, var(--accent) 82%, transparent 100%)',
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            padding: '2px',
          }}
        />
      )}

      {/* Soft back ambient depth extrusion */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 ${dims} opacity-80`}
        style={{
          background: 'var(--accent-lip)',
          transform: `translateY(${depthOffset}) scale(0.95)`,
          boxShadow: '0 16px 32px -6px var(--accent-glow)',
        }}
      />

      {/* Primary sculpted 3D metallic face */}
      <div
        className={`relative ${dims} flex items-center justify-center font-extrabold tracking-tight overflow-hidden border border-white/25`}
        style={{
          background:
            'linear-gradient(135deg, var(--accent-bright) 0%, var(--accent) 58%, var(--accent-lip) 100%)',
          color: 'var(--accent-text-on)',
          boxShadow:
            'inset 0 1.5px 0 rgba(255,255,255,0.45), inset 0 -2px 5px rgba(0,0,0,0.28)',
        }}
      >
        {/* Top specular glass bevel */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[48%] pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0) 100%)',
          }}
        />

        {/* Diagonal metallic sheen sweep */}
        {animated && (
          <div
            aria-hidden="true"
            className="absolute inset-y-0 w-1/2 bg-white/30 blur-[2px] pointer-events-none animate-sheen"
          />
        )}

        <span className="relative z-10 tracking-[-0.04em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.28)]">
          PB
        </span>
      </div>
    </div>
  );

  if (!animated) {
    return emblemFace;
  }

  return (
    <motion.div
      style={{ perspective: 700 }}
      animate={{
        y: [0, -7, 0],
        rotateX: [6, 14, 6],
        rotateY: [-12, 10, -12],
      }}
      transition={{
        duration: 4.8,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      whileHover={{ scale: 1.06, rotateY: 0, rotateX: 0 }}
      whileTap={{ scale: 0.94 }}
      className="inline-flex cursor-pointer"
    >
      {emblemFace}
    </motion.div>
  );
}
