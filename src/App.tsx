import { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ConceptSection from './components/ConceptSection';
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
import StayPaths from './components/StayPaths';
import { navigateTo } from './components/navigate';

export default function App() {
  const [selectedStayType, setSelectedStayType] = useState<
    'couple' | 'bride_day' | 'bride_night_day' | 'wedding_night'
  >('couple');

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

  return (
    <div dir="rtl" lang="he" className="min-h-screen bg-[#F4F0E8] text-[#1E1D1A] font-sans antialiased selection:bg-[#DED5C8] selection:text-[#1E1D1A] text-right">
      <a href="#main" className="skip-link">
        דלגו לתוכן העיקרי
      </a>

      {/* 00 | Header — Quiet, uncrowded, editorial navigation */}
      <Header onOpenBooking={scrollToBooking} />

      {/* Main Narrative Flow */}
      <main id="main" tabIndex={-1} className="outline-none">
        {/* 01 | Arrival & Hero — Cinematic, unboxed, pure desire */}
        <Hero onOpenBooking={scrollToBooking} />
        <AtAGlance onSelectCouple={() => { setSelectedStayType('couple'); scrollToBooking(); }} />

        <StayPaths onSelectCouple={() => { setSelectedStayType('couple'); scrollToBooking(); }} />
        <HouseSection onOpenBooking={scrollToBooking} />
        <BrideSection onSelectPackage={handleSelectPackage} />
        <BookingSection stayType={selectedStayType} onStayTypeChange={setSelectedStayType} />
        <ConceptSection />
        <StorySection />
        <ZichronGuide />
        <GallerySection />
        <FaqSection />
      </main>

      {/* 13 | Footer — Quiet, minimal, poetic closing */}
      <Footer onOpenBooking={scrollToBooking} />

      {/* Understated WhatsApp contact */}
      <FloatingWhatsApp />

      <AccessibilityMenu />
    </div>
  );
}
