import type { ElementType } from 'react';
import {
  BedDouble,
  UtensilsCrossed,
  Sun,
  Trees,
  Bath,
  Coffee,
  Wifi,
  Car,
  Tv,
  Sparkles,
  Accessibility,
  Sofa,
  CheckCircle2,
  Calendar,
  Wind,
  MapPin,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { BRAND_DATA, AMENITIES, IMAGES } from '../data/shorashimData';
import Picture from './Picture';

interface StaySectionProps {
  onOpenBooking: () => void;
}

const iconMap: Record<string, ElementType> = {
  BedDouble,
  UtensilsCrossed,
  Sun,
  Trees,
  Bath,
  Coffee,
  Wifi,
  Car,
  Tv,
  Sparkles,
  Accessibility,
  Sofa,
  Wind,
};

const itemPills = [
  'חדר שינה נפרד',
  'מרחב נוסף לרביצה ולינה',
  'מטבח מלא ומאובזר',
  'אי רחב',
  'מכונת קפה',
  'קפה וחלב',
  'Wi-Fi',
  'טלוויזיה',
  'מיזוג אוויר',
  'חדר רחצה מרווח',
  'מקלחון עם ראש גשם',
  'מוצרי רחצה',
  'מגבות וחלוקים',
  'חצר ירוקה וציוץ ציפורים',
  'מרפסת גג פרטית',
  'פינת ישיבה וערסל',
  'חניה',
];

export default function StaySection({ onOpenBooking }: StaySectionProps) {
  return (
    <section id="stay" className="py-24 bg-[#FAF7F2] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold tracking-wider text-[#A07044] uppercase block mb-3">
            02 | האירוח
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#241E1A] font-normal tracking-tight mb-4">
            האירוח בשורשים
          </h2>
          <p className="font-serif text-xl sm:text-2xl text-[#8B6B48] font-normal italic">
            העבר לא נשאר מאחור. הוא פשוט קיבל מקום חדש.
          </p>
        </div>

        {/* Narrative & Visual Showcase: 2-column layout preserving original design language */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
          
          {/* Text Story Column */}
          <div className="lg:col-span-6 space-y-6 text-[#453E35] text-base sm:text-lg leading-relaxed">
            <p className="text-lg sm:text-xl font-normal text-[#241E1A] leading-relaxed">
              כמה בתים מהמדרחוב של זכרון יעקב, בתוך משק משפחתי שעובר מדור לדור, יצרנו את שורשים - בית בוטיק למבוגרים בלבד, שבו דברים עם עבר פוגשים עיצוב עכשווי ואת כל מה שאנחנו אוהבים באירוח של היום.
            </p>

            <div className="p-6 rounded-2xl bg-[#F4EDE2] border-r-4 border-[#8B6B48]">
              <p className="font-serif text-xl sm:text-2xl text-[#241E1A] font-normal mb-1">
                בשורשים, שום דבר לא נבחר כדי "להיראות כמו פעם"
              </p>
              <p className="font-serif text-xl sm:text-2xl text-[#8B6B48] font-normal">
                הוא פשוט היה כאן פעם
              </p>
            </div>

            <p>
              רהיטים וחפצים מהבית המשפחתי, תמונות ישנות, עץ ואבן חיים לצד עיצוב נקי ועכשווי. לא ניסינו לשחזר את העבר בחרנו את הדברים שאנחנו אוהבים ממנו ונתנו להם חיים חדשים.
            </p>

            <p className="font-serif text-lg sm:text-xl text-[#8B6B48] font-medium">
              ישן עם חדש. סיפור עם סטייל. בית עם בוטיק.
            </p>

            {/* Quick Specs Badges */}
            <div className="flex flex-wrap gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ECE4D8] text-[#2C2926] text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#8B6B48]" />
                80 מ"ר שנועדו פשוט ליהנות מהם
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ECE4D8] text-[#2C2926] text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#8B6B48]" />
                {BRAND_DATA.capacity}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ECE4D8] text-[#2C2926] text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#8B6B48]" />
                צמוד למדרחוב – קולינריה, יין וחיי לילה
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ECE4D8] text-[#2C2926] text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#8B6B48]" />
                חצר ירוקה, שקט וציוץ ציפורים
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ECE4D8] text-[#2C2926] text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#8B6B48]" />
                חניה פרטית צמודה
              </span>
            </div>
          </div>

          {/* Visual Showcase - Photo Composition */}
          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="relative rounded-3xl overflow-hidden shadow-sm border border-[#E4DDD1] group">
                <Picture
                  image={IMAGES.interior}
                  alt="מטבח מאובזר ואי רחב בשורשים"
                  className="w-full h-64 sm:h-72 object-cover object-center group-hover:scale-103 transition-transform duration-700"
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs">
                  אי המטבח המרווח
                </div>
              </div>

              <div className="relative rounded-3xl overflow-hidden shadow-sm border border-[#E4DDD1] group">
                <Picture
                  image={IMAGES.bedroom}
                  alt="חדר שינה נפרד ושקט"
                  className="w-full h-44 sm:h-52 object-cover group-hover:scale-103 transition-transform duration-700"
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs">
                  חדר שינה נפרד ושקט
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6">
              <div className="relative rounded-3xl overflow-hidden shadow-sm border border-[#E4DDD1] group">
                <Picture
                  image={IMAGES.rooftop}
                  alt="מרפסת גג פרטית עם ערסל"
                  className="w-full h-44 sm:h-52 object-cover group-hover:scale-103 transition-transform duration-700"
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs">
                  מרפסת גג פרטית וערסל
                </div>
              </div>

              <div className="relative rounded-3xl overflow-hidden shadow-sm border border-[#E4DDD1] group">
                <Picture
                  image={IMAGES.courtyard}
                  alt="החצר ועצי הפיקוס הוותיקים"
                  className="w-full h-64 sm:h-72 object-cover object-center group-hover:scale-103 transition-transform duration-700"
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs">
                  החצר ועצי הפיקוס
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Experience Narrative Cards (80 SQM + Tzipi Style + Location) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          
          {/* Card 1: 80 SQM Flow */}
          <div className="bg-white rounded-3xl p-8 border border-[#E8E1D5] shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-[#F4EDE2] flex items-center justify-center text-[#8B6B48] mb-4">
                <Sun className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl text-[#241E1A] font-medium mb-3">
                80 מ"ר שנועדו פשוט ליהנות מהם
              </h3>
              <p className="text-sm sm:text-base text-[#574E43] leading-relaxed mb-3">
                הבוקר יכול להתחיל לאט, עם קפה ליד האי הגדול במטבח או על מרפסת הגג. אחר כך אפשר לצאת ברגל אל הרחובות של זכרון לקפה, לארוחה טובה, לכוס ייין או לשיטוט בלי תוכנית. ובערב לחזור, לפתוח בקבוק, לעלות לגג הפרטי, להתיישב בפינת הישיבה או להישען לאחור בערסל ולתת לזמן קצת להאט.
              </p>
              <p className="text-sm sm:text-base text-[#574E43] leading-relaxed">
                בבית מחכה חדר שינה נפרד ושקט, מטבח גדול ומאובזר שאפשר באמת לבשל בו, חדר רחצה מרווח ומוקפד ומרחב נוסף לרביצה, קריאה ומנוחה, עם ספה שנפתחת בעת הצורך למקום לינה לאורח שלישי.
              </p>
            </div>
            <div className="pt-4 border-t border-[#F0EAE1]">
              <p className="font-serif text-base text-[#8B6B48] font-medium">
                מקום שלא רק ישנים בו. נשארים בו.
              </p>
            </div>
          </div>

          {/* Card 2: Style with Roots (ציפי) */}
          <div className="bg-white rounded-3xl p-8 border border-[#E8E1D5] shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-[#F4EDE2] flex items-center justify-center text-[#8B6B48] mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl text-[#241E1A] font-medium mb-3">
                והסטייל ? גם לו יש שורשים.
              </h3>
              <p className="text-sm sm:text-base text-[#574E43] leading-relaxed mb-3">
                אמא שלנו, ציפי, ידעה לחבר עתיקות ורהיטים עם אופי לפריטים עכשוויים. היא אהבה אסתטיקה, סחלבים, דברים יפים וקפה איכותי.
              </p>
              <p className="text-sm sm:text-base text-[#574E43] leading-relaxed">
                משהו מהדרך שלה לראות יופי נשאר כאן ברהיטים, בפריטים הקטנים, בחיבורים הלא צפויים ובמפגש שבין מה שהיה כאן פעם לבין מה שיצרנו היום.
              </p>
            </div>
            <div className="pt-4 border-t border-[#F0EAE1]">
              <p className="font-serif text-base text-[#8B6B48] font-medium">
                חיבורים לא צפויים ויופי שנשאר.
              </p>
            </div>
          </div>

          {/* Card 3: Location (קרובים להכל) */}
          <div className="bg-white rounded-3xl p-8 border border-[#E8E1D5] shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-[#F4EDE2] flex items-center justify-center text-[#8B6B48] mb-4">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl sm:text-2xl text-[#241E1A] font-medium mb-3">
                קרובים להכול. עם שקט משלכם.
              </h3>
              <p className="text-sm sm:text-base text-[#241E1A] font-medium leading-relaxed mb-3">
                משק פויזנר, המייסדים 71, זכרון יעקב, כמה בתים מהמדרחוב.
              </p>
              <p className="text-sm sm:text-base text-[#574E43] leading-relaxed">
                יוצאים מהשער ותוך רגע נמצאים בין בתי הקפה, המסעדות, הפאבים, הגלידריות, היין והאווירה של המושבה. וכשמתחשק לעצור — חוזרים לשקט של שורשים.
              </p>
            </div>
            <div className="pt-4 border-t border-[#F0EAE1]">
              <p className="font-serif text-base text-[#8B6B48] font-medium">
                משק פויזנר, המייסדים 71, זכרון יעקב
              </p>
            </div>
          </div>

        </div>

        {/* What Awaits You (מה מחכה לכם בשורשים) */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8E1D5] shadow-xs mb-16">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h3 className="font-serif text-2xl sm:text-3xl text-[#241E1A] font-normal mb-3">
              מה מחכה לכם בשורשים
            </h3>
            <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-[#FAF7F2] border border-[#E8E1D5] text-[#8B6B48] text-sm sm:text-base font-medium">
              <span>כ־80 מ"ר</span>
              <span>|</span>
              <span>לזוגות בלבד</span>
              <span>|</span>
              <span>אידיאלי לזוג ועד 3 אורחים</span>
            </div>
          </div>

          {/* Clean Pill List of Features */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 py-6 px-4 bg-[#FAF8F5] rounded-2xl border border-[#EFE9DF] text-sm sm:text-base text-[#3A332C]">
            {itemPills.map((pill, idx) => (
              <span key={idx} className="inline-flex items-center gap-2">
                <span>{pill}</span>
                {idx < itemPills.length - 1 && (
                  <span className="text-[#C4B6A6] font-bold">•</span>
                )}
              </span>
            ))}
          </div>

          {/* Rules & Practical Info Bar */}
          <div className="mt-8 pt-6 border-t border-[#F0EAE1] flex flex-col md:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-[#5C5449]">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="font-semibold text-[#241E1A]">צ'ק־אין {BRAND_DATA.checkIn}</span>
              <span className="text-[#C4B6A6]">|</span>
              <span className="font-semibold text-[#241E1A]">צ'ק־אאוט {BRAND_DATA.checkOut}</span>
              <span className="text-[#C4B6A6]">|</span>
              <span>ללא בעלי חיים</span>
              <span className="text-[#C4B6A6]">|</span>
              <span>עישון בחוץ בלבד</span>
            </div>

            <div className="flex items-center gap-2 text-[#7A6F62]">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-[#8B6B48]" />
                הצימר נגיש מאוד
              </span>
              <span className="text-[#C4B6A6]">|</span>
              <span>מרפסת הגג אינה נגישה</span>
            </div>
          </div>
        </div>

        {/* Closing CTA */}
        <div className="text-center py-6">
          <p className="font-serif text-2xl sm:text-3xl text-[#241E1A] mb-6 font-normal">
            שורשים. מקום להתחבר אליו.
          </p>

          <button
            onClick={onOpenBooking}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#8B6B48] hover:bg-[#735637] text-white text-base sm:text-lg font-medium shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Calendar className="w-5 h-5" />
            <span>בדיקת זמינות והזמנה</span>
          </button>
        </div>

      </div>
    </section>
  );
}
