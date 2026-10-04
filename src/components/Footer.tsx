import { Instagram, MapPin, Phone, Mail, MessageCircle } from 'lucide-react';
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

  const navLinks = [
    { label: 'הבית', href: '#house' },
    { label: 'הסיפור', href: '#story' },
    { label: 'כלה בשורשים', href: '#bride' },
    { label: 'זכרון יעקב', href: '#zichron' },
    { label: 'גלריה', href: '#gallery' },
    { label: 'שאלות ותשובות', href: '#faq' },
  ];

  return (
    <footer
      className="bg-[#ECE5DA]/80 text-[#27241F] pt-10 sm:pt-14 lg:pt-16 pb-8 sm:pb-10 border-t border-[#DFD7CB]"
      dir="rtl"
      lang="he"
    >
      <div className="max-w-7xl mx-auto px-7 sm:px-10 lg:px-14">
        
        {/* Top Booking Invitation — Small, Elegant & Quiet */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 pb-8 sm:pb-10 border-b border-[#DFD7CB]/75 text-right">
          <div>
            <h3 className="text-xl sm:text-2xl md:text-3xl text-[#1E1D1A] font-light tracking-tight leading-snug">
              מקום להתחבר אליו.
            </h3>
            <p className="text-xs sm:text-sm text-[#665548] font-light mt-1">
              אירוח זוגי ושקט בלב זכרון יעקב.
            </p>
          </div>

          <div className="shrink-0 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={onOpenBooking}
              className="px-6 py-2.5 sm:px-7 sm:py-2.5 bg-[#40362F] text-[#F3EFE7] hover:bg-[#665548] transition-colors duration-300 text-xs sm:text-sm font-normal tracking-wide cursor-pointer rounded-[6px]"
            >
              בדיקת זמינות
            </button>
          </div>
        </div>

        {/* Clean, Balanced Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 py-8 sm:py-10 text-right">
          
          {/* Column 1: Logo & Brief Description */}
          <div className="md:col-span-5 space-y-3">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                handleScrollTo('#home');
              }}
              className="inline-block"
              aria-label="שורשים - דף הבית"
            >
              <img
                src="/shorashim-logo-transparent.png"
                alt="שורשים – מקום להתחבר אליו"
                width={256}
                height={256}
                className="w-auto h-12 sm:h-14 object-contain brightness-90"
                referrerPolicy="no-referrer"
              />
            </a>

            <p className="text-xs sm:text-[13px] text-[#55473A] font-light leading-relaxed max-w-sm">
              אירוח זוגי שליו וחוויית כלה אינטימית בחצר משפחתית היסטורית משנת <bdi>1882</bdi> בזכרון יעקב.
            </p>

            <div className="flex items-center gap-1.5 text-xs text-[#7B6045] font-light pt-1">
              <MapPin className="w-3.5 h-3.5 text-[#7B6045] shrink-0" />
              <span>{BRAND_DATA.address}, זכרון יעקב</span>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div className="md:col-span-3 space-y-2.5">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#7B6045]">
              ניווט
            </div>
            <nav aria-label="ניווט באתר" className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <button
                  type="button"
                  key={link.label}
                  onClick={() => handleScrollTo(link.href)}
                  className="text-xs sm:text-[13px] text-[#55473A] hover:text-[#1E1D1A] transition-colors cursor-pointer text-right w-fit font-light"
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Column 3: Contact & Hospitality Details */}
          <div className="md:col-span-4 space-y-2.5">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#7B6045]">
              יצירת קשר
            </div>
            
            <div className="space-y-2 text-xs sm:text-[13px] text-[#55473A] font-light">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#7B6045] shrink-0" />
                <a
                  href={`tel:${BRAND_DATA.phone}`}
                  className="hover:text-[#1E1D1A] transition-colors"
                  dir="ltr"
                >
                  {BRAND_DATA.phoneFormatted}
                </a>
              </div>

              <div className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-[#7B6045] shrink-0" />
                <a
                  href={`https://wa.me/${BRAND_DATA.whatsappNumber}?text=${encodeURIComponent('שלום שורשים, אשמח לפרטים')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#1E1D1A] transition-colors"
                >
                  שיחה ב-WhatsApp
                </a>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#7B6045] shrink-0" />
                <a
                  href="mailto:saray.poisner@gmail.com"
                  className="hover:text-[#1E1D1A] transition-colors"
                  dir="ltr"
                >
                  saray.poisner@gmail.com
                </a>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <Instagram className="w-3.5 h-3.5 text-[#7B6045] shrink-0" />
                <a
                  href={BRAND_DATA.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#1E1D1A] transition-colors"
                  dir="ltr"
                >
                  @shorashim.zichron
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Heritage Tag */}
        <div className="pt-6 border-t border-[#DFD7CB]/60 flex flex-col sm:flex-row items-center justify-between text-[11px] sm:text-xs text-[#7B6045] gap-2 text-right">
          <div>
            © <bdi>{new Date().getFullYear()}</bdi> שורשים. משק פויזנר, זכרון יעקב. כל הזכויות שמורות.
          </div>
          <div>
            אירוח בוטיק למבוגרים · משק חקלאי היסטורי <bdi>1882</bdi>
          </div>
          <nav aria-label="מסמכים">
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <li>
                <a href="/terms/" className="underline hover:text-[#1E1D1A]">
                  תנאי הזמנה ושימוש
                </a>
              </li>
              <li>
                <a href="/privacy/" className="underline hover:text-[#1E1D1A]">
                  מדיניות פרטיות
                </a>
              </li>
              <li>
                <a href="/accessibility/" className="underline hover:text-[#1E1D1A]">
                  הצהרת נגישות
                </a>
              </li>
              <li>
                <a href="/en/terms/" lang="en" hrefLang="en" className="underline hover:text-[#1E1D1A]">
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
