import { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import StaySection from './components/StaySection';
import BrideSection from './components/BrideSection';
import StorySection from './components/StorySection';
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
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C2926] font-sans antialiased selection:bg-[#E2D5C3] selection:text-[#201C18]">
      <a href="#main" className="skip-link">
        דלגו לתוכן העיקרי
      </a>

      {/* Top Header */}
      <Header onOpenBooking={scrollToBooking} />

      {/* Main Content Sections */}
      <main id="main" tabIndex={-1} className="outline-none">
        {/* 01 | דף הבית / Hero */}
        <Hero
          onOpenBooking={scrollToBooking}
          onSelectStayType={(type) => setSelectedStayType(type)}
        />

        {/* 02 | האירוח */}
        <StaySection onOpenBooking={scrollToBooking} />

        {/* 03 | כלה בשורשים */}
        <BrideSection onSelectPackage={handleSelectPackage} />

        {/* 04 | הסיפור שלנו */}
        <StorySection />

        {/* 05 | זכרון שלנו */}
        <ZichronGuide />

        {/* 06 | גלריה */}
        <GallerySection />

        {/* 07 | הזמנה ובדיקת זמינות */}
        <BookingSection initialStayType={selectedStayType} />

        {/* 08 | שאלות נפוצות */}
        <FaqSection />
      </main>

      {/* 09 | Footer */}
      <Footer onOpenBooking={scrollToBooking} />

      {/* Floating WhatsApp Contact Button */}
      <FloatingWhatsApp />

      <AccessibilityMenu />
    </div>
  );
}
