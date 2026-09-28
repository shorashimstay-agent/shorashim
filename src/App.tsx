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

export default function App() {
  const [selectedStayType, setSelectedStayType] = useState<
    'couple' | 'bride_day' | 'bride_night_day' | 'wedding_night'
  >('couple');

  const scrollToBooking = () => {
    const bookingEl = document.getElementById('booking');
    if (bookingEl) {
      bookingEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectPackage = (packageId: string) => {
    if (
      packageId === 'bride_day' ||
      packageId === 'bride_night_day' ||
      packageId === 'wedding_night'
    ) {
      setSelectedStayType(packageId);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F0E8] text-[#1E1D1A] font-sans antialiased selection:bg-[#DED5C8] selection:text-[#1E1D1A]">
      <a href="#main" className="skip-link">
        דלגו לתוכן העיקרי
      </a>

      {/* 00 | Header — Quiet, uncrowded, editorial navigation */}
      <Header onOpenBooking={scrollToBooking} />

      {/* Main Narrative Flow */}
      <main id="main" tabIndex={-1} className="outline-none">
        {/* 01 | Arrival & Hero — Cinematic, unboxed, pure desire */}
        <Hero onOpenBooking={scrollToBooking} />

        {/* 02 & 03 | Layers of Time & Old x New — "העבר לא נשאר מאחור", "ישן. חדש. וכל מה שביניהם." */}
        <ConceptSection />

        {/* 04, 05 & 06 | The House, Stay for Two & Details — Living spaces, tactile intimacy, unboxed specs */}
        <HouseSection onOpenBooking={scrollToBooking} />

        {/* 07 | The Story of Shorashim — 5 generations, Tzipi & Yossi, curated archival fragment */}
        <StorySection />

        {/* 08 | Bride Experience — Mature, understated, natural backdrops, 3 packages */}
        <BrideSection onSelectPackage={handleSelectPackage} />

        {/* 09 | Zichron Yaakov — "לצאת מהבית. ולהיות כבר בזכרון." */}
        <ZichronGuide />

        {/* 10 | Curated Gallery — Mixed scales, asymmetrical editorial layout */}
        <GallerySection />

        {/* 11 | Booking & Availability — Functional, architectural, direct WhatsApp dispatch */}
        <BookingSection initialStayType={selectedStayType} />

        {/* 12 | FAQ — Minimal typographic lines */}
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
