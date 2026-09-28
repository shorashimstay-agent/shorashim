import { MessageCircle, Instagram, MapPin } from 'lucide-react';
import { BRAND_DATA } from '../data/shorashimData';
import { EditorialTag } from './RootLine';
import ShorashimWordmark from './ShorashimWordmark';

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
    <footer className="bg-[#1E1D1A] text-[#F4F0E8] pt-24 pb-14 border-t border-[#292824]">
      <div className="max-w-7xl mx-auto px-6 sm:px-12">
        
        {/* Top Minimal Callout */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between pb-16 border-b border-white/10 gap-8">
          <div>
            <EditorialTag light className="mb-4 block text-[#DED5C8]/70">
              שורשים · בית אירוח אינטימי למבוגרים
            </EditorialTag>
            <h3 className="text-3xl sm:text-4xl md:text-5xl text-[#F4F0E8] font-light leading-snug">
              מקום להתחבר אליו.
            </h3>
            <p className="mt-3 text-sm sm:text-base text-[#DED5C8]/70 font-light max-w-lg">
              אירוח זוגי שליו וחוויית כלה מרגשת בחצר משפחתית היסטורית משנת 1882 בזכרון יעקב.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onOpenBooking}
              className="px-7 py-3 bg-[#F4EFE5] text-[#27241F] hover:bg-[#DED5C8] transition-colors duration-300 text-sm font-normal tracking-wide cursor-pointer rounded-[2px]"
            >
              לבדיקת זמינות
            </button>
            <a
              href={`https://wa.me/${BRAND_DATA.whatsappNumber}?text=${encodeURIComponent('שלום שורשים, אשמח לפרטים')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 border border-white/30 text-white hover:bg-white/10 transition-colors duration-300 text-sm font-normal tracking-wide rounded-[2px]"
            >
              שיחה ב-WhatsApp
            </a>
          </div>
        </div>

        {/* Footer Navigation & Details */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 py-16 border-b border-white/10 text-sm">
          
          <div className="md:col-span-4 space-y-4">
            {/* Primary Wordmark in Footer */}
            <div className="w-48 sm:w-56">
              <ShorashimWordmark variant="footer" theme="light" className="w-full" />
            </div>
            <p className="text-xs text-[#DED5C8]/70 font-light leading-relaxed">
              {BRAND_DATA.subtitle}
            </p>
            <div className="pt-1 text-xs text-[#DED5C8]/60 font-mono">
              משק פויזנר · המייסדים 71, זכרון יעקב
            </div>
          </div>

          <nav aria-label="ניווט באתר" className="md:col-span-3 space-y-2">
            <div className="text-xs font-mono uppercase tracking-widest text-[#DED5C8]/60 mb-3">
              ניווט
            </div>
            {[
              { label: 'הבית', href: '#house' },
              { label: 'הסיפור', href: '#story' },
              { label: 'כלה בשורשים', href: '#bride' },
              { label: 'זכרון יעקב', href: '#zichron' },
              { label: 'גלריה', href: '#gallery' },
              { label: 'שאלות ותשובות', href: '#faq' },
            ].map((link) => (
              <div key={link.label}>
                <button
                  type="button"
                  onClick={() => handleScrollTo(link.href)}
                  className="text-xs text-[#DED5C8]/80 hover:text-white transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              </div>
            ))}
          </nav>

          <div className="md:col-span-5 space-y-4">
            <div className="text-xs font-mono uppercase tracking-widest text-[#DED5C8]/60 mb-2">
              יצירת קשר והגעה
            </div>
            <div className="text-xs text-[#DED5C8]/80 space-y-2 leading-relaxed">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 mt-0.5 text-[#A18A70] shrink-0" />
                <span>{BRAND_DATA.address} — מרחק פסיעות בודדות ממדרחוב המייסדים</span>
              </div>
              <div>טלפון: {BRAND_DATA.phoneFormatted}</div>
              <div>דוא״ל: saray.poisner@gmail.com</div>
              <div>שעות מענה: 08:30 – 20:30 בכל ימות השבוע</div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <a
                href={BRAND_DATA.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-[#DED5C8] hover:text-white transition-colors"
              >
                <Instagram className="w-4 h-4 text-[#A18A70]" />
                <span>Instagram @shorashim.zichron</span>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#DED5C8]/75 gap-4">
          <div>
            © {new Date().getFullYear()} שורשים. כל הזכויות שמורות למשפחת פויזנר, זכרון יעקב.
          </div>
          <div className="flex items-center gap-6">
            <span>אירוח בוטיק למבוגרים</span>
            <span aria-hidden="true">|</span>
            <span>משק חקלאי היסטורי 1882</span>
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
