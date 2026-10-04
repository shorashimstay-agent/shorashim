import React from 'react';
import { IMAGES, AMENITIES } from '../data/shorashimData';
import { RootLine, EditorialTag } from './RootLine';
import Picture from './Picture';
import {
  VintageBedAmenityIllustration,
  VintageKitchenAmenityIllustration,
  VintageRooftopAmenityIllustration,
  VintageCourtyardAmenityIllustration,
  VintageBathroomAmenityIllustration,
  VintageCoffeeAmenityIllustration,
  VintageWifiAmenityIllustration,
  VintageParkingAmenityIllustration,
  VintageTvAmenityIllustration,
  VintageCouplesAmenityIllustration,
  VintageAccessibilityAmenityIllustration,
  VintageDaybedAmenityIllustration,
} from './BespokeIllustrations';

const AMENITY_ILLUSTRATION_MAP: Record<string, React.ComponentType<{ className?: string; color?: string }>> = {
  '1': VintageBedAmenityIllustration,
  '2': VintageKitchenAmenityIllustration,
  '3': VintageRooftopAmenityIllustration,
  '4': VintageCourtyardAmenityIllustration,
  '5': VintageBathroomAmenityIllustration,
  '6': VintageCoffeeAmenityIllustration,
  '7': VintageWifiAmenityIllustration,
  '8': VintageParkingAmenityIllustration,
  '9': VintageTvAmenityIllustration,
  '10': VintageCouplesAmenityIllustration,
  '11': VintageAccessibilityAmenityIllustration,
  '12': VintageDaybedAmenityIllustration,
};

interface HouseSectionProps {
  onOpenBooking: () => void;
}

