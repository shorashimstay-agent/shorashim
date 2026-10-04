import React from 'react';

interface IllustrationProps {
  className?: string;
  color?: string;
}

/**
 * 1. לישון טוב — A beautifully sketched vintage bed with linen
 * Fine hand-drawn ink style with subtle engraving hatching, curved headboard,
 * ruffled pillows and soft organic drapery of sheets.
 */
export function BedLinenIllustration({
  className = 'w-14 h-14',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`overflow-visible select-none ${className}`}
      aria-hidden="true"
    >
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Vintage Headboard posts */}
        <path d="M12 20 L12 66 M10 20 L14 20 M12 17 C12 15 10 14 12 13 C14 14 12 15 12 17" strokeWidth="1.2" />
        <path d="M68 20 L68 66 M66 20 L70 20 M68 17 C68 15 66 14 68 13 C70 14 68 15 68 17" strokeWidth="1.2" />
        
        {/* Headboard top arched rail */}
        <path d="M12 26 C28 20 52 20 68 26" strokeWidth="1.1" />
        <path d="M12 31 C28 25 52 25 68 31" strokeWidth="0.8" />
        {/* Headboard inner spindles & hatching */}
        <path d="M22 25 L22 45 M30 23.5 L30 44 M40 22.5 L40 44 M50 23.5 L50 44 M58 25 L58 45" strokeWidth="0.75" />
        <path d="M25 24 L25 35 M35 23 L35 34 M45 23 L45 34 M55 24 L55 35" strokeWidth="0.5" strokeDasharray="1 1.5" />

        {/* Mattress base rail */}
        <path d="M12 46 C26 45 54 45 68 46" strokeWidth="1.2" />

        {/* Soft linen pillows with organic crease folds */}
        <path d="M18 43 C19 36 29 36 37 38 C38 43 32 45 20 45 Z" strokeWidth="0.9" />
        <path d="M23 40 C27 39 31 40 33 42" strokeWidth="0.6" />
        
        <path d="M43 38 C51 36 61 36 62 43 C50 45 44 43 43 38 Z" strokeWidth="0.9" />
        <path d="M47 42 C49 40 53 39 57 40" strokeWidth="0.6" />

        {/* Soft turned-down duvet fold */}
        <path d="M14 47 C24 44 42 45 66 47 C65 52 50 51 14 52 Z" strokeWidth="1" />
        <path d="M20 48.5 C34 47 48 47.5 60 48.5" strokeWidth="0.6" />

        {/* Main bedspread falling softly */}
        <path d="M14 52 C15 58 17 62 18 64 C35 63 45 63 62 64 C63 62 65 58 66 52" strokeWidth="1.1" />

        {/* Organic draped folds on the sides */}
        <path d="M18 64 C17 67 15 68 13 69" strokeWidth="0.9" />
        <path d="M62 64 C63 67 65 68 67 69" strokeWidth="0.9" />
        <path d="M18 54 C19 58 20 62 21 64" strokeWidth="0.6" />
        <path d="M62 54 C61 58 60 62 59 64" strokeWidth="0.6" />
        <path d="M38 53 C38 57 37 61 37 63" strokeWidth="0.5" />
        <path d="M42 53 C42 57 43 61 43 63" strokeWidth="0.5" />

        {/* Delicate vintage bed footboard posts & finials */}
        <path d="M16 50 L16 71" strokeWidth="1.2" />
        <path d="M64 50 L64 71" strokeWidth="1.2" />
        <path d="M16 50 C16 48 14 47 16 46 C18 47 16 48 16 50" strokeWidth="0.8" />
        <path d="M64 50 C64 48 62 47 64 46 C66 47 64 48 64 50" strokeWidth="0.8" />

        {/* Soft floor shadow hatching */}
        <path d="M14 71 L22 71 M58 71 L66 71" strokeWidth="0.8" />
        <path d="M24 70 C36 71 44 71 56 70" strokeWidth="0.5" strokeDasharray="2 2" />
      </g>
    </svg>
  );
}

/**
 * 2. בוקר בשורשים — A hand-drawn vintage moka pot and delicate cup
 * Vintage Italian stovetop espresso pot, gentle wisp of steam, porcelain espresso cup & saucer.
 */
