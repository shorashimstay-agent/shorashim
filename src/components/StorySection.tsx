import { Clock, Landmark } from 'lucide-react';
import { IMAGES } from '../data/shorashimData';
import { RootLine, EditorialTag } from './RootLine';
import Picture from './Picture';

export default function StorySection() {
  return (
    <section tabIndex={-1} id="story" className="py-12 sm:py-16 bg-[#F4F0E8] relative overflow-hidden" dir="rtl" lang="he">
      
      {/* Subtle architectural root motif */}
      <div className="absolute left-10 top-0 bottom-0 w-8 z-0 hidden lg:block opacity-30 pointer-events-none">
        <RootLine variant="vertical" color="#7B6045" className="h-full" />
      </div>

      <div className="max-w-7xl mx-auto px-7 sm:px-10 lg:px-12 relative z-10">
        
        {/* Section Header — Discovered deeper down the page */}
        <div className="w-full max-w-none md:max-w-3xl mb-6 sm:mb-8 text-right">
          <EditorialTag className="mb-3 sm:mb-4 block">
            הסיפור של שורשים
          </EditorialTag>
          
          <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl text-[#1E1D1A] font-normal tracking-tight mb-4 sm:mb-6 text-right">
            יש מקומות שמתחילים מתוכנית.
            <br />
            <span className="text-[#7B6045] font-light">שורשים התחיל מגעגוע.</span>
          </h2>
          
          <p className="text-base sm:text-xl text-[#292824]/75 font-light leading-relaxed text-right">
            הסיפור שלנו מתחיל הרבה לפני הבית. בשנת <bdi>1882</bdi> הגיעו המשפחות שמהן צמחה משפחת פויזנר
            לזמארין, שלימים נקראה זכרון יעקב.
          </p>
        </div>

        <figure className="story-photo mb-6"><Picture image={IMAGES.family_book} alt="ספר זכרון יעקב וטלפון חוגה ישן על שולחן עץ" className="w-full h-auto" sizes="(max-width: 639px) 100vw, 520px" /><figcaption className="mt-2 text-sm text-[#7B6045]">הסיפור המשפחתי נשאר בבית</figcaption></figure>
        <p className="mb-4">אנחנו שרי ויואב פויזנר. שורשים נולד מתוך רצון לחזור לבית המשפחתי בזכרון ולפתוח את הדלת גם לאורחים שמחפשים שקט.</p><details><summary>לסיפור המשפחתי המלא</summary>
        {/* The Authentic Story & Archival Discovery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-20 items-start mb-12 sm:mb-24">
          
          {/* Main Story Narrative */}
          <div className="lg:col-span-7 space-y-8 sm:space-y-12 text-[#292824]/85 text-base sm:text-lg leading-relaxed font-light text-right w-full max-w-none">
            
            {/* Chapter 1: Five Generations */}
            <div className="pt-2 border-t border-[#DED5C8]">
              <div className="flex items-center gap-3 text-xs tracking-widest uppercase font-mono text-[#7B6045] mb-3" dir="rtl">
                <Clock className="w-3.5 h-3.5" />
                <span>חמישה דורות של אדמה</span>
              </div>
              <p className="mb-3 sm:mb-4 text-right">
                אברהם פויזנר המשיך את המשק המשפחתי, בנה את ביתו במו ידיו ופיתח משק של כרמים ועצי פרי. בהמשך הצטרף אליו בנו יוסי, אבא שלנו, והמשיך את המסורת החקלאית.
              </p>
              <p className="text-right">
                אבא היה חקלאי בכל מהותו. איש אדמה, איש עבודה, עקשן ורגיש. ציוני ואיש משפחה. האדמה לא הייתה רק העבודה שלו — היא הייתה חלק מהזהות שלו. אנחנו, יואב ושרי, גדלנו בתוך המשק. הכרם, המטע, הקטיף והבציר היו חלק בלתי נפרד מנוף הילדות שלנו.
              </p>
            </div>

            {/* Chapter 2: The House of Tzipi and Yossi */}
            <div className="pt-6 sm:pt-8 border-t border-[#DED5C8]">
              <div className="flex items-center gap-3 text-xs tracking-widest uppercase font-mono text-[#7B6045] mb-3" dir="rtl">
                <Landmark className="w-3.5 h-3.5" />
                <span>הבית של ציפי ויוסי</span>
              </div>
              <p className="mb-2 text-right">
                ולצד האדמה של אבא הייתה אמא. ציפי.
              </p>
              <p className="font-serif italic text-base sm:text-xl text-[#7B6045] mb-3 sm:mb-4 text-right">
                סטייל. הכלה. הקשבה. חיוך. עיניים ירוקות וטובות. וקפה איכותי.
              </p>
              <p className="text-right">
                היא אהבה עתיקות, רהיטים עם סיפור, סחלבים ודברים יפים, וידעה לחבר אותם עם החדש באופן שהיה רק שלה. אבל יותר מהכול, ציפי ויוסי יצרו בית. עוד כשהתחיל מצריף קטן, הבית היה מרכז המפגשים. אנשים הגיעו לקפה, לשיחה, לשמן זית, לחיבוק, לארוחה חמה או לחגוג יחד. תמיד היה מקום לעוד אחד.
              </p>
            </div>

            {/* Chapter 3: When the House Emptied & Shorashim Was Born */}
            <div className="pt-6 sm:pt-8 border-t border-[#DED5C8]">
              <div className="flex items-center gap-3 text-xs tracking-widest uppercase font-mono text-[#7B6045] mb-3" dir="rtl">
                <span><bdi>1882</bdi> · המשך הדרך</span>
              </div>
              <p className="mb-3 sm:mb-4 text-right">
                אחרי שאמא ואבא כבר לא היו, השכרנו את הבית כדי שלא יעמוד ריק. הריק כאב לנו יותר מהמלא.
                אבל אז הבנו שגם לנו כבר אין מקום לחזור אליו כשאנחנו מגיעים לזכרון. וכך נולד הרעיון ליצור בחצר מקום קטן שיהיה גם שלנו.
              </p>
              <p className="text-right">
                מקום שנוכל להתארח בו בעצמנו כשאנחנו רוצים לנשום את זכרון, ומקום שנוכל לארח בו אנשים אחרים, כאלה שמחפשים שקט אמיתי, יופי, היסטוריה ואווירה ביתית של פעם, בלי לוותר על הנוחות של היום.
              </p>
            </div>

          </div>

          {/* Authentic Archival Photography & Founders' Words — Quiet Editorial Left Column */}
          <div className="lg:col-span-5 w-full max-w-none text-right" dir="rtl">
            
            {/* Authentic Family Archival Photograph — sitting directly on warm cream background */}
            <div className="w-full">
              <div className="p-1 sm:p-1.5 bg-[#F8F5EE] shadow-[0_4px_22px_rgba(40,30,20,0.06)] border border-[#E5DFD3]/80">
                <div className="aspect-[4/3] overflow-hidden bg-[#292824]">
                  <Picture
                    image={IMAGES.archive_plough}
                    alt="תצלום היסטורי מארכיון משפחת פויזנר: עבודה בשדה עם סוסים בזכרון יעקב"
                    className="w-full h-full object-cover sepia-[0.35] brightness-[0.95]"
                    sizes="(min-width: 1024px) 40vw, 100vw"
                  />
                </div>
              </div>

              {/* Archival Caption */}
              <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-[#7B6045]" dir="rtl">
                <span>ארכיון משפחת פויזנר</span>
                <span>משק פויזנר · זכרון יעקב</span>
              </div>
              <p className="mt-1 text-xs text-[#27241F]/70 font-light leading-relaxed text-right" dir="rtl">
                המשק המשפחתי לאורך השנים. השורשים שניטעו כאן ב־<bdi>1882</bdi> ממשיכים לחיות בכל אבן, עץ ופינה.
              </p>
            </div>

            {/* The Founders' Quote — Quiet Editorial Typography directly on cream */}
            <div className="pt-8 sm:pt-12 text-right w-full max-w-md mr-auto lg:mr-0" dir="rtl">
              <span className="text-xs font-mono uppercase tracking-widest text-[#7B6045] block mb-3 text-right">
                למה שורשים?
              </span>
              
              <blockquote className="font-serif text-lg sm:text-xl text-[#1E1D1A] leading-relaxed mb-3 sm:mb-4 font-light italic text-right" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                ״חמישה דורות בזכרון יעקב. אדמה שעברה במשפחה. עצי פיקוס שסבא נטע. בית שאנחנו זוכרים.
                הורים שאנחנו מתגעגעים אליהם. וילדים שאנחנו רוצים שיידעו מאיפה הם באו.
                כנראה שלא יכולנו לקרוא לו אחרת. שורשים.״
              </blockquote>

              <div className="text-xs tracking-wider text-[#7B6045] font-light text-right" dir="rtl">
                שרי ויואב פויזנר
              </div>
            </div>

          </div>

        </div></details>

      </div>
    </section>
  );
}



