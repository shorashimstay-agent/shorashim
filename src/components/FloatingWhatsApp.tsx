import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { BRAND_DATA } from '../data/shorashimData';

export default function FloatingWhatsApp() {
  const [showTooltip, setShowTooltip] = useState(true);

  const handleWhatsAppClick = () => {
    const text = encodeURIComponent('שלום שורשים, אשמח לפרטים ולבדיקת זמינות');
    window.open(`https://wa.me/${BRAND_DATA.whatsappNumber}?text=${text}`, '_blank');
  };

  return (
    <aside aria-label="יצירת קשר ב-WhatsApp" className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-2">
      {/* Small floating helper bubble */}
      {showTooltip && (
        <div className="bg-white text-[#2C2926] shadow-lg rounded-2xl py-2 px-3.5 border border-[#E5DDD2] text-xs max-w-[200px] relative motion-safe:animate-bounce-short">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            type="button"
            className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-white border border-[#E5DDD2] text-[#5C5549] hover:text-[#2C2926] cursor-pointer"
            aria-label="סגירת ההודעה"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <p className="font-medium text-[#816342]">רוצים לשאול משהו?</p>
          <p className="text-[11px] text-[#554D41]">אנחנו זמינים ב-WhatsApp לכל שאלה והתאמה</p>
        </div>
      )}

      {/* Main WhatsApp Button */}
      <button
        type="button"
        id="floating-whatsapp-btn"
        onClick={handleWhatsAppClick}
        className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-[#178440] hover:bg-[#136E35] text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
        aria-label="צרו קשר ישיר ב-WhatsApp"
        title="צרו קשר ב-WhatsApp"
      >
        <MessageCircle className="w-7 h-7" />
        
        {/* Pulse ring animation */}
        <span className="absolute -inset-1 rounded-full bg-[#178440]/30 motion-safe:animate-ping pointer-events-none opacity-75" />
      </button>
    </aside>
  );
}