export function CoffeePotIllustration({
  className = 'w-14 h-14',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`overflow-visible select-none ${className}`}
      aria-hidden="true"
    >
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Moka pot top knob & lid */}
        <circle cx="33" cy="18" r="2" strokeWidth="1" />
        <path d="M25 25 L33 20 L41 25 Z" strokeWidth="1" />
        <path d="M23 25 L43 25" strokeWidth="1.1" />

        {/* Upper chamber (faceted octagonal lines) */}
        <path d="M23 25 L26 40 L40 40 L43 25" strokeWidth="1.1" />
        <path d="M28 25 L30 40" strokeWidth="0.65" />
        <path d="M33 25 L33 40" strokeWidth="0.8" />
        <path d="M38 25 L36 40" strokeWidth="0.65" />

        {/* Spout */}
        <path d="M23 26 L17 28 L23 34" strokeWidth="1" />

        {/* Curving vintage handle with rivet */}
        <path d="M43 27 C50 28 51 38 44 42 L42 41" strokeWidth="1.2" />
        <circle cx="43" cy="29" r="0.75" fill={color} />

        {/* Middle waist band */}
        <path d="M25 40 L41 40" strokeWidth="1.4" />
        <path d="M27 42 L39 42" strokeWidth="0.9" />

        {/* Lower water boiler chamber */}
        <path d="M27 42 L24 58 L42 58 L39 42" strokeWidth="1.1" />
        <path d="M29 42 L27.5 58" strokeWidth="0.6" />
        <path d="M33 42 L33 58" strokeWidth="0.75" />
        <path d="M37 42 L38.5 58" strokeWidth="0.6" />

        {/* Safety valve detail */}
        <circle cx="26" cy="48" r="1" strokeWidth="0.75" />

        {/* Base ring */}
        <path d="M23 58 L43 58" strokeWidth="1.2" />
        <path d="M25 60 L41 60" strokeWidth="0.8" />

        {/* Delicate cup and saucer */}
        {/* Saucer */}
        <ellipse cx="58" cy="62" rx="14" ry="3" strokeWidth="1" />
        <path d="M48 62 C52 64 64 64 68 62" strokeWidth="0.6" />

        {/* Cup body */}
        <path d="M49 53 C50 60 54 62 58 62 C62 62 66 60 67 53 Z" strokeWidth="1" />
        <ellipse cx="58" cy="53" rx="9" ry="2" strokeWidth="0.8" />
        {/* Cup handle */}
        <path d="M67 54 C71 55 71 59 66 60" strokeWidth="0.9" />

        {/* Liquid level inside cup */}
        <path d="M51 53.5 C53 54.5 63 54.5 65 53.5" strokeWidth="0.6" />

        {/* Delicate organic steam wisps */}
        <path d="M31 14 C33 11 31 8 33 5" strokeWidth="0.65" strokeDasharray="1.5 1.5" />
        <path d="M57 48 C59 44 56 42 58 39" strokeWidth="0.6" strokeDasharray="1.5 1.5" />

        {/* Tabletop shadow hatching */}
        <path d="M19 63 L45 63" strokeWidth="0.5" strokeDasharray="2 2" />
        <path d="M48 65 L68 65" strokeWidth="0.5" strokeDasharray="2 2" />
      </g>
    </svg>
  );
}

/**
 * 3. חצר ומרפסת — Garden chair with a delicate botanical branch
 * Architectural sketch of a vintage garden bistro chair entwined with an olive / ficus leaf stem.
 */
export function GardenChairIllustration({
  className = 'w-14 h-14',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`overflow-visible select-none ${className}`}
      aria-hidden="true"
    >
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Garden Chair: Arched curved backrest */}
        <path d="M22 16 C30 11 44 11 52 16 L50 44 L24 44 Z" strokeWidth="1.1" />
        <path d="M25 20 C32 16 42 16 49 20" strokeWidth="0.75" />

        {/* Vintage back slats with subtle cross-brace */}
        <path d="M30 17 L31 44" strokeWidth="0.75" />
        <path d="M37 15 L37 44" strokeWidth="0.75" />
        <path d="M44 17 L43 44" strokeWidth="0.75" />
        <path d="M26 28 C34 26 40 26 48 28" strokeWidth="0.6" />

        {/* Round woven chair seat */}
        <ellipse cx="37" cy="46" rx="16" ry="4.5" strokeWidth="1.2" />
        <path d="M23 46 C27 49 47 49 51 46" strokeWidth="0.75" />
        {/* Seat woven hatching */}
        <path d="M29 45 C32 47 42 47 45 45" strokeWidth="0.5" />
        <path d="M33 43 L41 49" strokeWidth="0.4" strokeDasharray="1 1" />
        <path d="M41 43 L33 49" strokeWidth="0.4" strokeDasharray="1 1" />

        {/* Elegant slender curved metal legs */}
        <path d="M24 48 L19 72" strokeWidth="1.1" />
        <path d="M50 48 L55 72" strokeWidth="1.1" />
        <path d="M31 49 L30 68" strokeWidth="0.9" />
        <path d="M43 49 L44 68" strokeWidth="0.9" />

        {/* Leg cross stretchers */}
        <path d="M21 62 C29 64 45 64 53 62" strokeWidth="0.75" />

        {/* Delicate botanical olive / ficus leafy branch draping across */}
        <path d="M46 64 C52 56 56 42 66 32 C70 28 73 24 75 19" strokeWidth="0.95" />
        
        {/* Leaf 1 */}
        <path d="M66 32 C69 31 72 33 71 36 C68 37 66 35 66 32 Z" strokeWidth="0.8" />
        <path d="M66 32 L70 35" strokeWidth="0.4" />

        {/* Leaf 2 */}
        <path d="M60 40 C63 39 67 41 66 45 C62 45 60 42 60 40 Z" strokeWidth="0.8" />
        <path d="M60 40 L64 43" strokeWidth="0.4" />

        {/* Leaf 3 */}
        <path d="M54 50 C58 50 61 53 59 56 C56 56 54 53 54 50 Z" strokeWidth="0.8" />

        {/* Top leaves */}
        <path d="M72 23 C76 21 78 23 77 27 C74 27 72 25 72 23 Z" strokeWidth="0.8" />
        <path d="M75 19 C76 15 78 14 80 15 C79 19 77 19 75 19 Z" strokeWidth="0.8" />

        {/* Ground shadow */}
        <path d="M16 72 L23 72 M51 72 L58 72" strokeWidth="0.7" />
        <path d="M27 72 C35 73 40 73 48 72" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
      </g>
    </svg>
  );
}

/**
 * 4. פרטיות ושקט — Antique skeleton key and stone arch doorway
 * An intricate historic brass key resting beside an arched stone portal sketch.
 */