export default function HouseSection({ onOpenBooking }: HouseSectionProps) {
  // Key spaces of the house with experiential storytelling
  const spaces = [
    {
      title: 'חדר השינה',
      subtitle: 'בוקר שמתחיל לאט',
      desc: 'מיטה מרווחת, מזרן אורתופדי פרימיום ומצעי כותנה טבעיים. חלונות אל צמרות העצים המכניסים אור בוקר רך וצללים עדינים.',
      image: IMAGES.bedroom,
      tag: '01 · שינה ושקט',
    },
    {
      title: 'המטבח והאי המרכזי',
      subtitle: 'קפה, יין ובישול אמיתי',
      desc: 'מטבח שלם מאובזר בכלים איכותיים, כיריים, תנור, מקרר מלא, מכונת קפה עם פולים טריים ואי ישיבה רחב לשיחות אל תוך הלילה.',
      image: IMAGES.interior,
      tag: '02 · קולינריה ושהייה',
    },
    {
      title: 'חדר הרחצה',
      subtitle: 'מקלחון גשם ומגבות עבות',
      desc: 'חלל רחצה מוקפד עם מקלחון מרווח, ראש גשם מרגיע, חלוקי כותנה רכים ומוצרי טיפוח מובחרים בניחוח ים-תיכוני.',
      image: IMAGES.bathroom,
      tag: '03 · מים ורוגע',
    },
    {
      title: 'מרפסת הגג והחצר',
      subtitle: 'בריזה מזכרון וציוץ ציפורים',
      desc: 'חצר ירוקה פרטית תחת עצי פיקוס עתיקים משנת 1882, ועליית גג אינטימית עם ערסל רביצה מול השקיעה.',
      image: IMAGES.rooftop,
      tag: '04 · טבע ומרחב פתוח',
    },
  ];

  return (
    <section id="house" className="bg-[#DED5C8]/40 py-12 sm:py-24 lg:py-36 relative" dir="rtl" lang="he">
      <div className="max-w-7xl mx-auto px-7 sm:px-10 lg:px-12">
        
        {/* Section Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-16 pb-6 sm:pb-8 border-b border-[#DED5C8]">
          <div className="w-full max-w-none md:max-w-2xl text-right">
            <EditorialTag className="mb-3 sm:mb-4 block">
              03 · חללי הבית
            </EditorialTag>
            <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl text-[#1E1D1A] font-normal tracking-tight text-right">
              הבית בשורשים
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-[#292824]/75 font-light leading-relaxed text-right">
              כ-<bdi>80</bdi> מ״ר של מרחב פרטי, מעוצב ומרווח, במפלס קרקע נגיש עם מרפסת גג מבודדת. מקום שבו כל פינה נבחרה בקפידה.
            </p>
          </div>

          <div className="mt-4 md:mt-0 font-mono text-xs text-[#7B6045] text-right" dir="rtl">
            <span>בית מס׳ <bdi>01</bdi></span> · <span><bdi>80</bdi> מ״ר</span> · <span>לזוגות</span>
          </div>
        </div>

        {/* 04 — THE HOUSE: Editorial story of spaces (not a generic grid of cards) */}
        <div className="space-y-12 sm:space-y-24 lg:space-y-36">
          {spaces.map((space, idx) => {
            const isReversed = idx % 2 === 1;
            return (
              <div
                key={space.title}
                className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-16 items-center"
              >
                {/* Image Column — Large, cinematic, unboxed */}
                <div className={`lg:col-span-7 ${isReversed ? 'lg:order-2' : 'lg:order-1'}`}>
                  <div className="aspect-[16/11] sm:aspect-[16/10] overflow-hidden bg-[#292824] shadow-[0_4px_25px_rgba(30,29,26,0.05)]">
                    <Picture
                      image={space.image}
                      alt={space.title}
                      className="w-full h-full object-cover brightness-[0.97] hover:scale-102 transition-transform duration-700 ease-out"
                      sizes="(min-width: 1024px) 58vw, 100vw"
                    />
                  </div>
                  <div className="mt-2 flex justify-between items-center text-[11px] text-[#7B6045] font-mono" dir="rtl">
                    <EditorialTag className="text-[#7B6045] text-[11px]">{space.tag}</EditorialTag>
                    <span>שורשים · זכרון יעקב</span>
                  </div>
                </div>

                {/* Narrative Column */}
                <div className={`lg:col-span-5 text-right w-full max-w-none ${isReversed ? 'lg:order-1' : 'lg:order-2'}`}>
                  <EditorialTag className="mb-2 sm:mb-3 block text-[#7B6045]">
                    {space.tag}
                  </EditorialTag>
                  <h3 className="font-serif text-2xl sm:text-4xl text-[#1E1D1A] font-normal mb-1.5 sm:mb-2 tracking-tight text-right">
                    {space.title}
                  </h3>
                  <div className="font-serif italic text-base sm:text-xl text-[#7B6045] font-light mb-3 sm:mb-5 text-right">
                    {space.subtitle}
                  </div>
                  <p className="text-sm sm:text-base text-[#292824]/75 font-light leading-relaxed mb-6 sm:mb-8 text-right">
                    {space.desc}
                  </p>
                  
                  <div className="w-16 h-[1px] bg-[#7B6045]/40 mr-0 ml-auto lg:mr-0" />
                </div>
              </div>
            );
          })}
        </div>

        {/* 04 — חוויה לשניים: Quiet Editorial Composition */}
        <div className="mt-14 sm:mt-24 lg:mt-36 pt-10 sm:pt-16 border-t border-[#DED5C8]" dir="rtl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            
            {/* Text Column (Right side in RTL) */}
            <div className="lg:col-span-5 text-right w-full max-w-none space-y-4 sm:space-y-6">
              <EditorialTag className="block text-[#7B6045]">
                04 · חוויה לשניים
              </EditorialTag>

              <h3 className="text-3xl sm:text-4xl md:text-5xl text-[#1E1D1A] font-light leading-[1.15] tracking-tight text-right">
                בוקר שמתחיל לאט.
                <br />
                <span className="text-[#7B6045]">וערב שלא צריך למהר ממנו לשום מקום.</span>
              </h3>

              <div className="space-y-2.5 sm:space-y-3 text-base sm:text-lg text-[#27241F]/80 font-light leading-relaxed text-right">
                <p>קפה שחולטים בלי לחץ של שעון.</p>
                <p>מצעים לבנים נקיים שנשארים בתוכם עוד קצת.</p>
                <p>זכרון יעקב ממש מעבר לדלת, וכשחוזרים, השקט המוחלט של החצר מחכה רק לכם.</p>
              </div>

              <div className="pt-2 sm:pt-4">
                <button
                  type="button"
                  onClick={onOpenBooking}
                  className="px-6 py-2.5 sm:px-7 sm:py-3 bg-[#1E1D1A] text-white hover:bg-[#7B6045] transition-colors duration-300 text-xs sm:text-sm font-normal tracking-wide cursor-pointer rounded-[6px]"
                >
                  בדיקת זמינות
                </button>
              </div>
            </div>

            {/* Large Atmospheric Photograph (Left side in RTL) */}
            <div className="lg:col-span-7">
              <div className="aspect-[16/11] overflow-hidden bg-[#292824] shadow-[0_4px_25px_rgba(30,29,26,0.06)]">
                <Picture
                  image={IMAGES.courtyard}
                  alt="שקט וחצר ירוקה בשורשים, זכרון יעקב"
                  className="w-full h-full object-cover brightness-[0.98] hover:scale-102 transition-transform duration-700 ease-out"
                  sizes="(min-width: 1024px) 58vw, 100vw"
                />
              </div>
              <div className="mt-2 text-[11px] font-sans text-[#7B6045] tracking-wider text-right" dir="rtl">
                החצר השקטה, עצי הפיקוס והאבן ההיסטורית · שורשים, זכרון יעקב
              </div>
            </div>

          </div>
        </div>

        {/* 06 — PRACTICAL DETAILS: Minimal typographic list (not generic rounded icon cards) */}
        <div className="mt-12 sm:mt-24 lg:mt-36 pt-10 sm:pt-16 border-t border-[#DED5C8]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            <div className="lg:col-span-4 text-right w-full max-w-none md:max-w-md">
              <EditorialTag className="mb-2 sm:mb-3 block">
                05 · מפרט ופרטים
              </EditorialTag>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#1E1D1A] font-normal mb-3 sm:mb-4 text-right">
                כל מה שנמצא בבית
              </h3>
              <p className="text-xs sm:text-base text-[#292824]/70 font-light leading-relaxed text-right">
                חשבנו על כל פרט קטן כדי שתוכלו להגיע עם תיק קטן ולהרגיש מיד בבית.
              </p>
            </div>

            <div className="lg:col-span-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 sm:gap-y-6">
                {AMENITIES.map((item) => {
                  const Illustration = AMENITY_ILLUSTRATION_MAP[item.id];
                  return (
                    <div key={item.id} className="pb-3 sm:pb-4 border-b border-[#DED5C8]/70 text-right">
                      {Illustration && (
                        <div aria-hidden="true" className="mb-2 text-[#7B6045]">
                          <Illustration className="w-6 h-6 sm:w-6.5 sm:h-6.5" color="#7B6045" />
                        </div>
                      )}
                      <div className="text-sm font-medium text-[#1E1D1A] mb-1 text-right">
                        {item.name}
                      </div>
                      {item.description && (
                        <div className="text-xs text-[#292824]/80 font-light leading-relaxed text-right">
                          {item.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
