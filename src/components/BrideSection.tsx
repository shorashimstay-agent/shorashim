import { MessageCircle, Check } from 'lucide-react';
import { BRAND_DATA, BRIDE_PACKAGES, IMAGES } from '../data/shorashimData';
import { RootLine, EditorialTag } from './RootLine';
import Picture from './Picture';
import { PRICES } from '../lib/stay';

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
    <section id="bride" className="py-12 sm:py-24 lg:py-36 bg-[#DED5C8]/30 relative overflow-hidden" dir="rtl" lang="he">
      
      {/* Abstract root line motif */}
      <div className="absolute right-12 top-0 bottom-0 w-8 z-0 hidden lg:block opacity-30 pointer-events-none">
        <RootLine variant="vertical" color="#7B6045" className="h-full" />
      </div>

      <div className="max-w-7xl mx-auto px-7 sm:px-10 lg:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="w-full max-w-none md:max-w-3xl mb-8 sm:mb-16 text-right">
          <EditorialTag className="mb-3 sm:mb-4 block">
            07 · כלה בשורשים
          </EditorialTag>
          
          <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl text-[#1E1D1A] font-normal tracking-tight mb-4 sm:mb-6 text-right">
            מקום יפה להתחיל בו יום יפה.
          </h2>
          
          <p className="text-base sm:text-xl text-[#292824]/75 font-light leading-relaxed text-right">
            יש משהו בבוקר של חתונה שראוי למקום משלו. לפני האיפור, השיער, השמלה, הצילומים והאנשים, יש כמה שעות שהן רק שלך.
          </p>
        </div>

        {/* Narrative & Cinematic Visual */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center mb-12 sm:mb-24">
          <div className="lg:col-span-5 space-y-4 sm:space-y-6 text-[#292824]/80 text-base sm:text-lg font-light leading-relaxed text-right w-full max-w-none" dir="rtl">
            <h3 className="font-serif text-2xl sm:text-3xl text-[#1E1D1A] font-normal leading-snug text-right">
              התארגנות כלה בלי תחושה של פס ייצור
            </h3>
            
            <p className="text-right">
              להגיע בבוקר עם הצוות והמלוות, לשים מוזיקה שאת אוהבת, להכין קפה טוב ולהתחיל את היום ברוגע.
              שורשים מאפשר להתחיל את יום החתונה באווירה אינטימית, שלווה ומעוצבת.
            </p>

            <p className="text-right">
              העיצוב של שורשים מציע מגוון רקעים טבעיים לצילום: עץ ואבן אותנטיים, קיר התמונות המשפחתי,
              המטבח המעוצב, אור טבעי רך שמחמיא לכל פריים והחצר הירוקה עם עצי הפיקוס הוותיקים לצילומי המפגש.
            </p>

            <div className="pt-2 sm:pt-4 flex items-center gap-4">
              <button
                onClick={() => handleWhatsAppBrideInquiry()}
                className="inline-flex items-center gap-2.5 px-6 py-2.5 sm:py-3 bg-[#1E1D1A] text-white hover:bg-[#7B6045] transition-colors duration-300 text-xs sm:text-sm font-medium cursor-pointer rounded-[6px]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>שיחה ב-WhatsApp להתאמה אישית</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="aspect-[16/11] overflow-hidden bg-[#292824] shadow-[0_4px_25px_rgba(30,29,26,0.06)]">
              <Picture
                image={IMAGES.bride_dress}
                alt="שמלת כלה תלויה על מתלה בחדר השינה בשורשים"
                className="w-full h-full object-cover brightness-[0.98]"
                sizes="(min-width: 1024px) 58vw, 100vw"
              />
            </div>
            <div className="mt-2 flex justify-between items-center text-[11px] text-[#7B6045] font-mono" dir="rtl">
              <span>בוקר התארגנות · חצר ועץ הפיקוס</span>
              <span>שורשים · זכרון יעקב</span>
            </div>
          </div>
        </div>

        {/* 3 Packages — Editorial Comparison */}
        <div className="pt-10 sm:pt-16 border-t border-[#DED5C8]">
          <div className="mb-8 sm:mb-12 text-right">
            <EditorialTag className="mb-2 block">
              מסלולי כלה
            </EditorialTag>
            <h3 className="font-serif text-2xl sm:text-3xl text-[#1E1D1A] font-normal text-right">
              בחרי איך תרצי לחוות את שורשים.
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 lg:gap-12 items-start">
            {([
              {
                num: '01',
                id: 'bride_day',
                title: 'יום כלה',
                subtitle: 'התארגנות בשורשים',
                isFeatured: false,
                details: 'כניסה ב-08:00 בבוקר | עזיבה עד 15:30 לקראת היציאה לאירוע. מתאים לעד 5 מלוות כולל אנשי מקצוע.',
                highlights: [
                  'חלל מרווח ומואר לצילומי בוקר והתארגנות',
                  'מראות גוף מלאות, שקעים נוחים ופינות ייעודיות לשיער ואיפור',
                  'חצר ירוקה, קירות אבן ומרפסת גג לתמונות ראשונות',
                  'בקבוק יין מקומי צונן, נשנושים קלים ומכונת קפה חופשית',
                  'חניה שמורה וצמודה לרכב הכלה ולמלווים',
                ],
              },
              {
                num: '02',
                id: 'bride_night_day',
                title: 'הלילה שלפני',
                subtitle: '+ יום ההתארגנות',
                isFeatured: true,
                featureLabel: 'החוויה המלאה',
                details: 'כניסה ב-15:00 ביום שלפני | עזיבה ב-15:30 ביום האירוע. לינה ל-2–3 אורחות ועד 5 מלוות ביום החתונה.',
                highlights: [
                  'כל היתרונות של חבילת יום הכלה',
                  'לינה שקטה במיטת קינג מרווחת עם מצעי כותנה מפנקים',
                  'ערב אינטימי של שקט, שיחה ויין עם אמא או מלווה קרובה',
                  'התעוררות טבעית ללא פקקים וללא לחץ נסיעות בבוקר',
                  'מרפסת גג פרטית לקפה ראשון מול צמרות העצים',
                ],
              },
              {
                num: '03',
                id: 'wedding_night',
                title: 'ליל כלולות',
                subtitle: 'הנחיתה המושלמת',
                isFeatured: false,
                details: 'כניסה לאחר האירוע | צ׳ק-אאוט מאוחר ב-13:00 למחרת. אירוח זוגי שליו ואינטימי.',
                highlights: [
                  'נרות דולקים ואווירה חמה שממתינה לכם בלילה',
                  'בקבוק יין מובחר ופינוק מתוק לציון תחילת הדרך',
                  'מקלחת מרווחת עם חלוקי רחצה רכים וסבונים טבעיים',
                  'צ׳ק-אאוט מאוחר ב-13:00 שמאפשר לקום בנחת',
                  'בוקר רגוע בחצר ההיסטורית של זכרון יעקב',
                ],
              },
            ]).map((pkg) => (
              <div
                key={pkg.id}
                className={`pb-6 sm:pb-8 flex flex-col justify-between text-right transition-colors ${
                  pkg.isFeatured
                    ? 'md:bg-[#E5DFD3]/35 md:p-6 md:-my-4 md:border-l md:border-r border-[#DED5C8] rounded-[4px]'
                    : 'border-b md:border-b-0 md:border-l border-[#DED5C8] md:pl-6 last:border-none'
                }`}
                dir="rtl"
              >
                <div>
                  {/* Top Number & Optional Subtle Feature Tag */}
                  <div className="flex items-center justify-between mb-2 text-right">
                    <span className="text-xs font-mono text-[#7B6045] tracking-widest">
                      {pkg.num}
                    </span>
                    {pkg.featureLabel && (
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#7B6045]">
                        {pkg.featureLabel}
                      </span>
                    )}
                  </div>

                  {/* Title & Subtitle */}
                  <h4 className="font-serif text-xl sm:text-2xl text-[#1E1D1A] font-normal mb-0.5 text-right">
                    {pkg.title}
                  </h4>
                  <div className="font-serif italic text-xs sm:text-sm text-[#7B6045] mb-3 text-right">
                    {pkg.subtitle}
                  </div>

                  {/* Price Block — Elegant, Visible & Un-promotional */}
                  <div className="py-2.5 my-2.5 border-y border-[#DED5C8]/60 text-right">
                    <div className="text-[11px] font-mono text-[#7B6045] tracking-wider mb-0.5">
                      מחיר השקה
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-xl sm:text-2xl font-light text-[#1E1D1A]" dir="ltr">
                        {PRICES[pkg.id as keyof typeof PRICES].toLocaleString()} ₪
                      </span>
                    </div>
                  </div>

                  {/* Essential Practical Details */}
                  <p className="text-xs text-[#292824]/75 font-light leading-relaxed mb-4 text-right">
                    {pkg.details}
                  </p>

                  {/* Included Highlights */}
                  <div className="space-y-2 mb-6 sm:mb-8 text-right">
                    {pkg.highlights.map((h, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-[#292824]/85 font-light text-right">
                        <Check className="w-3.5 h-3.5 text-[#7B6045] shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtle Text CTA */}
                <div className="pt-3 border-t border-[#DED5C8]/60">
                  <button
                    type="button"
                    aria-label={`לפרטים ובדיקת זמינות: ${pkg.title}, ב-WhatsApp`}
                    onClick={() => {
                      if (onSelectPackage) onSelectPackage(pkg.id);
                      handleWhatsAppBrideInquiry(`${pkg.title} (${pkg.subtitle})`);
                    }}
                    className="text-xs font-medium text-[#1E1D1A] hover:text-[#7B6045] transition-colors inline-flex items-center gap-1.5 cursor-pointer text-right group"
                    dir="rtl"
                  >
                    <span>לפרטים ובדיקת זמינות</span>
                    <span aria-hidden="true" className="group-hover:-translate-x-1 transition-transform">←</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Understated Price Note */}
          <div className="mt-8 sm:mt-10 pt-4 border-t border-[#DED5C8]/50 text-right" dir="rtl">
            <p className="text-xs text-[#7B6045] font-light leading-relaxed">
              מחירי ההשקה תקפים לתקופת ההרצה. בסופי שבוע, חגים ותאריכים מיוחדים ייתכנו שינויים במחיר.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
