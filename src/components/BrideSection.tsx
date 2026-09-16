import { useState } from 'react';
import { Heart, Sparkles, MessageCircle, Check, Camera, Coffee, Music, Sun } from 'lucide-react';
import { BRAND_DATA, BRIDE_PACKAGES, IMAGES } from '../data/shorashimData';
import Picture from './Picture';

interface BrideSectionProps {
  onSelectPackage?: (packageId: string) => void;
}

export default function BrideSection({ onSelectPackage }: BrideSectionProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>('bride_day');

  const handleWhatsAppBrideInquiry = (pkgTitle?: string) => {
    const text = encodeURIComponent(
      `היי שורשים, אשמח לפרטים ולהתאמה אישית לגבי חוויית כלה בשורשים${
        pkgTitle ? ` (מסלול: ${pkgTitle})` : ''
      }.`
    );
    window.open(`https://wa.me/${BRAND_DATA.whatsappNumber}?text=${text}`, '_blank');
  };

  return (
    <section id="bride" className="py-24 bg-[#F5EFE6] relative overflow-hidden">
      {/* Decorative background blur elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#EADCCB]/50 rounded-full blur-3xl -z-0 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#E4D1BC]/40 rounded-full blur-3xl -z-0 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/70 border border-[#E0D3C2] text-xs font-semibold tracking-wider text-[#A07044] mb-3">
            <Heart className="w-3.5 h-3.5 text-[#B87D65]" />
            <span>03 | כלה בשורשים</span>
          </div>
          
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#241E1A] font-normal tracking-tight mb-4">
            מקום יפה להתחיל בו יום יפה.
          </h2>
          
          <p className="text-lg sm:text-xl text-[#6D6457] leading-relaxed font-light">
            יש משהו בבוקר של חתונה שראוי למקום משלו. לפני האיפור, השיער, השמלה, הצילומים והאנשים, יש כמה שעות שהן רק שלך.
          </p>
        </div>

        {/* Narrative & Photo Story */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-16">
          <div className="lg:col-span-6 space-y-6 text-[#453E35] text-base sm:text-lg leading-relaxed">
            <h3 className="font-serif text-2xl sm:text-3xl text-[#241E1A] font-medium">
              התארגנות כלה בלי תחושה של פס ייצור
            </h3>
            
            <p>
              להגיע בבוקר עם הצוות והמלוות, לשים מוזיקה שאת אוהבת, להכין קפה טוב ולהתחיל את היום ברוגע.
              שורשים מאפשר להתחיל את יום החתונה באווירה אינטימית, שלווה ומעוצבת.
            </p>

            <p>
              העיצוב של שורשים מציע מגוון רקעים טבעיים לצילום: עץ ואבן אותנטיים, קיר התמונות המשפחתי,
              המטבח המעוצב, פרטים ישנים עם נשמה, אור טבעי רך שמחמיא לכל פריים והחצר הירוקה עם עצי הפיקוס הוותיקים.
            </p>

            <p className="font-serif italic text-xl text-[#8B6B48]">
              ״המקום לא נבנה כסט צילום. הוא פשוט כזה.״
            </p>

            {/* Quick Benefits Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2.5 text-sm font-medium text-[#2C2926]">
                <Camera className="w-4 h-4 text-[#8B6B48]" />
                <span>צילומים בחלל הצימר ובחצר</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm font-medium text-[#2C2926]">
                <Coffee className="w-4 h-4 text-[#8B6B48]" />
                <span>פינת קפה ומטבח רחב למלוות</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm font-medium text-[#2C2926]">
                <Music className="w-4 h-4 text-[#8B6B48]" />
                <span>אווירה אינטימית ושקטה בלבד</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm font-medium text-[#2C2926]">
                <Sun className="w-4 h-4 text-[#8B6B48]" />
                <span>שעות מותאמות לצורכי החתונה</span>
              </div>
            </div>
          </div>

          {/* Editorial Photo Showcase */}
          <div className="lg:col-span-6">
            <div className="relative rounded-3xl overflow-hidden shadow-xl border border-[#E2D6C5]">
              <Picture
                image={IMAGES.bride}
                alt="התארגנות כלה בשורשים זכרון יעקב"
                className="w-full h-[440px] sm:h-[480px] object-cover object-center"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
                <div className="text-white">
                  <span className="text-xs uppercase tracking-wider text-[#EADCCB]">החצר והחללים של שורשים</span>
                  <p className="text-sm sm:text-base font-light text-white/90 mt-1">
                    עוד לפני שיוצאים ללוקיישן — רקע טבעי לצילומי התארגנות, פרטים ומפגש מרגש
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The 3 Bridal Packages */}
        <div className="mb-14">
          <div className="text-center mb-10">
            <h3 className="font-serif text-2xl sm:text-3xl text-[#241E1A] font-medium">
              מסלולי כלה בשורשים
            </h3>
            <p className="text-[#6D6457] text-sm sm:text-base mt-1">
              בחרי את המסלול המתאים לך וצרי קשר ב-WhatsApp להתאמה אישית של שעות ופרטים
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BRIDE_PACKAGES.map((pkg) => {
              const isSelected = selectedPackageId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => {
                    setSelectedPackageId(pkg.id);
                    if (onSelectPackage) onSelectPackage(pkg.id);
                  }}
                  className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 cursor-pointer border ${
                    isSelected
                      ? 'bg-white border-[#8B6B48] shadow-md ring-2 ring-[#8B6B48]/20'
                      : 'bg-white/80 border-[#E8E1D5] hover:bg-white hover:border-[#D0C2B0]'
                  }`}
                >
                  {pkg.badge && (
                    <span className="absolute -top-3 right-6 px-3 py-1 rounded-full text-xs font-semibold bg-[#8B6B48] text-white shadow-xs">
                      {pkg.badge}
                    </span>
                  )}

                  <div>
                    <h4 className="font-serif text-xl sm:text-2xl text-[#241E1A] font-medium mb-2">
                      {pkg.title}
                    </h4>
                    
                    <p className="text-xs font-medium text-[#8B6B48] mb-3">
                      {pkg.subtitle}
                    </p>

                    <p className="text-xs sm:text-sm text-[#5C5549] leading-relaxed mb-6">
                      {pkg.description}
                    </p>

                    <div className="space-y-2.5 mb-6 pt-4 border-t border-[#F0EAE1]">
                      {pkg.highlights.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-[#453E35]">
                          <Check className="w-4 h-4 text-[#8B6B48] shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#F0EAE1]">
                    <div className="text-xs text-[#7A7163] mb-3">
                      מתאים עבור: <strong>{pkg.recommendedFor}</strong>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWhatsAppBrideInquiry(pkg.title);
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20BE5C] text-white text-sm font-medium flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>דברי איתנו ב-WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Banner Call to Action */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E5DDD0] shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-right">
            <h4 className="font-serif text-xl sm:text-2xl text-[#241E1A] font-medium">
              רוצה לשמוע עוד או לבדוק תאריך לחתונה שלך?
            </h4>
            <p className="text-sm text-[#685F52] max-w-xl">
              תמחור ותנאי שימוש ייקבעו בנפרד בהתאם ללוח הזמנים של יום החתונה. נשמח לתאם איתך שיחה אישית ולהבטיח שהבוקר שלך יהיה מושלם.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleWhatsAppBrideInquiry('התאמה אישית ליום החתונה')}
              className="px-6 py-3 rounded-full bg-[#8B6B48] hover:bg-[#735637] text-white text-sm font-medium flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>אני רוצה להתארגן בשורשים</span>
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
