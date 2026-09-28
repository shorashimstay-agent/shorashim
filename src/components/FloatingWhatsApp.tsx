import { MessageCircle } from 'lucide-react';
import { BRAND_DATA } from '../data/shorashimData';

export default function FloatingWhatsApp() {
  const handleWhatsAppClick = () => {
    const text = encodeURIComponent('שלום שורשים, אשמח לפרטים ולבדיקת זמינות');
    window.open(`https://wa.me/${BRAND_DATA.whatsappNumber}?text=${text}`, '_blank');
  };

  return (
    <aside aria-label="יצירת קשר ב-WhatsApp" className="fixed bottom-5 left-5 z-40">
      <button
        type="button"
        id="floating-whatsapp-btn"
        onClick={handleWhatsAppClick}
        className="group flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#1E1D1A]/70 hover:bg-[#1E1D1A] backdrop-blur-md text-[#F4F0E8] transition-all duration-300 shadow-md border border-white/10 hover:border-white/20 cursor-pointer opacity-70 hover:opacity-100"
        aria-label="צרו קשר ישיר ב-WhatsApp"
        title="WhatsApp"
      >
        <MessageCircle className="w-4 h-4 text-[#DED5C8]" />
      </button>
    </aside>
  );
}