export function KeyDoorwayIllustration({
  className = 'w-14 h-14',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`overflow-visible select-none ${className}`}
      aria-hidden="true"
    >
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Heritage Arched Stone Portal (Background Architectural Sketch) */}
        <path d="M16 70 L16 36 C16 20 48 20 48 36 L48 70" strokeWidth="0.85" strokeDasharray="3 1" />
        <path d="M12 70 L12 36 C12 16 52 16 52 36 L52 70" strokeWidth="0.6" />
        {/* Stone voussoir arch hatchings */}
        <path d="M14 28 L19 30 M20 21 L24 25 M32 17 L32 22 M44 21 L40 25 M50 28 L45 30" strokeWidth="0.5" />
        {/* Ground threshold */}
        <path d="M10 70 L54 70" strokeWidth="0.8" />

        {/* Inner door panel planks */}
        <path d="M22 40 L22 68 M32 38 L32 68 M42 40 L42 68" strokeWidth="0.45" strokeDasharray="2 2" />

        {/* Foreground: Antique Skeleton Key (Hero Illustration) */}
        {/* Key Bow (Ornate Vintage Ring) */}
        <circle cx="56" cy="25" r="9" strokeWidth="1.2" />
        <circle cx="56" cy="25" r="5" strokeWidth="0.85" />
        <circle cx="56" cy="25" r="2" strokeWidth="0.6" />
        {/* Ornate bow clover lobes */}
        <path d="M56 16 C54 13 58 13 56 16" strokeWidth="0.8" />
        <path d="M65 25 C68 23 68 27 65 25" strokeWidth="0.8" />
        <path d="M47 25 C44 23 44 27 47 25" strokeWidth="0.8" />

        {/* Key Collar */}
        <path d="M53 34 L59 34" strokeWidth="1.2" />
        <path d="M54 36 L58 36" strokeWidth="0.9" />

        {/* Key Barrel / Stem running diagonally */}
        <path d="M56 36 L36 68" strokeWidth="1.4" />
        <path d="M57 37 L37 69" strokeWidth="0.6" />

        {/* Key Tip / Finial */}
        <circle cx="34.5" cy="70" r="1.5" strokeWidth="0.8" />

        {/* Key Bit (Intricate Antique Cuts & Wards) */}
        <path d="M41 60 L33 55 L35 52 L38 54 L39 52 L42 54 L44 51 L47 53 L45 56 L43 57" strokeWidth="1.1" />
        <rect x="36" y="55" width="2" height="2" strokeWidth="0.6" />

        {/* Subtle engraving drop shadow for the key */}
        <path d="M40 71 C44 72 52 71 58 68" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
      </g>
    </svg>
  );
}

/**
 * 5. רחצה — Delicate shower droplets, folded organic linen towels & botanical bottle
 * Rainfall shower, soft stacked linen towels, and an apothecary bath bottle.
 */
export function BathLinenIllustration({
  className = 'w-14 h-14',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`overflow-visible select-none ${className}`}
      aria-hidden="true"
    >
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Rainfall Showerhead Arm from top right */}
        <path d="M68 8 L46 8 C42 8 40 10 40 14 L40 18" strokeWidth="1.2" />
        
        {/* Wide Vintage Dome Showerhead */}
        <path d="M26 23 C30 18 50 18 54 23 Z" strokeWidth="1.1" />
        <ellipse cx="40" cy="23" rx="14" ry="2.5" strokeWidth="1" />
        
        {/* Delicate rainfall droplets */}
        <path d="M30 29 L30 32 M35 27 L35 34 M40 28 L40 36 M45 27 L45 33 M50 29 L50 32" strokeWidth="0.75" />
        <path d="M32 37 L32 39 M38 40 L38 43 M44 38 L44 41 M48 36 L48 39" strokeWidth="0.6" strokeDasharray="1 2" />

        {/* Stack of soft folded linen towels */}
        {/* Top Towel with organic curve & fringe */}
        <path d="M16 46 C22 44 40 44 48 46 C49 49 47 52 46 53 C38 51 22 51 16 53 C14 51 14 48 16 46 Z" strokeWidth="1" />
        <path d="M17 50 C23 48 37 48 44 50" strokeWidth="0.6" />
        {/* Towel fold crease & fringe */}
        <path d="M15 48 L13 48 M15 50 L13 50 M15 52 L13 52" strokeWidth="0.5" />

        {/* Middle Towel */}
        <path d="M15 53 C22 51 42 51 50 53 C51 56 49 59 48 60 C40 58 21 58 15 60 C13 58 13 55 15 53 Z" strokeWidth="1" />
        <path d="M17 57 C24 55 39 55 46 57" strokeWidth="0.6" />

        {/* Bottom Thick Towel */}
        <path d="M14 60 C21 58 44 58 52 60 C53 64 51 68 50 69 C41 67 20 67 14 69 C12 66 12 62 14 60 Z" strokeWidth="1.1" />
        <path d="M16 65 C24 63 41 63 48 65" strokeWidth="0.6" />

        {/* Apothecary botanical bath bottle on the side */}
        <path d="M58 52 L58 68 C58 69 66 69 66 68 L66 52 C66 49 58 49 58 52 Z" strokeWidth="1" />
        {/* Bottle neck & vintage stopper */}
        <path d="M60 49 L60 46 L64 46 L64 49" strokeWidth="0.9" />
        <circle cx="62" cy="44" r="2" strokeWidth="0.8" />
        {/* Bottle label */}
        <rect x="60" y="55" width="4" height="7" strokeWidth="0.6" />
        <path d="M61 58 L63 58 M61 60 L63 60" strokeWidth="0.4" />

        {/* Shelf line & subtle shadow */}
        <path d="M10 70 L72 70" strokeWidth="0.9" />
        <path d="M14 72 L68 72" strokeWidth="0.5" strokeDasharray="2 2" />
      </g>
    </svg>
  );
}

