import { BRAND_DATA, IMAGES } from '../data/shorashimData';
import ShorashimWordmark from './ShorashimWordmark';
import Picture from './Picture';

interface HeroProps {
  onOpenBooking: () => void;
}

export default function Hero({ onOpenBooking }: HeroProps) {


  return (
    <section
      id="home"
      dir="rtl"
      lang="he"
      className="relative w-full hero-section flex flex-col justify-end text-white overflow-hidden select-none text-right"
    >
      {/* 
        IMMERSIVE CINEMATIC PHOTOGRAPHY
        The original full-screen photograph of the house and tree (untouched crop, warm Mediterranean light).
        Tree dominates the left side; typography creates the counterweight on the right.
      */}
      <div className="absolute inset-0 z-0">
        <Picture
          image={IMAGES.hero}
          alt="בית האירוח שורשים בזכרון יעקב מבחוץ: חזית לבנה, דלתות זכוכית, מרפסת גג וחצר מוצלת בעצים"
          className="w-full h-full object-cover object-[55%_center] sm:object-center"
          sizes="100vw"
          priority
        />

        {/* 
          SUBTLE TOP GRADIENT OVERLAY ONLY BEHIND THE NAVIGATION:
          - Starts slightly darker at the very top
          - Subtle and transparent
          - Fades gradually into complete transparency around 130-160px from the top
          - Guarantees white/warm-ivory navigation readability over brighter sky/foliage areas
          - Feels organic and almost invisible without darkening the rest of the photograph
        */}
        <div className="absolute top-0 left-0 right-0 h-36 sm:h-44 bg-gradient-to-b from-[#12110F]/70 via-[#12110F]/30 to-transparent pointer-events-none z-[1]" />

        {/* 
          Subtle localized gradient wash behind the text area:
          Leaves stone texture, plants, tree bark, and Mediterranean warmth completely photographic.
        */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#151412]/50 via-[#151412]/10 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-full md:w-3/5 bg-gradient-to-l from-[#151412]/45 to-transparent pointer-events-none" />
      </div>

      {/* 
        ART-DIRECTED HERO COMPOSITION
        - Located in the right-center region
        - Away from the furniture in the lower courtyard
        - Subtle editorial indentation:
            שורשים
              מקום להתחבר אליו
                  בית אירוח אינטימי למבוגרים · זכרון יעקב
      */}
      <div className="relative z-10 max-w-7xl mx-auto px-7 sm:px-10 lg:px-14 w-full pb-10 sm:pb-20 lg:pb-24 pt-28 sm:pt-32">
        <div className="mr-0 md:mr-6 lg:mr-12 w-full max-w-none md:max-w-2xl">
          
          {/* 
            01 — SHORASHIM WORDMARK
            Scale: 72–82px on desktop (lg:text-[5.1rem] / ~80px).
            Warm ivory (#F4EFE5). Refined contemporary Hebrew serif with old soul.
            The ONLY logo/brand moment on the initial screen.
          */}
          <div className="mb-5 sm:mb-8">
            <ShorashimWordmark
              variant="hero"
              theme="light"
            />
          </div>

          {/* 
            Subtle editorial indentation (step 1):
            02 — TAGLINE:
            מקום להתחבר אליו
            Scale: 28–30px.
            Different supporting typeface (clean contemporary light sans / humanist).
            Slightly softer ivory (#DED5C8).
            Intimate whisper after the wordmark.
          */}
          <div className="pr-1 sm:pr-4">
            <div className="text-[23px] sm:text-[27px] md:text-[29px] lg:text-[30px] text-[#DED5C8] font-light tracking-wide leading-snug">
              {BRAND_DATA.tagline}
            </div>
          </div>

          {/* 
            Subtle editorial indentation (step 2):
            03 — DESCRIPTOR:
            בית אירוח אינטימי למבוגרים · זכרון יעקב
            Scale: 14–15px.
            Lower visual opacity (~70% #DED5C8/70).
            Letter spacing slightly airy.
          */}
          <div className="pr-2 sm:pr-8 mt-4 sm:mt-7">
            <div className="font-sans text-[13px] sm:text-[14px] lg:text-[15px] hero-descriptor tracking-[0.16em] text-[#DED5C8]/70 font-light select-none">
              סוויטה בלב המושבה בזכרון יעקב<br />לחופשה זוגית ולהתארגנות כלה
            </div>
          </div>

          {/* 
            Generous breathing space to the CTA
          */}
          <div className="h-6 sm:h-12 lg:h-14" />

          {/* 
            ACTIONS:
            CTA: Warm ivory background (#F4EFE5), dark charcoal typography (#27241F),
            minimal padding, subtle soft corners (rounded-[6px]), no pill shape, no icon.
            
            Secondary Link: "הסיפור של שורשים ↓" placed at an editorial distance.
          */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-12 pr-1 sm:pr-4">
            <button
              type="button"
              id="hero-check-availability-btn"
              onClick={onOpenBooking}
              className="px-6 py-2.5 sm:px-7 sm:py-3 bg-[#F4EFE5] text-[#27241F] hover:bg-[#DED5C8] transition-colors duration-300 text-[14px] sm:text-[15px] font-normal tracking-wide cursor-pointer rounded-[6px]"
            >
              בירור זמינות
            </button>

            <a href="#house"
              id="hero-discover-btn"

              className="hero-secondary group inline-flex items-center gap-2 text-[13px] sm:text-[14px] text-[#DED5C8]/70 hover:text-[#F4EFE5] transition-colors duration-300 cursor-pointer font-light tracking-wide select-none"
            >
              <span>לראות את הבית</span>
              <span aria-hidden="true" className="text-xs transition-transform duration-300 group-hover:translate-y-[2px] opacity-70">
                ↓
              </span>
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}



