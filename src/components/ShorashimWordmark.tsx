import React from 'react';

export type WordmarkVariant = 'hero' | 'header' | 'footer';
export type WordmarkTheme = 'light' | 'dark' | 'tobacco';

interface ShorashimWordmarkProps {
  variant?: WordmarkVariant;
  theme?: WordmarkTheme;
  className?: string;
  onClick?: () => void;
  id?: string;
  showSubtitle?: boolean;
}

/**
 * SHORASHIM (שורשים) WORDMARK
 * 
 * Concept:
 * - OLD SOUL × CONTEMPORARY ELEGANCE.
 * - Warm, refined, editorial, timeless, slightly romantic, cultured, Mediterranean.
 * - Based on a high-contrast contemporary Hebrew serif with beautiful thin strokes.
 * - Subtle signature gesture on Resh (ר) with refined optical rhythm and delicate crown curve.
 * - Available in calibrated formats:
 *   A. PRIMARY ('hero' / 'footer'): 72–82px scale, refined stroke contrast, warm ivory.
 *   B. SMALL ('header'): specifically optimized for the sticky header navigation.
 *      Colors:
 *      - "שורשים": #665548 (exact same warm brown as the navigation menu text)
 *      - "זכרון יעקב": #9A806B (subtle and lighter warm brown)
 */
export default function ShorashimWordmark({
  variant = 'hero',
  theme = 'light',
  className = '',
  onClick,
  id,
  showSubtitle = false,
}: ShorashimWordmarkProps) {
  // Theme coloring:
  // 'light' on photography = warm ivory #F4EFE5
  // 'dark' on parchment/ivory = warm brown #665548 (exact match with navigation menu text)
  // 'tobacco' = #665548
  const textColor =
    theme === 'light'
      ? 'text-[#F4EFE5]'
      : 'text-[#665548]';

  // Small wordmark optimized specifically for Header Navigation after scroll
  if (variant === 'header') {
    return (
      <div
        id={id}
        onClick={onClick}
        className={`flex flex-col select-none cursor-pointer group ${className}`}
      >
        <span className="sr-only">שורשים</span>
        <span
          aria-hidden="true"
          className={`font-wordmark-serif font-medium tracking-[0.035em] text-[1.35rem] sm:text-[1.45rem] leading-none transition-colors duration-300 ${textColor}`}
        >
          <span>ש</span>
          <span className="inline-block px-[0.5px]">ו</span>
          <span className="inline-block px-[0.5px] font-normal">ר</span>
          <span className="inline-block px-[0.5px]">ש</span>
          <span className="inline-block px-[0.5px]">י</span>
          <span>ם</span>
        </span>
        {showSubtitle && (
          <span className="text-[10px] font-sans tracking-[0.14em] text-[#9A806B] font-light mt-0.5 leading-none">
            זכרון יעקב
          </span>
        )}
      </div>
    );
  }

  // Primary Wordmark for Hero & Footer
  // The page's one <h1> is the hero wordmark; elsewhere the same mark is plain text.
  const Tag = variant === 'hero' ? 'h1' : 'p';
  return (
    <div
      id={id}
      onClick={onClick}
      className={`font-wordmark-serif select-none inline-block ${textColor} ${className}`}
    >
      <Tag
        className={`${
          variant === 'hero' ? 'text-[3.75rem] sm:text-[4.5rem] md:text-[4.75rem] lg:text-[5.1rem]' : 'text-[3rem] sm:text-[3.5rem]'
        } whitespace-nowrap font-normal tracking-[0.035em] leading-[0.95] text-inherit m-0 p-0`}
      >
        {/* Letter-by-letter spans can be read out one letter at a time; screen readers get the word. */}
        <span className="sr-only">שורשים</span>
        <span aria-hidden="true">
        <span className="inline-block">ש</span>
        <span className="inline-block px-[1px] sm:px-[2px]">ו</span>
        {/* Subtle signature gesture: delicate editorial curve & spacing on Resh */}
        <span className="inline-block px-[1px] sm:px-[2px] font-light">ר</span>
        <span className="inline-block px-[1px] sm:px-[2px]">ש</span>
        <span className="inline-block px-[1px] sm:px-[2px]">י</span>
        <span className="inline-block">ם</span>
        </span>
      </Tag>
    </div>
  );
}