/**
 * 6. להישאר מחוברים — Vintage radio, open journal & fountain pen
 * Mid-century tabletop radio, open notebook / travel journal, evoking relaxed unhurried connection.
 */
export function VintageRadioIllustration({
  className = 'w-14 h-14',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`overflow-visible select-none ${className}`}
      aria-hidden="true"
    >
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Antenna tilted */}
        <path d="M26 28 L42 12" strokeWidth="0.9" />
        <circle cx="43" cy="11" r="1" strokeWidth="0.8" />

        {/* Vintage Tabletop Radio Wooden Casing */}
        <rect x="18" y="28" width="44" height="28" rx="3" strokeWidth="1.2" />
        <rect x="21" y="31" width="38" height="22" rx="1.5" strokeWidth="0.75" />

        {/* Speaker cloth grille (horizontal hatched acoustic slats) */}
        <path d="M24 35 L40 35 M24 38 L40 38 M24 41 L40 41 M24 44 L40 44 M24 47 L40 47 M24 50 L40 50" strokeWidth="0.65" />

        {/* Radio Tuning Dial */}
        <circle cx="49" cy="38" r="5" strokeWidth="0.9" />
        <circle cx="49" cy="38" r="2" strokeWidth="0.6" />
        <path d="M49 34 L49 36 M53 38 L51 38 M49 42 L49 40 M45 38 L47 38" strokeWidth="0.5" />

        {/* Smaller Volume Knob */}
        <circle cx="49" cy="48" r="2.5" strokeWidth="0.8" />
        <path d="M49 46.5 L49 48" strokeWidth="0.6" />

        {/* Radio legs */}
        <path d="M22 56 L20 60 M58 56 L60 60" strokeWidth="1.1" />

        {/* Open Travel Journal / Notebook in front */}
        {/* Left page */}
        <path d="M24 64 C28 62 38 62 40 64 L39 72 C37 70 27 70 23 72 Z" strokeWidth="0.85" />
        {/* Right page */}
        <path d="M40 64 C42 62 52 62 56 64 L57 72 C53 70 43 70 41 72 Z" strokeWidth="0.85" />
        {/* Journal spine */}
        <path d="M40 64 L40 72" strokeWidth="1" />
        {/* Text line indications */}
        <path d="M26 66 L36 66 M26 68 L34 68 M44 66 L54 66 M44 68 L52 68" strokeWidth="0.4" strokeDasharray="1 1" />

        {/* Slanted vintage fountain pen */}
        <path d="M52 60 L64 69" strokeWidth="0.9" />
        <path d="M64 69 L67 71 L65 68" strokeWidth="0.8" />
        <circle cx="52" cy="60" r="0.75" fill={color} />

        {/* Tabletop baseline */}
        <path d="M14 62 L18 62 M62 62 L68 62" strokeWidth="0.6" />
        <path d="M16 73 L66 73" strokeWidth="0.5" strokeDasharray="2 2" />
      </g>
    </svg>
  );
}

/**
 * ZICHRON LOCAL GUIDE ILLUSTRATIONS
 * Fine line, vintage engraving influence, warm brown / sepia, transparent background.
 */

// 1. Wine & Vineyards (יין וכרמים)
export function WineGuideIllustration({
  className = 'w-9 h-9',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Vintage Wine Bottle */}
        <path d="M22 18 L22 14 L26 14 L26 18 C26 22 20 25 20 30 L20 50 C20 51.5 28 51.5 28 50 L28 30 C28 25 22 22 22 18" strokeWidth="1" />
        <path d="M21 15 L27 15" strokeWidth="0.8" />
        {/* Bottle label */}
        <rect x="22" y="34" width="4" height="8" strokeWidth="0.6" />
        <path d="M23 37 L25 37 M23 39 L25 39" strokeWidth="0.4" />

        {/* Slender Wine Glass */}
        <path d="M37 26 C37 34 43 34 43 26 Z" strokeWidth="1" />
        <ellipse cx="40" cy="26" rx="3" ry="0.8" strokeWidth="0.75" />
        <path d="M40 34 L40 46" strokeWidth="0.9" />
        <path d="M36 46 L44 46" strokeWidth="1" />
        {/* Liquid level */}
        <path d="M38 30 C39 31 41 31 42 30" strokeWidth="0.6" />

        {/* Delicate Grape cluster & leaf */}
        <circle cx="33" cy="40" r="1.5" strokeWidth="0.7" />
        <circle cx="36" cy="40" r="1.5" strokeWidth="0.7" />
        <circle cx="34.5" cy="43" r="1.5" strokeWidth="0.7" />
        <circle cx="32" cy="43" r="1.5" strokeWidth="0.7" />
        <circle cx="33.5" cy="46" r="1.4" strokeWidth="0.7" />
        {/* Vine leaf */}
        <path d="M29 36 C28 32 32 30 35 32 C34 35 31 36 29 36 Z" strokeWidth="0.6" />
        <path d="M30 36 L34 32" strokeWidth="0.4" />

        {/* Ground shadow */}
        <path d="M16 52 L48 52" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
      </g>
    </svg>
  );
}

