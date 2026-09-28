import { useState, useEffect, useRef } from 'react';
import { Menu, X, Phone, CalendarCheck } from 'lucide-react';
import { BRAND_DATA } from '../data/shorashimData';

interface HeaderProps {
  onOpenBooking: () => void;
}

export default function Header({ onOpenBooking }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);

  // Escape closes the mobile menu and returns focus to its button.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        menuToggle.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'דף הבית', href: '#home' },
    { label: 'האירוח', href: '#stay' },
    { label: 'כלה בשורשים', href: '#bride' },
    { label: 'הסיפור שלנו', href: '#story' },
    { label: 'זכרון שלנו', href: '#zichron' },
    { label: 'גלריה', href: '#gallery' },
    { label: 'שאלות נפוצות', href: '#faq' },
    { label: 'הזמנה', href: '#booking' },
  ];

  const handleLinkClick = (href: string) => {
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      id="main-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#FAF7F2]/95 backdrop-blur-md shadow-xs py-3 border-b border-[#E8E1D7]'
          : 'bg-gradient-to-b from-black/60 via-black/35 to-transparent text-white py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <a
          href="#home"
          id="header-brand-logo"
          onClick={(e) => {
            e.preventDefault();
            handleLinkClick('#home');
          }}
          className="flex flex-col items-start group"
        >
          <span
            className={`font-serif text-2xl md:text-3xl tracking-wide font-medium transition-colors ${
              isScrolled ? 'text-[#2C2926]' : 'text-white drop-shadow-sm'
            }`}
          >
            {BRAND_DATA.name}
          </span>
          <span
            className={`text-xs tracking-wider transition-colors ${
              isScrolled ? 'text-[#6B6255]' : 'text-white drop-shadow-sm'
            }`}
          >
            {BRAND_DATA.tagline}
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav id="desktop-navigation" aria-label="ניווט ראשי" className="hidden lg:flex items-center gap-7">
          {navLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => handleLinkClick(link.href)}
              className={`text-sm font-medium transition-colors hover:text-[#89603A] cursor-pointer ${
                isScrolled ? 'text-[#3E3A35]' : 'text-white/90 hover:text-white'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          <a
            href={`tel:${BRAND_DATA.phone}`}
            id="header-phone-link"
            title={`התקשרו: ${BRAND_DATA.phoneFormatted}`}
            aria-label={`התקשרו: ${BRAND_DATA.phoneFormatted}`}
            className={`hidden sm:flex items-center gap-2 text-xs md:text-sm px-3.5 py-2 rounded-full border transition-all ${
              isScrolled
                ? 'border-[#D9CFBF] text-[#3E3A35] hover:bg-[#F0EAE1]'
                : 'border-white/40 text-white hover:bg-white/15'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span dir="ltr">{BRAND_DATA.phoneFormatted}</span>
          </a>

          <button
            id="header-check-availability-btn"
            onClick={onOpenBooking}
            className="flex items-center gap-2 text-xs md:text-sm font-medium bg-[#8B6B48] hover:bg-[#735637] text-white px-4 py-2.5 rounded-full shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>בדיקת זמינות</span>
          </button>

          {/* Mobile Menu Button */}
          <button
            ref={menuToggle}
            type="button"
            id="mobile-menu-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls={mobileMenuOpen ? 'mobile-nav-drawer' : undefined}
            className={`lg:hidden p-2 rounded-md transition-colors ${
              isScrolled ? 'text-[#2C2926] hover:bg-[#EFE9E0]' : 'text-white hover:bg-white/20'
            }`}
            aria-label={mobileMenuOpen ? 'סגירת התפריט' : 'פתיחת התפריט'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <nav
          id="mobile-nav-drawer"
          aria-label="ניווט ראשי"
          className="lg:hidden bg-[#FAF7F2] border-b border-[#E5DDD2] px-6 py-6 shadow-xl animate-fadeIn text-[#2C2926]"
        >
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleLinkClick(link.href)}
                className="text-right py-2 text-base font-medium text-[#2C2926] hover:text-[#816342] border-b border-[#EAE3D9] last:border-b-0 cursor-pointer"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-3 flex flex-col gap-3">
              <a
                href={`tel:${BRAND_DATA.phone}`}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[#D9CFBF] text-[#2C2926] text-sm font-medium"
              >
                <Phone className="w-4 h-4" />
                <span>חייגו אלינו: {BRAND_DATA.phoneFormatted}</span>
              </a>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenBooking();
                }}
                className="w-full py-3 bg-[#8B6B48] text-white rounded-xl text-sm font-medium shadow-xs"
              >
                בדיקת זמינות והזמנה
              </button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
