import { IMAGES, AMENITIES } from '../data/shorashimData';
import { RootLine, EditorialTag } from './RootLine';
import Picture from './Picture';

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
    <section id="house" className="bg-[#DED5C8]/40 py-28 sm:py-36 relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-12">
        
        {/* Section Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 pb-8 border-b border-[#DED5C8]">
          <div className="max-w-2xl">
            <EditorialTag className="mb-4 block">
              03 · חללי הבית
            </EditorialTag>
            <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[#1E1D1A] font-normal tracking-tight">
              הבית בשורשים
            </h2>
            <p className="mt-4 text-base sm:text-lg text-[#292824]/75 font-light leading-relaxed">
              כ-80 מ"ר של מרחב פרטי, מעוצב ומרווח, במפלס קרקע נגיש עם מרפסת גג מבודדת. מקום שבו כל פינה נבחרה בקפידה.
            </p>
          </div>

          <div className="mt-6 md:mt-0 font-mono text-xs text-[#7B6045]">
            בית מס' 01 · 80 מ"ר · לזוגות
          </div>
        </div>

        {/* 04 — THE HOUSE: Editorial story of spaces (not a generic grid of cards) */}
        <div className="space-y-24 sm:space-y-36">
          {spaces.map((space, idx) => {
            const isReversed = idx % 2 === 1;
            return (
              <div
                key={space.title}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center ${
                  isReversed ? 'lg:direction-ltr' : ''
                }`}
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
                  <div className="mt-2.5 flex justify-between items-center text-[11px] text-[#7B6045] font-mono">
                    <span>{space.tag}</span>
                    <span>שורשים · זכרון יעקב</span>
                  </div>
                </div>

                {/* Narrative Column */}
                <div className={`lg:col-span-5 ${isReversed ? 'lg:order-1' : 'lg:order-2'}`}>
                  <EditorialTag className="mb-3 block text-[#7B6045]">
                    {space.tag}
                  </EditorialTag>
                  <h3 className="font-serif text-3xl sm:text-4xl text-[#1E1D1A] font-normal mb-2 tracking-tight">
                    {space.title}
                  </h3>
                  <div className="font-serif italic text-lg sm:text-xl text-[#7B6045] font-light mb-5">
                    {space.subtitle}
                  </div>
                  <p className="text-base text-[#292824]/75 font-light leading-relaxed mb-8">
                    {space.desc}
                  </p>
                  
                  <div className="w-16 h-[1px] bg-[#7B6045]/40" />
                </div>
              </div>
            );
          })}
        </div>

        {/* 05 — A STAY FOR TWO: Quiet Sensual Section */}
        <div className="mt-32 sm:mt-44 bg-[#1E1D1A] text-[#F4F0E8] p-10 sm:p-20 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <EditorialTag light className="mb-6 block text-[#DED5C8]/80">
              04 · חוויה לשניים
            </EditorialTag>
            
            <h3 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal leading-snug mb-8 text-[#F4F0E8]">
              בוקר שמתחיל לאט.
              <br />
              <span className="text-[#DED5C8] font-light">וערב שלא צריך למהר ממנו לשום מקום.</span>
            </h3>

            <div className="space-y-4 font-serif text-lg sm:text-xl text-[#DED5C8]/90 font-light leading-relaxed mb-10">
              <p>קפה שחולטים בלי לחץ של שעון.</p>
              <p>מצעים לבנים נקיים שנשארים בתוכם עוד קצת.</p>
              <p>זכרון יעקב ממש מעבר לדלת — וכשחוזרים, השקט המוחלט של החצר מחכה רק לכם.</p>
            </div>

            <button
              onClick={onOpenBooking}
              className="px-8 py-3.5 bg-[#F4F0E8] text-[#1E1D1A] hover:bg-[#DED5C8] transition-colors duration-300 text-sm font-medium tracking-wide cursor-pointer"
            >
              לבדיקת זמינות לחופשה זוגית
            </button>
          </div>

          {/* Architectural background accent line */}
          <div className="absolute left-10 top-0 bottom-0 w-8 hidden md:block opacity-20 pointer-events-none">
            <RootLine variant="vertical" color="#DED5C8" className="h-full" />
          </div>
        </div>

        {/* 06 — PRACTICAL DETAILS: Minimal typographic list (not generic rounded icon cards) */}
        <div className="mt-28 sm:mt-36 pt-16 border-t border-[#DED5C8]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-4">
              <EditorialTag className="mb-3 block">
                05 · מפרט ופרטים
              </EditorialTag>
              <h3 className="font-serif text-3xl text-[#1E1D1A] font-normal mb-4">
                כל מה שנמצא בבית
              </h3>
              <p className="text-sm sm:text-base text-[#292824]/70 font-light leading-relaxed">
                חשבנו על כל פרט קטן כדי שתוכלו להגיע עם תיק קטן ולהרגיש מיד בבית.
              </p>
            </div>

            <div className="lg:col-span-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6">
                {AMENITIES.map((item) => (
                  <div key={item.id} className="pb-4 border-b border-[#DED5C8]/70">
                    <div className="text-sm font-medium text-[#1E1D1A] mb-1">
                      {item.name}
                    </div>
                    {item.description && (
                      <div className="text-xs text-[#292824]/80 font-light leading-relaxed">
                        {item.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