// 2. Coffee & Bakery (קפה ובוקר)
export function CoffeeGuideIllustration({
  className = 'w-9 h-9',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Saucer */}
        <ellipse cx="30" cy="46" rx="18" ry="3.5" strokeWidth="1" />
        <path d="M18 46 C22 48.5 38 48.5 42 46" strokeWidth="0.6" />

        {/* Vintage Porcelain Cup */}
        <path d="M18 32 C19 42 24 45 30 45 C36 45 41 42 42 32 Z" strokeWidth="1.1" />
        <ellipse cx="30" cy="32" rx="12" ry="2.5" strokeWidth="0.9" />
        {/* Cup handle */}
        <path d="M42 33 C47 34 47 40 40 41" strokeWidth="1" />

        {/* Coffee surface */}
        <ellipse cx="30" cy="33" rx="10" ry="1.8" strokeWidth="0.5" />

        {/* Delicate steam wisps */}
        <path d="M26 26 C28 22 25 18 27 14" strokeWidth="0.7" strokeDasharray="1.5 1.5" />
        <path d="M34 25 C36 20 33 16 35 12" strokeWidth="0.7" strokeDasharray="1.5 1.5" />

        {/* Two coffee beans on side */}
        <ellipse cx="14" cy="48" rx="2.5" ry="1.5" transform="rotate(-20 14 48)" strokeWidth="0.7" />
        <path d="M12.5 47.5 C14 48 14.5 48.5 15.5 49" strokeWidth="0.5" />

        {/* Shadow */}
        <path d="M12 51 L48 51" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
      </g>
    </svg>
  );
}

// 3. Dining & Bistro (קולינריה ולאכול)
export function DiningGuideIllustration({
  className = 'w-9 h-9',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Round Bistro Plate */}
        <circle cx="30" cy="34" r="14" strokeWidth="1.1" />
        <circle cx="30" cy="34" r="10" strokeWidth="0.7" />
        <circle cx="30" cy="34" r="7" strokeWidth="0.45" strokeDasharray="1 1" />

        {/* Vintage Fork on Right */}
        <path d="M48 20 L48 48" strokeWidth="1" />
        <path d="M45 20 L45 27 C45 29 51 29 51 27 L51 20" strokeWidth="0.8" />
        <path d="M47 20 L47 27 M49 20 L49 27" strokeWidth="0.6" />

        {/* Vintage Knife on Left */}
        <path d="M12 48 L12 28 C12 21 15 20 15 28 L15 48" strokeWidth="0.9" />
        <path d="M11 48 L16 48" strokeWidth="0.8" />

        {/* Small olive branch garnish on plate */}
        <path d="M26 36 C30 33 34 35 34 32" strokeWidth="0.7" />
        <path d="M28 34 C27 32 29 31 30 33 Z" strokeWidth="0.5" />
        <path d="M31 35 C33 36 34 34 32 33 Z" strokeWidth="0.5" />

        {/* Table line */}
        <path d="M8 51 L52 51" strokeWidth="0.6" strokeDasharray="2 2" />
      </g>
    </svg>
  );
}

// 4. Cobblestone Moshava Walk (שיטוט וסמטאות)
export function CobblestoneWalkIllustration({
  className = 'w-9 h-9',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Slender Mediterranean Cypress tree */}
        <path d="M18 48 L18 16 C16 20 15 32 17 48" strokeWidth="0.8" />
        <path d="M18 14 C19 18 21 32 19 48" strokeWidth="0.8" />
        {/* Tree texture hatchings */}
        <path d="M16 26 C18 24 19 28 20 26 M16 34 C18 32 19 36 20 34 M17 42 C18 40 19 44 20 42" strokeWidth="0.5" />

        {/* Historic stone wall on side */}
        <path d="M12 48 L12 36 L15 36" strokeWidth="0.8" />
        <path d="M9 42 L12 42" strokeWidth="0.5" />

        {/* Winding cobblestone lane pathway */}
        <path d="M22 28 C26 34 26 42 22 50" strokeWidth="0.9" />
        <path d="M30 26 C36 34 40 44 48 50" strokeWidth="0.9" />

        {/* Cobblestones paving stones */}
        <ellipse cx="26" cy="38" rx="2.5" ry="1.2" strokeWidth="0.6" />
        <ellipse cx="32" cy="37" rx="3" ry="1.3" strokeWidth="0.6" />
        <ellipse cx="27" cy="43" rx="3.5" ry="1.4" strokeWidth="0.6" />
        <ellipse cx="35" cy="42" rx="3" ry="1.3" strokeWidth="0.6" />
        <ellipse cx="31" cy="47" rx="4" ry="1.5" strokeWidth="0.6" />
        <ellipse cx="40" cy="46" rx="3.5" ry="1.5" strokeWidth="0.6" />

        {/* Street lantern / lamppost hint on far side */}
        <path d="M44 20 L44 38 M41 22 L47 22 L44 18 Z" strokeWidth="0.8" />
        <path d="M44 38 L42 42 M44 38 L46 42" strokeWidth="0.6" />

        {/* Baseline */}
        <path d="M10 50 L50 50" strokeWidth="0.6" />
      </g>
    </svg>
  );
}

// 5. Historic Heritage Stone Portal (היסטוריה ומורשת)
export function HeritageBuildingIllustration({
  className = 'w-9 h-9',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* 1882 Arched stone building facade */}
        <path d="M14 48 L14 24 C14 14 46 14 46 24 L46 48" strokeWidth="1.1" />
        <path d="M10 48 L50 48" strokeWidth="1.2" />

        {/* Outer stone arch outline */}
        <path d="M11 26 C11 12 49 12 49 26" strokeWidth="0.75" />
        {/* Keystone at arch apex */}
        <path d="M28 11 L32 11 L31 16 L29 16 Z" strokeWidth="0.7" />

        {/* Arched Window with mullions */}
        <path d="M22 48 L22 28 C22 20 38 20 38 28 L38 48" strokeWidth="0.9" />
        <path d="M30 20 L30 48" strokeWidth="0.6" />
        <path d="M22 34 L38 34" strokeWidth="0.6" />
        <path d="M22 41 L38 41" strokeWidth="0.5" />

        {/* Stone blocks ashlar hatchings */}
        <path d="M14 30 L18 30 M42 30 L46 30" strokeWidth="0.5" />
        <path d="M14 38 L19 38 M41 38 L46 38" strokeWidth="0.5" />
        <path d="M14 44 L17 44 M43 44 L46 44" strokeWidth="0.5" />

        {/* Small olive branch above doorway */}
        <path d="M26 18 C30 17 34 18 34 18" strokeWidth="0.6" />
        <path d="M28 17 C29 15 31 16 30 18" strokeWidth="0.4" />

        {/* Base shadow */}
        <path d="M8 50 L52 50" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
      </g>
    </svg>
  );
}

