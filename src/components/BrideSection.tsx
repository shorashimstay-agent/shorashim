import { MessageCircle, Check } from 'lucide-react';
import { BRAND_DATA, BRIDE_PACKAGES, IMAGES } from '../data/shorashimData';
import { RootLine, EditorialTag } from './RootLine';
import Picture from './Picture';

interface BrideSectionProps {
  onSelectPackage?: (packageId: string) => void;
}

export default function BrideSection({ onSelectPackage }: BrideSectionProps) {
  const handleWhatsAppBrideInquiry = (pkgTitle?: string) => {
    const text = encodeURIComponent(
      `היי שורשים, אשמח לפרטים ולהתאמה אישית לגבי חוויית כלה בשורשים${
        pkgTitle ? ` (מסלול: ${pkgTitle})` : ''
      }.`
    );
    window.open(`https://wa.me/${BRAND_DATA.whatsappNumber}?text=${text}`, '_blank');
  };

  return (
    <section id="bride" className="py-28 sm:py-36 bg-[#DED5C8]/30 relative overflow-hidden">
      
      {/* Abstract root line motif */}
      <div className="absolute right-12 top-0 bottom-0 w-8 z-0 hidden lg:block opacity-30 pointer-events-none">
        <RootLine variant="vertical" color="#7B6045" className="h-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-20">
          <EditorialTag className="mb-4 block">
            07 · כלה בשורשים
          </EditorialTag>
          
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[#1E1D1A] font-normal tracking-tight mb-6">
            מקום יפה להתחיל בו יום יפה.
          </h2>
          
          <p className="text-lg sm:text-xl text-[#292824]/75 font-light leading-relaxed">
            יש משהו בבוקר של חתונה שראוי למקום משלו. לפני האיפור, השיער, השמלה, הצילומים והאנשים, יש כמה שעות שהן רק שלך.
          </p>
        </div>

        {/* Narrative & Cinematic Visual */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center mb-24">
          <div className="lg:col-span-5 space-y-6 text-[#292824]/80 text-base sm:text-lg font-light leading-relaxed">
            <h3 className="font-serif text-3xl text-[#1E1D1A] font-normal leading-snug">
              התארגנות כלה בלי תחושה של פס ייצור
            </h3>
            
            <p>
              להגיע בבוקר עם הצוות והמלוות, לשים מוזיקה שאת אוהבת, להכין קפה טוב ולהתחיל את היום ברוגע.
              שורשים מאפשר להתחיל את יום החתונה באווירה אינטימית, שלווה ומעוצבת.
            </p>

            <p>
              העיצוב של שורשים מציע מגוון רקעים טבעיים לצילום: עץ ואבן אותנטיים, קיר התמונות המשפחתי,
              המטבח המעוצב, אור טבעי רך שמחמיא לכל פריים והחצר הירוקה עם עצי הפיקוס הוותיקים לצילומי המפגש.
            </p>

            <div className="pt-4 flex items-center gap-4">
              <button
                onClick={() => handleWhatsAppBrideInquiry()}
                className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#1E1D1A] text-white hover:bg-[#7B6045] transition-colors duration-300 text-sm font-medium cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>שיחה ב-WhatsApp להתאמה אישית</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="aspect-[16/11] overflow-hidden bg-[#292824] shadow-[0_4px_25px_rgba(30,29,26,0.06)]">
              <Picture
                image={IMAGES.bride}
                alt="בוקר כלה בשורשים"
                className="w-full h-full object-cover brightness-[0.98]"
                sizes="(min-width: 1024px) 58vw, 100vw"
              />
            </div>
            <div className="mt-2.5 flex justify-between items-center text-[11px] text-[#7B6045] font-mono">
              <span>בוקר התארגנות · חצר ועץ הפיקוס</span>
              <span>שורשים · זכרון יעקב</span>
            </div>
          </div>
        </div>

        {/* 3 Packages — Editorial Unboxed Presentation */}
        <div className="pt-16 border-t border-[#DED5C8]">
          <div className="mb-12">
            <EditorialTag className="mb-2 block">
              מסלולי כלה
            </EditorialTag>
            <h3 className="font-serif text-3xl text-[#1E1D1A] font-normal">
              בחרי את המסלול המתאים לך
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {BRIDE_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className="pb-8 border-b md:border-b-0 md:border-l border-[#DED5C8] md:pl-8 last:border-none flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-mono text-[#7B6045] tracking-wider mb-2">
                    {pkg.recommendedFor}
                  </div>
                  <h4 className="font-serif text-2xl text-[#1E1D1A] font-normal mb-1">
                    {pkg.title}
                  </h4>
                  <div className="font-serif italic text-sm text-[#7B6045] mb-4">
                    {pkg.subtitle}
                  </div>
                  <p className="text-sm text-[#292824]/75 font-light leading-relaxed mb-6">
                    {pkg.description}
                  </p>

                  <div className="space-y-2 mb-8">
                    {pkg.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-[#292824]/80 font-light">
                        <Check className="w-3.5 h-3.5 text-[#7B6045] shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#DED5C8]/70 flex items-center justify-between">
                  <button
                    type="button"
                    aria-label={`תיאום ${pkg.title} ב-WhatsApp`}
                    onClick={() => {
                      if (onSelectPackage) onSelectPackage(pkg.id);
                      handleWhatsAppBrideInquiry(pkg.title);
                    }}
                    className="text-xs font-medium text-[#1E1D1A] hover:text-[#7B6045] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>לתיאום מסלול זה ב-WhatsApp</span>
                    <span aria-hidden="true">←</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
