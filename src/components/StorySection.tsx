import { Clock, Landmark } from 'lucide-react';
import { IMAGES } from '../data/shorashimData';
import { RootLine, EditorialTag } from './RootLine';
import Picture from './Picture';

export default function StorySection() {
  return (
    <section id="story" className="py-28 sm:py-36 bg-[#F4F0E8] relative overflow-hidden">
      
      {/* Subtle architectural root motif */}
      <div className="absolute left-10 top-0 bottom-0 w-8 z-0 hidden lg:block opacity-30 pointer-events-none">
        <RootLine variant="vertical" color="#7B6045" className="h-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-12 relative z-10">
        
        {/* Section Header — Discovered deeper down the page */}
        <div className="max-w-3xl mb-20">
          <EditorialTag className="mb-4 block">
            הסיפור של שורשים
          </EditorialTag>
          
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[#1E1D1A] font-normal tracking-tight mb-6">
            יש מקומות שמתחילים מתוכנית.
            <br />
            <span className="text-[#7B6045] font-light">שורשים התחיל מגעגוע.</span>
          </h2>
          
          <p className="text-lg sm:text-xl text-[#292824]/75 font-light leading-relaxed">
            הסיפור שלנו מתחיל הרבה לפני הבית. בשנת 1882 הגיעו לאדמות זמארין, שלימים הפכה לזכרון יעקב,
            המשפחות שמהן צמחה משפחת פויזנר.
          </p>
        </div>

        {/* The Authentic Story & Archival Discovery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start mb-24">
          
          {/* Main Story Narrative */}
          <div className="lg:col-span-7 space-y-12 text-[#292824]/85 text-base sm:text-lg leading-relaxed font-light">
            
            {/* Chapter 1: Five Generations */}
            <div className="pt-2 border-t border-[#DED5C8]">
              <div className="flex items-center gap-3 text-xs tracking-widest uppercase font-mono text-[#7B6045] mb-3">
                <Clock className="w-3.5 h-3.5" />
                <span>חמישה דורות של אדמה</span>
              </div>
              <p className="mb-4">
                אברהם פויזנר המשיך את המשק המשפחתי, בנה את ביתו במו ידיו ופיתח משק של כרמים ועצי פרי. בהמשך הצטרף אליו בנו יוסי, אבא שלנו, והמשיך את המסורת החקלאית.
              </p>
              <p>
                אבא היה חקלאי בכל מהותו. איש אדמה, איש עבודה, עקשן ורגיש. ציוני ואיש משפחה. האדמה לא הייתה רק העבודה שלו — היא הייתה חלק מהזהות שלו. אנחנו, יואב ושרי, גדלנו בתוך המשק. הכרם, המטע, הקטיף והבציר היו חלק בלתי נפרד מנוף הילדות שלנו.
              </p>
            </div>

            {/* Chapter 2: The House of Tzipi and Yossi */}
            <div className="pt-8 border-t border-[#DED5C8]">
              <div className="flex items-center gap-3 text-xs tracking-widest uppercase font-mono text-[#7B6045] mb-3">
                <Landmark className="w-3.5 h-3.5" />
                <span>הבית של ציפי ויוסי</span>
              </div>
              <p className="mb-2">
                ולצד האדמה של אבא הייתה אמא. <strong className="font-medium text-[#1E1D1A]">ציפי</strong>.
              </p>
              <p className="font-serif italic text-lg sm:text-xl text-[#7B6045] mb-4">
                סטייל. הכלה. הקשבה. חיוך. עיניים ירוקות וטובות. וקפה איכותי.
              </p>
              <p>
                היא אהבה עתיקות, רהיטים עם סיפור, סחלבים ודברים יפים, וידעה לחבר אותם עם החדש באופן שהיה רק שלה. אבל יותר מהכול, ציפי ויוסי יצרו בית. עוד כשהתחיל מצריף קטן, הבית היה מרכז המפגשים. אנשים הגיעו לקפה, לשיחה, לשמן זית, לחיבוק, לארוחה חמה או לחגוג יחד. תמיד היה מקום לעוד אחד.
              </p>
            </div>

            {/* Chapter 3: When the House Emptied & Shorashim Was Born */}
            <div className="pt-8 border-t border-[#DED5C8]">
              <div className="flex items-center gap-3 text-xs tracking-widest uppercase font-mono text-[#7B6045] mb-3">
                <span>1882 · המשך הדרך</span>
              </div>
              <p className="mb-4">
                אחרי שאמא ואבא כבר לא היו, השכרנו את הבית כדי שלא יעמוד ריק. הריק כאב לנו יותר מהמלא.
                אבל אז הבנו שגם לנו כבר אין מקום לחזור אליו כשאנחנו מגיעים לזכרון. וכך נולד הרעיון ליצור בחצר מקום קטן שיהיה גם שלנו.
              </p>
              <p>
                מקום שנוכל להתארח בו בעצמנו כשאנחנו רוצים לנשום את זכרון, ומקום שנוכל לארח בו אנשים אחרים — כאלה שמחפשים שקט אמיתי, יופי, היסטוריה ואווירה ביתית של פעם, בלי לוותר על הנוחות של היום.
              </p>
            </div>

          </div>

          {/* Authentic Archival Photography & Founders' Words — Discovered Here */}
          <div className="lg:col-span-5 space-y-12">
            
            {/* Authentic Family Archival Photograph */}
            <div className="bg-[#DED5C8]/40 p-6 sm:p-8 border border-[#DED5C8]">
              <div className="aspect-[4/3] overflow-hidden bg-[#292824] mb-4">
                <Picture
                  image={IMAGES.heritage}
                  alt="תצלום היסטורי של משפחת פויזנר בזכרון יעקב"
                  className="w-full h-full object-cover sepia-[0.35] brightness-[0.95]"
                  sizes="(min-width: 1024px) 40vw, 100vw"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#7B6045] mb-2">
                <span>ארכיון משפחת פויזנר</span>
                <span>משק פויזנר · זכרון יעקב</span>
              </div>
              <p className="text-xs text-[#292824]/70 font-light leading-relaxed">
                המשק המשפחתי לאורך השנים. השורשים שניטעו כאן ב-1882 ממשיכים לחיות בכל אבן, עץ ופינה.
              </p>
            </div>

            {/* The Founders' Quote */}
            <div className="p-8 sm:p-10 bg-[#1E1D1A] text-[#F4F0E8] relative">
              <EditorialTag light className="mb-4 block text-[#DED5C8]/70">
                למה שורשים?
              </EditorialTag>
              
              <blockquote className="font-serif text-lg sm:text-xl text-[#F4F0E8] leading-relaxed mb-6 font-light italic">
                ״חמישה דורות בזכרון יעקב. אדמה שעברה במשפחה. עצי פיקוס שסבא נטע. בית שאנחנו זוכרים.
                הורים שאנחנו מתגעגעים אליהם. וילדים שאנחנו רוצים שיידעו מאיפה הם באו.
                כנראה שלא יכולנו לקרוא לו אחרת. שורשים.״
              </blockquote>

              <div className="text-xs tracking-widest uppercase font-mono text-[#DED5C8]/80">
                שרי ויואב פויזנר
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