/**
 * 12 BESPOKE AMENITY ILLUSTRATIONS (05 · מפרט ופרטים)
 * Vintage European travel journal / engraving style in warm brown (#7B6045).
 * Small, fine-line, transparent background.
 */

// 1. חדר שינה נפרד — Delicate vintage bed with pillows & draped linen
export function VintageBedAmenityIllustration({
  className = 'w-6 h-6',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Headboard posts */}
        <path d="M6 10 L6 34 M34 10 L34 34" strokeWidth="0.9" />
        <path d="M5 10 L7 10 M33 10 L35 10" strokeWidth="0.75" />
        <circle cx="6" cy="8.5" r="0.75" fill={color} />
        <circle cx="34" cy="8.5" r="0.75" fill={color} />
        {/* Arched headboard crest */}
        <path d="M6 14 C14 11 26 11 34 14" strokeWidth="0.8" />
        <path d="M12 13 L12 24 M20 12 L20 24 M28 13 L28 24" strokeWidth="0.6" strokeDasharray="1 1" />
        {/* Mattress frame & pillows */}
        <path d="M6 24 C14 23.5 26 23.5 34 24" strokeWidth="0.9" />
        <path d="M9 22 C10 19 16 19 18 22 Z" strokeWidth="0.7" />
        <path d="M22 22 C24 19 30 19 31 22 Z" strokeWidth="0.7" />
        {/* Turned down soft duvet */}
        <path d="M7 26 C15 25 25 25 33 26 C33 30 7 30 7 26" strokeWidth="0.85" />
        <path d="M7 26 L7 31 L33 31 L33 26" strokeWidth="0.75" />
        <path d="M11 27.5 C18 26.5 24 26.5 29 27.5" strokeWidth="0.5" />
      </g>
    </svg>
  );
}

// 2. מטבח מלא ומאובזר — Old kitchen utensils / rustic saucepan & whisk
export function VintageKitchenAmenityIllustration({
  className = 'w-6 h-6',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Vintage copper saucepan / casserole */}
        <path d="M8 22 C8 31 24 31 24 22 Z" strokeWidth="0.9" />
        <path d="M7 22 L25 22" strokeWidth="0.9" />
        <path d="M24 24 L33 22" strokeWidth="1" />
        {/* Pot lid handle */}
        <path d="M13 22 C13 19 19 19 19 22" strokeWidth="0.75" />
        <circle cx="16" cy="18" r="0.75" fill={color} />
        {/* Crossed wooden spoon & knife in background */}
        <path d="M28 8 L20 20" strokeWidth="0.8" />
        <ellipse cx="29.5" cy="6.5" rx="2" ry="1.2" transform="rotate(-40 29.5 6.5)" strokeWidth="0.75" />
        <path d="M12 9 L21 21" strokeWidth="0.75" />
        <path d="M11 8 C11 11 13 11 14 12" strokeWidth="0.7" />
        {/* Table line */}
        <path d="M5 33 L35 33" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
      </g>
    </svg>
  );
}

// 3. מרפסת גג פרטית — Garden chair with botanical branch & breeze hint
export function VintageRooftopAmenityIllustration({
  className = 'w-6 h-6',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Terrace railing / balustrade hint */}
        <path d="M5 32 L35 32" strokeWidth="0.8" />
        <path d="M5 25 L35 25" strokeWidth="0.5" strokeDasharray="1 1" />
        {/* Vintage garden wicker chair */}
        <path d="M11 13 C11 22 23 22 23 13" strokeWidth="0.85" />
        <path d="M11 22 L23 22" strokeWidth="0.9" />
        <path d="M13 22 L11 32 M21 22 L23 32" strokeWidth="0.85" />
        <path d="M17 13 L17 22" strokeWidth="0.5" strokeDasharray="1 1" />
        {/* Leafy branch blowing in the terrace breeze */}
        <path d="M24 28 C28 24 30 18 34 13" strokeWidth="0.75" />
        <path d="M28 22 C30 20 32 21 31 23 C29 23 28 22 28 22 Z" strokeWidth="0.6" />
        <path d="M31 17 C33 15 35 16 34 18 C32 18 31 17 31 17 Z" strokeWidth="0.6" />
      </g>
    </svg>
  );
}

// 4. חצר ירוקה ופוטוגנית — Ficus / olive botanical branch with leaves
export function VintageCourtyardAmenityIllustration({
  className = 'w-6 h-6',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Arched garden courtyard bower */}
        <path d="M8 32 C8 16 32 16 32 32" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
        {/* Organic leafy ficus branch */}
        <path d="M10 30 C15 25 20 18 28 10" strokeWidth="0.9" />
        {/* Leaves */}
        <path d="M14 25 C12 21 16 20 17 23 C16 25 14 25 14 25 Z" strokeWidth="0.7" />
        <path d="M18 20 C18 16 23 16 22 19 C21 21 19 20 18 20 Z" strokeWidth="0.7" />
        <path d="M22 16 C22 12 26 12 26 15 C25 17 23 16 22 16 Z" strokeWidth="0.7" />
        <path d="M26 11 C26 7 30 8 29 11 C28 12 27 11 26 11 Z" strokeWidth="0.7" />
        {/* Leaf veins */}
        <path d="M14 24 L16 22 M19 19 L21 18" strokeWidth="0.4" />
        {/* Base stone line */}
        <path d="M6 33 L34 33" strokeWidth="0.7" />
      </g>
    </svg>
  );
}

