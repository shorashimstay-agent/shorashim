import { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onOpenBooking: () => void;
  isHomepage?: boolean;
}

export default function Header({ onOpenBooking, isHomepage }: HeaderProps) {
  // 1. Determine if we are on the homepage:
  // Check prop if provided, else check window.location.pathname.
  const [pathname, setPathname] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const isHomePage =
    isHomepage !== undefined
      ? isHomepage
      : pathname === '/' || pathname === '' || pathname === '/index.html';

  // 2. SCROLL STATE:
  // Listen to window scroll events.
  // Homepage at scroll < 50px => isAtTop = true
  const [scrolled, setScrolled] = useState(false);
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
      const scrollY =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        window.scrollY ||
        0;
      setScrolled(scrollY >= 50);
    };

    // Run on initial mount
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 3. LOGO VISIBILITY & HEADER RULES:
  // Homepage + scrollY < 50px  => logo MUST be hidden completely
  // Homepage + scrollY >= 50px => logo MUST be visible
  // Any internal page          => logo MUST always be visible
  const isAtTop = !scrolled;
  const showLogo = !isHomePage || !isAtTop;

  // Solid sticky header style is active when on internal page OR when scrolled on homepage
  const isSolid = !isHomePage || scrolled;

  const navLinks = [
    { label: 'הבית', href: '#house' },
    { label: 'הסיפור', href: '#story' },
    { label: 'כלה בשורשים', href: '#bride' },
    { label: 'זכרון יעקב', href: '#zichron' },
    { label: 'גלריה', href: '#gallery' },
    { label: 'שאלות', href: '#faq' },
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
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ease-in-out h-[64px] sm:h-[74px] md:h-[84px] lg:h-[94px] flex items-center bg-[#F3EFE7]/96 backdrop-blur-[4px] border-b border-[#E5DFD3]/75 text-[#665548] shadow-[0_2px_18px_rgba(64,54,47,0.035)] ${
        isSolid
          ? 'md:bg-[#F3EFE7]/96 md:backdrop-blur-[4px] md:border-b md:border-[#E5DFD3]/75 md:text-[#665548] md:shadow-[0_2px_18px_rgba(64,54,47,0.035)]'
          : 'md:bg-transparent md:border-transparent md:text-[#F4EFE5] md:shadow-none'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 w-full flex items-center justify-between">
        
        {/* 
          LOGO CONTAINER:
          Maintains exact fixed width so hiding or showing
          the logo NEVER causes the navigation links to move horizontally on desktop.
          
          On mobile: Always visible, elegant, compact on the right.
          On desktop: Follows showLogo rule (hidden at top of homepage, visible on scroll).
        */}
        <div className="flex items-center w-[100px] sm:w-[130px] md:w-[140px] lg:w-[160px] shrink-0 justify-start select-none">
          <a
            href="#home"
            id="header-brand-logo"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('#home');
            }}
            tabIndex={showLogo ? 0 : -1}
            aria-hidden={!showLogo}
            className={`inline-flex items-center cursor-pointer py-0.5 sm:py-1 transition-all duration-350 ease-in-out opacity-100 visible pointer-events-auto ${
              showLogo
                ? 'md:opacity-100 md:visible md:pointer-events-auto'
                : 'md:opacity-0 md:invisible md:pointer-events-none'
            }`}
            aria-label="שורשים - בית אירוח אינטימי למבוגרים זכרון יעקב"
          >
            {/* The official approved original logo image */}
            <img
              src="/shorashim-logo-transparent.png"
              alt="שורשים – מקום להתחבר אליו"
              width={256}
              height={256}
              className="w-auto h-[44px] sm:h-[56px] md:h-[70px] lg:h-[82px] object-contain"
              referrerPolicy="no-referrer"
            />
          </a>
        </div>

        {/* 
          Desktop Navigation Menu:
          Position remains 100% steady and anchored whether logo is hidden or visible.
          Colors:
          - Scrolled: warm brown #665548 (hover: #40362F)
          - Top: clean white / soft ivory #F4EFE5
        */}
        <nav id="desktop-navigation" aria-label="ניווט ראשי" className="hidden md:flex items-center gap-6 lg:gap-9">
          {navLinks.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => handleLinkClick(link.href)}
              className={`text-[14px] lg:text-[15px] font-sans tracking-wide transition-colors duration-200 cursor-pointer py-1 font-normal ${
                isSolid
                  ? 'text-[#665548] hover:text-[#40362F]'
                  : 'text-[#F4EFE5] hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* 
          Opposite Side (Left in RTL):
          Action button "בדיקת זמינות" + Hamburger Menu
          Balances: BRAND LOGO CONTAINER (fixed width)  ←  NAVIGATION  →  BOOKING (fixed width)
        */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0 justify-end">
          <button
            type="button"
            id="header-check-availability-btn"
            onClick={onOpenBooking}
            className={`text-[11px] leading-[1.15] md:text-[13.5px] md:leading-normal tracking-wide font-normal px-3.5 py-1 md:px-5 md:py-1.5 border border-[0.75px] transition-all duration-300 cursor-pointer rounded-[6px] text-center border-[#665548]/35 text-[#665548] hover:border-[#665548]/60 hover:bg-[#665548]/5 ${
              isSolid
                ? 'md:border-[#665548]/30 md:text-[#665548] md:hover:border-[#665548]/50 md:hover:bg-[#665548]/5'
                : 'md:border-[#F4EFE5]/40 md:text-[#F4EFE5] md:hover:border-[#F4EFE5]/65 md:hover:bg-white/5'
            }`}
          >
            <span className="block md:inline">בדיקת</span>{' '}
            <span className="block md:inline">זמינות</span>
          </button>

          {/* Minimal Mobile Menu Toggle */}
          <button
            ref={menuToggle}
            type="button"
            id="mobile-menu-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls={mobileMenuOpen ? 'mobile-nav-drawer' : undefined}
            className="md:hidden p-1 transition-colors cursor-pointer rounded-[6px] text-[#665548]"
            aria-label={mobileMenuOpen ? 'סגירת התפריט' : 'פתיחת התפריט'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <nav
          id="mobile-nav-drawer"
          aria-label="ניווט ראשי"
          className="md:hidden fixed top-[64px] sm:top-[74px] left-0 right-0 bg-[#F3EFE7] border-b border-[#E5DFD3] px-8 py-8 shadow-xl text-[#665548] animate-fadeIn z-50"
        >
          <div className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => handleLinkClick(link.href)}
                className="text-right text-lg font-sans text-[#665548] hover:text-[#40362F] cursor-pointer py-1 font-light"
              >
                {link.label}
              </button>
            ))}

            <div className="pt-4 border-t border-[#E5DFD3]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenBooking();
                }}
                className="w-full text-center py-2.5 bg-[#40362F] text-sm tracking-wide text-[#F3EFE7] hover:bg-[#665548] transition-colors rounded-[6px]"
              >
                בדיקת זמינות
              </button>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
