import { Phone, MessageCircle, Instagram, MapPin } from 'lucide-react';
import { BRAND_DATA } from '../data/shorashimData';

interface FooterProps {
  onOpenBooking: () => void;
}

export default function Footer({ onOpenBooking }: FooterProps) {
  const handleScrollTo = (selector: string) => {
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-[#241E1A] text-white pt-20 pb-12 relative overflow-hidden border-t border-[#3A322C]">
      
      {/* Pre-footer Callout Banner */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 text-center">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-12 backdrop-blur-xs">
          <span className="text-xs uppercase tracking-widest text-[#E6C280] font-semibold block mb-2">
            הגיע הזמן ליצור זיכרונות חדשים
          </span>
          <h3 className="font-serif text-3xl sm:text-4xl text-white font-normal mb-4">
            שורשים | בית בוטיק לאירוח בלב זכרון יעקב
          </h3>
          <p className="text-white/80 max-w-xl mx-auto text-sm sm:text-base font-light mb-8">
            אירוח זוגי שליו, חוויית כלה מרגשת ואווירה חמה בחצר משפחתית היסטורית משנת 1882.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onOpenBooking}
              className="px-7 py-3.5 rounded-full bg-[#8B6B48] hover:bg-[#A07B55] text-white font-medium text-sm transition-all shadow-md cursor-pointer"
            >
              בדיקת זמינות והזמנה
            </button>
            <a
              href={`https://wa.me/${BRAND_DATA.whatsappNumber}?text=${encodeURIComponent('היי שורשים, אשמח לשמוע על יום כלה בשורשים')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white font-medium text-sm transition-all"
            >
              דברי איתנו על יום כלה
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/10 items-start">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-3">
            <h4 className="font-serif text-3xl tracking-wide font-medium text-white">
              {BRAND_DATA.name}
            </h4>
            <p className="font-serif italic text-lg text-[#E6C280]">
              {BRAND_DATA.tagline}
            </p>
            <p className="text-sm text-white/70 max-w-sm leading-relaxed">
              {BRAND_DATA.subtitle}. אירוח זוגי וחוויית כלה באווירה אינטימית ומוקפדת.
            </p>
            <div className="flex items-center gap-2 text-xs text-white/60 pt-2">
              <MapPin className="w-4 h-4 text-[#E6C280] shrink-0" />
              <span>{BRAND_DATA.address}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-4">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">
              ניווט באתר
            </h5>
            <div className="grid grid-cols-2 gap-2 text-sm text-white/80">
              <button
                onClick={() => handleScrollTo('#home')}
                className="text-right hover:text-[#E6C280] transition-colors py-1 cursor-pointer"
              >
                דף הבית
              </button>
              <button
                onClick={() => handleScrollTo('#stay')}
                className="text-right hover:text-[#E6C280] transition-colors py-1 cursor-pointer"
              >
                האירוח
              </button>
              <button
                onClick={() => handleScrollTo('#bride')}
                className="text-right hover:text-[#E6C280] transition-colors py-1 cursor-pointer"
              >
                כלה בשורשים
              </button>
              <button
                onClick={() => handleScrollTo('#story')}
                className="text-right hover:text-[#E6C280] transition-colors py-1 cursor-pointer"
              >
                הסיפור שלנו
              </button>
              <button
                onClick={() => handleScrollTo('#zichron')}
                className="text-right hover:text-[#E6C280] transition-colors py-1 cursor-pointer"
              >
                זכרון שלנו
              </button>
              <button
                onClick={() => handleScrollTo('#gallery')}
                className="text-right hover:text-[#E6C280] transition-colors py-1 cursor-pointer"
              >
                גלריה
              </button>
              <button
                onClick={() => handleScrollTo('#faq')}
                className="text-right hover:text-[#E6C280] transition-colors py-1 cursor-pointer"
              >
                שאלות נפוצות
              </button>
              <button
                onClick={() => handleScrollTo('#booking')}
                className="text-right hover:text-[#E6C280] transition-colors py-1 cursor-pointer"
              >
                בדיקת זמינות
              </button>
            </div>
          </div>

          {/* Direct Channels */}
          <div className="md:col-span-3 space-y-4">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">
              צרו קשר
            </h5>
            
            <a
              href={`https://wa.me/${BRAND_DATA.whatsappNumber}?text=${encodeURIComponent('היי שורשים, אשמח לפרטים')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white/90"
            >
              <div className="p-2 rounded-xl bg-[#178440]/20 text-[#178440]">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-white/60">וואטסאפ מהיר</div>
                <div className="text-sm font-medium" dir="ltr">{BRAND_DATA.phoneFormatted}</div>
              </div>
            </a>

            <a
              href={`tel:${BRAND_DATA.phone}`}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white/90"
            >
              <div className="p-2 rounded-xl bg-[#8B6B48]/30 text-[#E6C280]">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-white/60">שיחה טלפונית</div>
                <div className="text-sm font-medium" dir="ltr">{BRAND_DATA.phoneFormatted}</div>
              </div>
            </a>

            <a
              href={BRAND_DATA.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-white/90"
            >
              <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
                <Instagram className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-white/60">אינסטגרם</div>
                <div className="text-sm font-medium">shorashim.zichron</div>
              </div>
            </a>
          </div>

        </div>

        {/* Legal & Credits Bottom */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-white/70 gap-4">
          <div>
            כל הזכויות שמורות © {new Date().getFullYear()} שורשים | משק פויזנר, זכרון יעקב
          </div>
          <nav aria-label="מסמכים">
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <li>
                <a href="/terms/" className="underline hover:text-white">
                  תנאי הזמנה ושימוש
                </a>
              </li>
              <li>
                <a href="/privacy/" className="underline hover:text-white">
                  מדיניות פרטיות
                </a>
              </li>
              <li>
                <a href="/accessibility/" className="underline hover:text-white">
                  הצהרת נגישות
                </a>
              </li>
              <li>
                <a href="/en/terms/" lang="en" hrefLang="en" className="underline hover:text-white">
                  English
                </a>
              </li>
            </ul>
          </nav>
        </div>

      </div>
    </footer>
  );
}
