import React from 'react';

interface RootLineProps {
  className?: string;
  variant?: 'vertical' | 'subtle-curve' | 'horizontal-divider';
  color?: string;
}

/**
 * Proprietary visual motif inspired by the old ficus roots connected to the house.
 * An abstract, very thin, irregular, elegant organic line reminiscent of an architect's sketchbook.
 * Not a tree, not leaves, no literal roots.
 */
export function RootLine({
  className = '',
  variant = 'vertical',
  color = '#7B6045',
}: RootLineProps) {
  if (variant === 'vertical') {
    return (
      <div className={`pointer-events-none select-none overflow-visible ${className}`} aria-hidden="true">
        <svg
          viewBox="0 0 40 400"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full stroke-current overflow-visible opacity-30"
          style={{ stroke: color }}
        >
          <path
            d="M20 0 C19 40, 24 90, 18 140 C12 190, 23 240, 19 290 C16 330, 22 370, 20 400"
            strokeWidth="0.85"
            strokeDasharray="1 0"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'subtle-curve') {
    return (
      <div className={`pointer-events-none select-none overflow-visible ${className}`} aria-hidden="true">
        <svg
          viewBox="0 0 240 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full stroke-current overflow-visible opacity-25"
          style={{ stroke: color }}
        >
          <path
            d="M0 40 C60 35, 110 52, 170 30 C205 18, 230 42, 240 40"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  // horizontal subtle divider with organic variation
  return (
    <div className={`pointer-events-none select-none overflow-hidden my-6 ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 600 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-3 stroke-current opacity-30"
        style={{ stroke: color }}
        preserveAspectRatio="none"
      >
        <path
          d="M0 6 Q150 4, 300 7 T600 6"
          strokeWidth="0.75"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/**
 * Editorial Time Line: 1882 ────────────── 2026
 * An abstract, poetic graphic thread expressing layers of time.
 */
export function TimeLineMotif({
  className = '',
  light = false,
  startYear = '1882',
  endYear = '2026',
}: {
  className?: string;
  light?: boolean;
  startYear?: string;
  endYear?: string;
}) {
  const textColor = light ? 'text-[#DED5C8]/80' : 'text-[#7B6045]';
  const lineColor = light ? 'border-[#DED5C8]/40' : 'border-[#A18A70]/50';

  return (
    <div
      dir="rtl"
      className={`flex items-center gap-3 font-mono text-[10px] sm:text-[11px] tracking-widest uppercase select-none ${textColor} ${className}`}
      aria-label={`${startYear} עד ${endYear}`}
    >
      <span className="font-medium shrink-0"><bdi>{startYear}</bdi></span>
      <span className={`grow border-t ${lineColor} min-w-[36px] sm:min-w-[60px]`} />
      <span className="font-light shrink-0 text-[9px] sm:text-[10px] tracking-[0.25em] opacity-80">
        שכבות של זמן
      </span>
      <span className={`grow border-t ${lineColor} min-w-[36px] sm:min-w-[60px]`} />
      <span className="font-medium shrink-0"><bdi>{endYear}</bdi></span>
    </div>
  );
}

export function EditorialTag({
  children,
  className = '',
  light = false,
}: {
  children: React.ReactNode;
  className?: string;
  light?: boolean;
}) {
  // If children is a string with "02 · המפגש", isolate the number and the Hebrew text
  let content = children;
  if (typeof children === 'string') {
    const match = children.match(/^(\d+)\s*·\s*(.+)$/);
    if (match) {
      content = (
        <>
          <bdi>{match[1]}</bdi> · <span>{match[2]}</span>
        </>
      );
    }
  }

  return (
    <span
      dir="rtl"
      className={`inline-block font-sans text-[11px] sm:text-[12px] tracking-[0.2em] uppercase font-normal select-none text-right ${
        light ? 'text-[#DED5C8]/80' : 'text-[#7B6045]'
      } ${className}`}
    >
      {content}
    </span>
  );
}
