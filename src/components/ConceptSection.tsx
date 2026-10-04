import { IMAGES } from '../data/shorashimData';
import { EditorialTag } from './RootLine';
import Picture from './Picture';

export default function ConceptSection() {
  return (
    <div id="concept" className="bg-[#F4F0E8] text-[#1E1D1A]">
      
      {/* 
        SECTION 01 AFTER HERO:
        Strong visual transition from dark cinematic hero into warm ivory / parchment background.
        Lots of negative space.
        
        Main headline:
        ישן. חדש.
        וכל מה שביניהם.
      */}
      <section className="py-12 sm:py-24 lg:py-44 max-w-7xl mx-auto px-7 sm:px-10 lg:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-12 lg:gap-20 items-end">
          
          {/* Asymmetric Typography Statement */}
          <div className="lg:col-span-8 space-y-5 sm:space-y-8 lg:space-y-12" dir="rtl" lang="he">
            
            {/* Major Contemporary Editorial Statement */}
            <div
              dir="rtl"
              lang="he"
              className="text-4xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-light text-[#1E1D1A] leading-[1.08] tracking-tight text-right"
              style={{ direction: 'rtl', textAlign: 'right' }}
            >
              <div dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>ישן. חדש.</div>
              <div dir="rtl" className="text-[#7B6045] font-light mt-1.5 sm:mt-2" style={{ direction: 'rtl', textAlign: 'right' }}>וכל מה שביניהם.</div>
            </div>

            {/* Generous pause and subtle supporting statement */}
            <div
              dir="rtl"
              lang="he"
              className="pt-1 sm:pt-4 w-full max-w-none md:max-w-xl text-right"
              style={{ direction: 'rtl', textAlign: 'right' }}
            >
              <p
                dir="rtl"
                lang="he"
                className="text-xl sm:text-3xl md:text-4xl text-[#27241F]/85 font-light leading-relaxed text-right"
                style={{ direction: 'rtl', textAlign: 'right' }}
              >
                העבר לא נשאר מאחור.
                <br />
                <span className="text-[#7B6045]">הוא פשוט מקבל מקום חדש.</span>
              </p>
            </div>

          </div>

          {/* ONE Intimate Detail Photograph (Detail of stone, bathroom, water, texture) */}
          <div className="lg:col-span-4 lg:pb-3">
            <div className="w-full max-w-[280px] sm:max-w-[320px] mr-0 ml-auto lg:mr-0 lg:ml-auto">
              <div className="aspect-[3/4] overflow-hidden bg-[#E8E2D7] shadow-[0_8px_30px_rgba(30,29,26,0.06)]">
                <Picture
                  image={IMAGES.bathroom}
                  alt="פרט אינטימי בבית שורשים, אבן עתיקה, מים ואור רך"
                  className="w-full h-full object-cover brightness-[0.98] contrast-[1.02]"
                  sizes="(min-width: 1024px) 45vw, 100vw"
                />
              </div>
              <div className="mt-2.5 text-[11px] font-sans text-[#7B6045] tracking-wider text-right" dir="rtl">
                פרט מתוך הבית · אבן, מים ואור
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 
        SECTION 02 — OLD × NEW:
        Asymmetric editorial image composition exploring the contrast
      */}
      <section className="py-12 sm:py-24 lg:py-36 border-t border-[#E5DFD3]" dir="rtl" lang="he">
        <div className="max-w-7xl mx-auto px-7 sm:px-10 lg:px-14">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-12 lg:gap-16 items-start">
            
            {/* Left: Text & Editorial Tone */}
            <div className="lg:col-span-5 space-y-4 sm:space-y-6 text-right w-full max-w-none md:max-w-md" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
              <EditorialTag className="block">
                02 · המפגש
              </EditorialTag>

              <h2 className="text-3xl sm:text-4xl md:text-5xl text-[#1E1D1A] font-light leading-[1.15] tracking-tight text-right" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                החומר זוכר,
                <br />
                <span className="text-[#7B6045]">והעיצוב נושם.</span>
              </h2>

              <p className="text-base sm:text-lg lg:text-xl text-[#27241F]/80 font-light leading-relaxed w-full max-w-none md:max-w-md text-right" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                קירות האבן המקורית ועצי הפיקוס חיים כאן בהרמוניה טבעית עם קווים נקיים, מצעי פשתן, מטבח שקט, רהיטים עכשוויים ואוויר הרים צלול.
              </p>

              <div className="pt-2 sm:pt-4 text-base text-[#7B6045] font-light text-right" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                ״שום דבר לא הונח כאן כדי להיראות עתיק. הכל פשוט שייך לכאן.״
              </div>
            </div>

            {/* Right: Asymmetric Photographic Juxtaposition */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 items-start">
              
              {/* Photo 1: Historic Architecture & Natural Tree Canopy */}
              <div className="space-y-2.5">
                <div className="aspect-[4/5] overflow-hidden bg-[#E8E2D7] shadow-[0_6px_25px_rgba(30,29,26,0.05)]">
                  <Picture
                    image={IMAGES.rooftop}
                    alt="מרפסת הגג והעצים, חומרים טבעיים, אבן ואוויר הרים"
                    className="w-full h-full object-cover brightness-[0.98] contrast-[1.02]"
                    sizes="(min-width: 1024px) 45vw, 100vw"
                  />
                </div>
                <div className="text-[11px] font-sans text-[#7B6045] tracking-wider text-right" dir="rtl">
                  אבן עתיקה, מרפסת גג וצמרות העצים
                </div>
              </div>

              {/* Photo 2: Contemporary Linen & Clean Modern Comfort (offset downwards) */}
              <div className="space-y-2.5 sm:pt-16">
                <div className="aspect-[4/5] overflow-hidden bg-[#E8E2D7] shadow-[0_6px_25px_rgba(30,29,26,0.05)]">
                  <Picture
                    image={IMAGES.bedroom}
                    alt="חדר השינה בבית שורשים, מצעים טבעיים, שקט ועיצוב עכשווי"
                    className="w-full h-full object-cover brightness-[0.98] contrast-[1.02]"
                    sizes="(min-width: 1024px) 45vw, 100vw"
                  />
                </div>
                <div className="text-[11px] font-sans text-[#7B6045] tracking-wider text-right" dir="rtl">
                  שקט, פשתן לבן ונוחות עכשווית
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 
        SECTION 03 — THE COUPLE EXPERIENCE:
        A quiet romantic moment.
      */}
      <section className="py-12 sm:py-24 lg:py-44 border-t border-[#E5DFD3]" dir="rtl" lang="he">
        <div className="max-w-7xl mx-auto px-7 sm:px-10 lg:px-14">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-12 lg:gap-20 items-center">
            
            {/* Atmospheric Photography: Morning light, kitchen table, linen */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="aspect-[4/3] sm:aspect-[16/11] overflow-hidden bg-[#E8E2D7] shadow-[0_8px_32px_rgba(30,29,26,0.06)]">
                <Picture
                  image={IMAGES.interior}
                  alt="בוקר שמתחיל לאט בשורשים, אור טבעי, שקט ומטבח אינטימי"
                  className="w-full h-full object-cover brightness-[0.98] contrast-[1.01]"
                  sizes="(min-width: 1024px) 45vw, 100vw"
                />
              </div>
              <div className="mt-2.5 flex justify-between items-center text-[11px] font-sans text-[#7B6045] tracking-wider" dir="rtl">
                <span>פינת קפה ואור בוקר בחלל המרכזי</span>
                <span>זכרון יעקב</span>
              </div>
            </div>

            {/* Poetic & Sensual Atmosphere Text */}
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-4 sm:space-y-8 w-full max-w-none md:max-w-xl text-right" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
              
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#1E1D1A] font-light leading-[1.15] tracking-tight text-right" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                בוקר שמתחיל לאט.
              </div>

              <div className="space-y-2.5 sm:space-y-4 text-lg sm:text-2xl text-[#27241F]/85 font-light leading-relaxed text-right" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                  קפה טוב.
                </p>
                <p dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                  מצעים לבנים.
                </p>
                <p dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                  זכרון יעקב מעבר לדלת.
                </p>
              </div>

              <div className="pt-3 sm:pt-6 border-t border-[#DED5C8] text-xl sm:text-2xl md:text-3xl text-[#7B6045] font-light leading-snug text-right" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                וערב שלא צריך למהר ממנו לשום מקום.
              </div>

            </div>

          </div>

        </div>
      </section>

    </div>
  );
}
