import { Clock, Heart, Sprout, Landmark } from 'lucide-react';
import { IMAGES } from '../data/shorashimData';
import Picture from './Picture';

export default function StorySection() {
  return (
    <section id="story" className="py-24 bg-[#FAF7F2] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <span className="text-xs font-semibold tracking-wider text-[#A07044] uppercase block mb-2">
            04 | הסיפור שלנו
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#241E1A] font-normal tracking-tight mb-4">
            יש מקומות שמתחילים מתוכנית. שורשים התחיל מגעגוע.
          </h2>
          <p className="text-lg sm:text-xl text-[#6D6457] leading-relaxed">
            הסיפור שלנו מתחיל הרבה לפני הצימר. בשנת 1882 הגיעו לאדמות זמארין, שלימים הפכה לזכרון יעקב,
            המשפחות שמהן צמחה משפחת פויזנר.
          </p>
        </div>

        {/* Narrative Grid with Archival & Courtyard Photography */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-16">
          
          {/* Main Story Content */}
          <div className="lg:col-span-7 space-y-8 text-[#453E35] text-base sm:text-lg leading-relaxed">
            
            {/* Chapter 1: Five Generations */}
            <div className="relative pl-0 pr-4 border-r-2 border-[#D9CFBF]">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#8B6B48] mb-2">
                <Clock className="w-4 h-4" />
                <span>חמישה דורות של אדמה</span>
              </div>
              <p>
                אברהם פויזנר המשיך את המשק המשפחתי, בנה את ביתו במו ידיו ופיתח משק של כרמים ועצי פרי. בהמשך הצטרף אליו בנו יוסי ,אבא שלנו, והמשיך את המסורת החקלאית.
              </p>
              <p className="mt-3">
                אבא היה חקלאי בכל מהותו. איש אדמה, איש עבודה, עקשן ורגיש. ציוני ואיש משפחה. האדמה לא הייתה רק העבודה שלו היא הייתה חלק מהזהות שלו. אנחנו, יואב ושרי, גדלנו בתוך המשק. הכרם, המטע, הקטיף והבציר היו חלק בלתי נפרד מנוף הילדות שלנו.
              </p>
            </div>

            {/* Chapter 2: The House of Tzipi and Yossi */}
            <div className="relative pl-0 pr-4 border-r-2 border-[#D9CFBF]">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#8B6B48] mb-2">
                <Heart className="w-4 h-4" />
                <span>הבית של ציפי ויוסי</span>
              </div>
              <p>
                ולצד האדמה של אבא הייתה אמא. <strong>ציפי</strong>.
              </p>
              <p className="mt-2 text-[#2C2926] font-medium">
                סטייל. הכלה. הקשבה. חיוך. עיניים ירוקות וטובות. וקפה איכותי.
              </p>
              <p className="mt-3">
                היא אהבה עתיקות, רהיטים עם סיפור, סחלבים ודברים יפים, וידעה לחבר אותם עם החדש באופן שהיה רק שלה.
                אבל יותר מהכול, ציפי ויוסי יצרו בית. עוד כשהתחיל מצריף קטן, הבית היה מרכז המפגשים.
                אנשים הגיעו לקפה, לשיחה, לשמן זית, לחיבוק, לארוחה חמה או לחגוג יחד. לפעמים הוא הרגיש כמו תחנת רכבת, ותמיד היה מקום לעוד אחד.
              </p>
            </div>

            {/* Chapter 3: When the House Emptied & Shorashim Was Born */}
            <div className="relative pl-0 pr-4 border-r-2 border-[#D9CFBF]">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#8B6B48] mb-2">
                <Sprout className="w-4 h-4" />
                <span>כשהבית התרוקן, וכך נולד שורשים</span>
              </div>
              <p>
                אחרי שאמא ואבא כבר לא היו, השכרנו את הבית כדי שלא יעמוד ריק. הריק כאב לנו יותר מהמלא.
                אבל אז הבנו שגם לנו כבר אין מקום לחזור אליו כשאנחנו מגיעים לזכרון. וכך נולד הרעיון ליצור בחצר מקום קטן שיהיה גם שלנו.
              </p>
              <p className="mt-3">
                עם הזמן הגיע רצון נוסף: לשמור את הדברים של אמא, את הרהיטים והחפצים, את התמונות ואת הסיפור.
                אבל לא רצינו מוזיאון. רצינו מקום שחיים בו.
              </p>
              <p className="mt-3 font-medium text-[#2C2926]">
                ישן לצד חדש. האדמה של אבא והסטייל של אמא. תמונות משפחתיות לצד מטבח חדש. זיכרונות ישנים לצד אנשים חדשים.
              </p>
            </div>

          </div>

          {/* Archival Visual Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-3xl overflow-hidden border border-[#E0D5C3] shadow-md bg-white p-3">
              <Picture
                image={IMAGES.heritage}
                alt="מורשת חקלאית של משפחת פויזנר בזמארין 1882"
                className="w-full h-80 object-cover rounded-2xl filter sepia-[0.25] contrast-105"
                sizes="(min-width: 1024px) 40vw, 100vw"
              />
              <div className="p-4 text-center">
                <span className="text-xs uppercase tracking-wider text-[#8B6B48] font-semibold block mb-1">
                  1882 • משק פויזנר, זכרון יעקב
                </span>
                <p className="text-xs text-[#7A7163] leading-relaxed">
                  השורשים נמצאים באדמה, בעצים, בכרמים ובבית הפתוח
                </p>
              </div>
            </div>

            {/* Why Shorashim Quote Box */}
            <div className="bg-[#F3ECE0] rounded-2xl p-6 sm:p-8 border border-[#E5DBCC]">
              <div className="flex items-center gap-2 text-[#8B6B48] font-semibold text-sm mb-3">
                <Landmark className="w-4 h-4" />
                <span>למה שורשים?</span>
              </div>
              <p className="font-serif text-lg sm:text-xl text-[#2C2926] leading-relaxed mb-4 italic">
                ״חמישה דורות בזכרון יעקב. אדמה שעברה במשפחה. עצי פיקוס שסבא נטע. בית שאנחנו זוכרים.
                הורים שאנחנו מתגעגעים אליהם. וילדים שאנחנו רוצים שיידעו מאיפה הם באו.
                כנראה שלא יכולנו לקרוא לו אחרת. שורשים.״
              </p>
              <span className="text-xs font-semibold text-[#8B6B48]">
                שרי ויואב פויזנר
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