// 5. חדר רחצה מוקפד — Stacked linen towels & delicate water droplets
export function VintageBathroomAmenityIllustration({
  className = 'w-6 h-6',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Stack of folded soft plush towels */}
        <path d="M10 28 C10 25 28 25 30 25 C31 25 31 29 30 29 C28 29 10 29 10 28 Z" strokeWidth="0.85" />
        <path d="M9 25 C9 22 27 22 29 22 C30 22 30 25 29 25 C27 25 9 25 9 25 Z" strokeWidth="0.85" />
        <path d="M11 22 C11 19 26 19 28 19 C29 19 29 22 28 22 C26 22 11 22 11 22 Z" strokeWidth="0.85" />
        {/* Towel fold texture */}
        <path d="M12 20.5 L24 20.5 M11 23.5 L25 23.5 M12 27 L26 27" strokeWidth="0.4" strokeDasharray="1 1" />
        {/* Delicate pure water droplet above */}
        <path d="M20 7 C20 7 15 12 15 14 C15 16.5 17.2 18 20 18 C22.8 18 25 16.5 25 14 C25 12 20 7 20 7 Z" strokeWidth="0.8" />
        {/* Highlight inside drop */}
        <path d="M18 13 C17.5 14 17.5 15.5 18.5 16.5" strokeWidth="0.5" />
        {/* Shelf line */}
        <path d="M6 31 L34 31" strokeWidth="0.6" strokeDasharray="1.5 1.5" />
      </g>
    </svg>
  );
}

// 6. מכונת קפה איכותית — Vintage moka pot / coffee kettle & cup
export function VintageCoffeeAmenityIllustration({
  className = 'w-6 h-6',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Vintage Moka Pot */}
        {/* Top chamber */}
        <path d="M12 18 L10 24 L22 24 L20 18 Z" strokeWidth="0.85" />
        {/* Lid & knob */}
        <path d="M11 18 L16 15 L21 18" strokeWidth="0.8" />
        <circle cx="16" cy="14" r="0.75" fill={color} />
        {/* Spout */}
        <path d="M10 19 L7 21 L10 22" strokeWidth="0.75" />
        {/* Handle */}
        <path d="M21 18 C25 19 25 24 21 25" strokeWidth="0.8" />
        {/* Waist & Boiler base */}
        <path d="M13 24 L13 25 L19 25 L19 24" strokeWidth="0.75" />
        <path d="M11 25 L10 32 L22 32 L21 25 Z" strokeWidth="0.85" />
        {/* Small espresso cup alongside */}
        <path d="M26 27 C26 31 31 31 31 27 Z" strokeWidth="0.8" />
        <path d="M25 27 L32 27" strokeWidth="0.75" />
        <path d="M31 28 C33 28 33 30 31 30" strokeWidth="0.6" />
        {/* Saucer */}
        <ellipse cx="28.5" cy="32" rx="4.5" ry="0.8" strokeWidth="0.75" />
        {/* Steam */}
        <path d="M28 24 C27 22 29 21 28 19" strokeWidth="0.5" strokeDasharray="1 1" />
      </g>
    </svg>
  );
}

// 7. אינטרנט אלחוטי מהיר — Subtle antique communication & ethereal wave arcs
export function VintageWifiAmenityIllustration({
  className = 'w-6 h-6',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Delicate fountain pen / antique compass needle base */}
        <circle cx="20" cy="27" r="1.5" strokeWidth="0.8" />
        <circle cx="20" cy="27" r="0.5" fill={color} />
        <path d="M20 28.5 L20 33 M17 33 L23 33" strokeWidth="0.8" />
        {/* First signal arc */}
        <path d="M16 22 C18 20 22 20 24 22" strokeWidth="0.75" />
        {/* Second signal arc */}
        <path d="M12 17 C16 13.5 24 13.5 28 17" strokeWidth="0.8" />
        {/* Third signal arc with fine engraving hatching */}
        <path d="M8 12 C14 7.5 26 7.5 32 12" strokeWidth="0.85" />
        <path d="M9 13.5 C15 9.5 25 9.5 31 13.5" strokeWidth="0.5" strokeDasharray="1 1" />
      </g>
    </svg>
  );
}

// 8. חניה פרטית צמודה — Small courtyard iron gate & stone post arrival
export function VintageParkingAmenityIllustration({
  className = 'w-6 h-6',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Left Stone Pillar */}
        <path d="M7 14 L12 14 L12 33 L7 33 Z" strokeWidth="0.85" />
        <path d="M6 14 L13 14" strokeWidth="0.7" />
        <path d="M7 20 L12 20 M7 26 L12 26" strokeWidth="0.5" strokeDasharray="1 1" />
        <path d="M8 14 L9.5 11 L10.5 11 L12 14" strokeWidth="0.75" />
        {/* Right Stone Pillar */}
        <path d="M28 14 L33 14 L33 33 L28 33 Z" strokeWidth="0.85" />
        <path d="M27 14 L34 14" strokeWidth="0.7" />
        <path d="M28 20 L33 20 M28 26 L33 26" strokeWidth="0.5" strokeDasharray="1 1" />
        <path d="M29 14 L30.5 11 L31.5 11 L33 14" strokeWidth="0.75" />
        {/* Wrought Iron Open Gate Arches */}
        <path d="M12 18 C16 16 19 18 19 33" strokeWidth="0.8" />
        <path d="M28 18 C24 16 21 18 21 33" strokeWidth="0.8" />
        <path d="M15 17.5 L15 33 M25 17.5 L25 33" strokeWidth="0.6" />
        {/* Ground baseline */}
        <path d="M5 33 L35 33" strokeWidth="0.75" />
      </g>
    </svg>
  );
}

