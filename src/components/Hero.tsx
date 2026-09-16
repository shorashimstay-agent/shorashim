import { useState } from 'react';
import { Sparkles, Calendar, Heart, ArrowDown, MapPin } from 'lucide-react';
import { BRAND_DATA, IMAGES } from '../data/shorashimData';
import Picture from './Picture';

interface HeroProps {
  onOpenBooking: () => void;
  onSelectStayType?: (type: 'couple' | 'bride_day' | 'bride_night_day' | 'wedding_night') => void;
}

export default function Hero({ onOpenBooking, onSelectStayType }: HeroProps) {
  const [quickType, setQuickType] = useState<'couple' | 'bride'>('couple');

  const scrollToSection = (selector: string) => {
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="relative min-h-[92vh] flex flex-col justify-between pt-28 pb-12 overflow-hidden bg-[#241E1A]">
      {/* Background Photography with atmospheric overlay */}
      <div className="absolute inset-0 z-0">
        <Picture
          image={IMAGES.courtyard}
          alt="חצר בית הבוטיק שורשים בזכרון יעקב"
          className="w-full h-full object-cover object-center brightness-60 scale-105 transition-transform duration-1000 ease-out"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#201A16] via-[#201A16]/55 to-[#201A16]/40" />
      </div>

      {/* Main Hero Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white my-auto">
        {/* Subtle pill tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-medium tracking-wider mb-6 text-white/95">
          <Sparkles className="w-3.5 h-3.5 text-[#E6C280]" />
          <span>{BRAND_DATA.capacity}</span>
        </div>

        {/* Title & Tagline */}
        <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight text-white mb-4 drop-shadow-md">
          {BRAND_DATA.name}
        </h1>
        
        <p className="font-serif italic text-2xl sm:text-3xl text-[#E8DAC5] font-light mb-3">
          {BRAND_DATA.tagline}
        </p>

        <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-light leading-relaxed mb-8">
          {BRAND_DATA.subtitle}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-10">
          <button
            id="hero-check-dates-btn"
            onClick={onOpenBooking}
            className="flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#A88358] hover:bg-[#936F45] text-white font-medium text-base shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>בדיקת זמינות והזמנה</span>
          </button>

          <button
            id="hero-bride-section-btn"
            onClick={() => {
              if (onSelectStayType) onSelectStayType('bride_day');
              scrollToSection('#bride');
            }}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white font-medium text-base transition-all duration-200 cursor-pointer"
          >
            <Heart className="w-4 h-4 text-[#F3C4B6]" />
            <span>כלה בשורשים</span>
          </button>

          <button
            id="hero-story-btn"
            onClick={() => scrollToSection('#story')}
            className="flex items-center gap-2 px-5 py-3.5 rounded-full text-white/80 hover:text-white text-sm font-medium hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span>הסיפור של שורשים</span>
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Location snippet */}
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-white/75">
          <MapPin className="w-3.5 h-3.5 text-[#E6C280]" />
          <span>{BRAND_DATA.address}, כמה בתים מהמדרחוב</span>
        </div>
      </div>

      {/* Bottom Floating Quick Bar */}
      <div className="relative z-10 max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="bg-[#FAF7F2]/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-2xl border border-[#E5DDD2] text-[#2C2926]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Stay Purpose Selector */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#8C8375] mb-1.5">אופי האירוח</span>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#EFE9DF] rounded-xl">
                <button
                  onClick={() => setQuickType('couple')}
                  className={`text-xs sm:text-sm py-1.5 px-3 rounded-lg font-medium transition-all ${
                    quickType === 'couple'
                      ? 'bg-white text-[#2C2926] shadow-xs'
                      : 'text-[#6C6457] hover:text-[#2C2926]'
                  }`}
                >
                  אירוח זוגי
                </button>
                <button
                  onClick={() => setQuickType('bride')}
                  className={`text-xs sm:text-sm py-1.5 px-3 rounded-lg font-medium transition-all ${
                    quickType === 'bride'
                      ? 'bg-white text-[#2C2926] shadow-xs'
                      : 'text-[#6C6457] hover:text-[#2C2926]'
                  }`}
                >
                  חוויית כלה
                </button>
              </div>
            </div>

            {/* Quick Summary Note */}
            <div className="flex flex-col text-xs sm:text-sm text-[#575046] border-y md:border-y-0 md:border-x border-[#E5DDD2] py-2 md:py-0 md:px-4">
              {quickType === 'couple' ? (
                <>
                  <span className="font-medium text-[#2C2926]">סופ״ש או אמצ״ש שקט</span>
                  <span className="text-xs text-[#7A7163]">כ-80 מ״ר, חצר ירוקה, גג פרטי עם ערסל ומטבח מלא</span>
                </>
              ) : (
                <>
                  <span className="font-medium text-[#2C2926]">יום כלה / לילה לפני</span>
                  <span className="text-xs text-[#7A7163]">התארגנות אינטימית, ללא פס ייצור, רקעי צילום טבעיים</span>
                </>
              )}
            </div>

            {/* Direct check availability action */}
            <div>
              <button
                onClick={() => {
                  if (quickType === 'bride') {
                    if (onSelectStayType) onSelectStayType('bride_day');
                    scrollToSection('#bride');
                  } else {
                    onOpenBooking();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#8B6B48] hover:bg-[#735637] text-white text-sm font-medium shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{quickType === 'couple' ? 'בדיקת תאריכים פנויים' : 'גלי את מסלולי הכלה'}</span>
                <span className="text-xs">←</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
