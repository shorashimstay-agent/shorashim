import Picture from './Picture';
import React from 'react';
import { IMAGES, AMENITIES } from '../data/shorashimData';
import { RootLine, EditorialTag } from './RootLine';
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
      image: IMAGES.bedroom_linen,
      alt: 'חדר השינה: מיטה זוגית עם מצעים לבנים ומנורות לילה',
      tag: '01 · שינה ושקט',
    },
    {
      title: 'המטבח והאי המרכזי',
      subtitle: 'קפה, יין ובישול אמיתי',
      desc: 'מטבח מאובזר עם כלי בישול איכותיים, כיריים, תנור, מקרר ומכונת קפה עם פולים טריים, לצד אי ישיבה רחב לשיחות אל תוך הלילה.',
      image: IMAGES.kitchen_wall,
      alt: 'המטבח בשורשים: אי ישיבה, כיסאות בר וקיר תמונות משפחתיות',
      tag: '02 · קולינריה ושהייה',
    },
    {
      title: 'חדר הרחצה',
      subtitle: 'המקום שבו החופשה באמת מתחילה',
      desc: 'חלל רחצה מוקפד עם מקלחון מרווח, ראש גשם מרגיע, חלוקי כותנה רכים ומוצרי טיפוח מובחרים בניחוח ים-תיכוני.',
      image: IMAGES.shower_portrait,
      alt: 'מקלחון גשם עם דלתות זכוכית ואור שמש',
      tag: '03 · מים ורוגע',
    },
    {
      title: 'מרפסת הגג והחצר',
      subtitle: 'בריזה מזכרון וציוץ ציפורים',
      desc: 'חצר ירוקה ופרטית בצל עצי פיקוס עתיקים משנת 1882, ומרפסת גג אינטימית עם ערסל רביצה מול השקיעה.',
      image: IMAGES.balcony_view,
      alt: 'מבט מהמרפסת אל בית האבן הישן בצל ענפי הפיקוס',
      tag: '04 · טבע ומרחב פתוח',
    },
  ];

  return (
    <section tabIndex={-1} id="house" className="bg-[#DED5C8]/40 py-12 sm:py-20 relative" dir="rtl" lang="he">
      <div className="max-w-7xl mx-auto px-7 sm:px-10 lg:px-12">
        
        {/* Section Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-7 sm:mb-9 pb-6 sm:pb-8 border-b border-[#DED5C8]">
          <div className="w-full max-w-none md:max-w-2xl text-right">
            <EditorialTag className="mb-3 sm:mb-4 block">
              חללי הסוויטה
            </EditorialTag>
            <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl text-[#1E1D1A] font-normal tracking-tight text-right">
              הסוויטה בשורשים
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-[#292824]/75 font-light leading-relaxed text-right">
              כ־<bdi>80</bdi> מ״ר של מרחב פרטי, מעוצב ומרווח, במפלס הקרקע עם מרפסת גג מבודדת. מקום שבו כל פינה נבחרה בקפידה.
            </p>
          </div>
        </div>

        {/* 04 — THE HOUSE: Editorial story of spaces (not a generic grid of cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 sm:gap-y-10">
          {spaces.map((space, idx) => {
            return (
              <div
                key={space.title}
                id={idx === 2 ? "bathroom" : undefined}
                style={idx === 2 ? { scrollMarginTop: "120px" } : undefined}
                className={idx >= 2 ? "md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-center border-t border-[#DED5C8] pt-10" : "flex flex-col gap-4 items-stretch"}
              >
                {/* Image Column — Large, cinematic, unboxed */}
                <div className="w-full">
                  <div className={idx === 2 ? "w-full max-w-[400px] mx-auto shadow-[0_4px_25px_rgba(30,29,26,0.05)]" : idx === 3 ? "w-full shadow-[0_4px_25px_rgba(30,29,26,0.05)]" : "w-full shadow-[0_4px_25px_rgba(30,29,26,0.05)]"}>
                    <Picture
                      image={space.image}
                      alt={space.alt}
                      className={idx >= 2 ? "w-full h-auto object-contain" : "w-full h-auto object-contain"}
                      sizes={idx === 2 ? "(max-width: 767px) 100vw, 400px" : "(max-width: 767px) 100vw, 50vw"}
                    />
                  </div>
                  <div className="mt-2 flex justify-between items-center text-[11px] text-[#7B6045] font-mono" dir="rtl">
                    <EditorialTag className="text-[#7B6045] text-[11px]">{idx === 0 ? 'שקט, פשתן לבן ונוחות עכשווית' : idx === 1 ? 'ישן, חדש וסביב אותו שולחן' : idx === 2 ? 'אור טבעי, מים ואבן' : 'מאה ועשרים שנה, ממש מול המרפסת'}</EditorialTag>
                  </div>
                </div>

                {/* Narrative Column */}
                <div className="text-right w-full">
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

        {/* 06 — PRACTICAL DETAILS: Minimal typographic list (not generic rounded icon cards) */}
        <div className="mt-10 sm:mt-14 pt-8 border-t border-[#DED5C8]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            <div className="lg:col-span-4 text-right w-full max-w-none md:max-w-md">
              <EditorialTag className="mb-2 sm:mb-3 block">
                מפרט ופרטים
              </EditorialTag>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#1E1D1A] font-normal mb-3 sm:mb-4 text-right">
                כל מה שנמצא בסוויטה
              </h3>
              <p className="text-xs sm:text-base text-[#292824]/70 font-light leading-relaxed text-right">
                חשבנו על כל פרט קטן כדי שתוכלו להגיע עם תיק קטן ולהרגיש מיד בבית.
              </p>
            </div>

            <div className="lg:col-span-8">
              <details><summary>למפרט המלא של הסוויטה</summary><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 sm:gap-y-6">
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
                        <div className="text-xs text-[#292824]/65 font-light leading-relaxed text-right">
                          {item.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div></details>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}



