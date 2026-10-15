import { useEffect, useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import HouseSection from './components/HouseSection';
import StorySection from './components/StorySection';
import BrideSection from './components/BrideSection';
import ZichronGuide from './components/ZichronGuide';
import GallerySection from './components/GallerySection';
import BookingSection from './components/BookingSection';
import FaqSection from './components/FaqSection';
import Footer from './components/Footer';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import AccessibilityMenu from './components/AccessibilityMenu';
import AtAGlance from './components/AtAGlance';
import { GALLERY_ITEMS } from './data/shorashimData';
import { navigateTo } from './components/navigate';
import BackToTop from './components/BackToTop';
import BridalPage from './components/BridalPage';

export default function App() {
  const [bridalPage, setBridalPage] = useState(() => window.location.pathname.replace(/\/$/, '') === '/bride' || window.location.hash === '#bride-page');
  useEffect(() => {
    const update = () => { const isBridal = window.location.hash === '#bride-page'; setBridalPage(isBridal); if (isBridal) { setSelectedStayType('bride_day'); window.scrollTo(0, 0); } };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const [audience, setAudience] = useState<'holiday' | 'bride'>(() => window.location.hash === '#bride' ? 'bride' : 'holiday');
  useEffect(() => {
    const showBride = () => { setAudience('bride'); setSelectedStayType('bride_day'); };
    window.addEventListener('shorashim:show-bride', showBride);
    return () => window.removeEventListener('shorashim:show-bride', showBride);
  }, []);
  const [selectedStayType, setSelectedStayType] = useState<
    'couple' | 'bride_day' | 'bride_night_day' | 'wedding_night'
  >(() => window.location.hash === '#bride' ? 'bride_day' : 'couple');

  const scrollToBooking = () => {
    navigateTo('booking');
  };

  const handleSelectPackage = (packageId: string) => {
    if (
      packageId === 'bride_day' ||
      packageId === 'bride_night_day' ||
      packageId === 'wedding_night'
    ) {
      setSelectedStayType(packageId);
      scrollToBooking();
    }
  };

  if (bridalPage) return <div className="audience-bride" dir="rtl" lang="he">
    <a href="#main" className="skip-link">דלגו לתוכן העיקרי</a>
    <Header isHomepage={false} onOpenBooking={scrollToBooking} />
    <main id="main" tabIndex={-1}><BridalPage stayType={selectedStayType} onStayTypeChange={setSelectedStayType} /><FaqSection /></main>
    <Footer onOpenBooking={scrollToBooking} /><FloatingWhatsApp /><BackToTop /><AccessibilityMenu />
  </div>;

  return (
    <div dir="rtl" lang="he" className={`audience-${audience} min-h-screen bg-[#F4F0E8] text-[#1E1D1A] font-sans antialiased selection:bg-[#DED5C8] selection:text-[#1E1D1A] text-right`}>
      <a href="#main" className="skip-link">
        דלגו לתוכן העיקרי
      </a>

      {/* 00 | Header — Quiet, uncrowded, editorial navigation */}
      <Header onOpenBooking={scrollToBooking} />

      {/* Main Narrative Flow */}
      <main id="main" tabIndex={-1} className="outline-none">
        {/* 01 | Arrival & Hero — Cinematic, unboxed, pure desire */}
        <Hero audience={audience} />
        <BookingSection stayType={selectedStayType} onStayTypeChange={setSelectedStayType} />
        {audience === 'holiday' && <AtAGlance onSelectCouple={() => { setSelectedStayType('couple'); scrollToBooking(); }} />}

        <HouseSection onOpenBooking={scrollToBooking} />
        <div hidden={audience !== 'bride'}><BrideSection onSelectPackage={handleSelectPackage} /></div>
        <StorySection />
        <GallerySection key={audience} items={audience === 'holiday' ? GALLERY_ITEMS.filter(item => item.category !== 'bride') : GALLERY_ITEMS} />
        <ZichronGuide />
        <FaqSection />
      </main>

      {/* 13 | Footer — Quiet, minimal, poetic closing */}
      <Footer onOpenBooking={scrollToBooking} />

      {/* Understated WhatsApp contact */}
      <FloatingWhatsApp />
      <BackToTop />

      <AccessibilityMenu />
    </div>
  );
}