// 9. מסך טלוויזיה חכם — Minimal vintage wooden framed television
export function VintageTvAmenityIllustration({
  className = 'w-6 h-6',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Vintage wooden cabinet frame */}
        <rect x="7" y="12" width="26" height="18" rx="2" strokeWidth="0.9" />
        {/* Inner cathode/screen glass */}
        <rect x="9.5" y="14" width="18" height="14" rx="1" strokeWidth="0.7" />
        {/* Gentle reflection curve on glass */}
        <path d="M12 16 C16 18 20 18 24 16" strokeWidth="0.5" />
        {/* Side control knobs */}
        <circle cx="30" cy="17" r="1" strokeWidth="0.6" />
        <circle cx="30" cy="22" r="1" strokeWidth="0.6" />
        <path d="M28.5 26 L31.5 26" strokeWidth="0.6" />
        {/* Vintage rabbit-ear antennae */}
        <path d="M18 12 L13 6 M22 12 L27 6" strokeWidth="0.75" />
        <circle cx="13" cy="6" r="0.5" fill={color} />
        <circle cx="27" cy="6" r="0.5" fill={color} />
        {/* Splayed tapered legs */}
        <path d="M11 30 L9 34 M29 30 L31 34" strokeWidth="0.85" />
      </g>
    </svg>
  );
}

// 10. אירוח מבוגרים בלבד — Two elegant Parisian bistro chairs side by side
export function VintageCouplesAmenityIllustration({
  className = 'w-6 h-6',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Left Chair */}
        <path d="M7 14 C7 21 16 21 16 14" strokeWidth="0.8" />
        <path d="M7 21 L16 21" strokeWidth="0.8" />
        <path d="M8 21 L7 32 M15 21 L16 32" strokeWidth="0.75" />
        <path d="M11.5 14 L11.5 21" strokeWidth="0.5" strokeDasharray="1 1" />
        {/* Right Chair */}
        <path d="M24 14 C24 21 33 21 33 14" strokeWidth="0.8" />
        <path d="M24 21 L33 21" strokeWidth="0.8" />
        <path d="M25 21 L24 32 M32 21 L33 32" strokeWidth="0.75" />
        <path d="M28.5 14 L28.5 21" strokeWidth="0.5" strokeDasharray="1 1" />
        {/* Small pedestal table between them */}
        <ellipse cx="20" cy="18" rx="3.5" ry="1" strokeWidth="0.8" />
        <path d="M20 19 L20 32" strokeWidth="0.8" />
        <path d="M18 32 L22 32" strokeWidth="0.75" />
        {/* Floor baseline */}
        <path d="M5 33 L35 33" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
      </g>
    </svg>
  );
}

// 11. נגישות גבוהה — Subtle architectural threshold & open stone arch doorway
export function VintageAccessibilityAmenityIllustration({
  className = 'w-6 h-6',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Arched open threshold */}
        <path d="M11 31 L11 15 C11 9 29 9 29 15 L29 31" strokeWidth="0.9" />
        {/* Outer stone lintel */}
        <path d="M8 31 L8 15 C8 7 32 7 32 15 L32 31" strokeWidth="0.6" />
        <path d="M20 7 L20 9" strokeWidth="0.6" />
        {/* Gentle flat ground step-free threshold */}
        <path d="M6 31 L34 31" strokeWidth="1" />
        <path d="M9 33.5 L31 33.5" strokeWidth="0.6" strokeDasharray="1 1" />
        {/* Open welcoming door swing perspective */}
        <path d="M11 15 L17 17 L17 31 L11 31" strokeWidth="0.75" />
        <circle cx="15.5" cy="24" r="0.6" fill={color} />
      </g>
    </svg>
  );
}

// 12. אורח שלישי אפשרי — Vintage chaise lounge / daybed with round bolster pillow
export function VintageDaybedAmenityIllustration({
  className = 'w-6 h-6',
  color = '#7B6045',
}: IllustrationProps) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={`overflow-visible select-none ${className}`} aria-hidden="true">
      <g stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Curved high armrest/back of chaise */}
        <path d="M7 16 C6 22 9 25 14 25" strokeWidth="0.85" />
        <circle cx="6.5" cy="15.5" r="0.75" fill={color} />
        {/* Horizontal daybed mattress */}
        <path d="M7 25 L33 25" strokeWidth="0.9" />
        <path d="M33 25 C35 25 35 22 33 22 L14 22" strokeWidth="0.8" />
        {/* Round bolster pillow at the head */}
        <ellipse cx="12" cy="20.5" rx="3" ry="2" strokeWidth="0.75" />
        <path d="M11 20.5 L13 20.5" strokeWidth="0.4" />
        {/* Mattress tufting / stitching */}
        <path d="M18 23.5 L18 25 M23 23.5 L23 25 M28 23.5 L28 25" strokeWidth="0.5" />
        {/* Vintage turned wood legs */}
        <path d="M9 25 L8 31 M13 25 L12 31 M31 25 L32 31" strokeWidth="0.85" />
        {/* Floor shadow */}
        <path d="M6 32 L34 32" strokeWidth="0.5" strokeDasharray="1.5 1.5" />
      </g>
    </svg>
  );
}


