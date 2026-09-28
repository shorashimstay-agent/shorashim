import { IMAGES } from '../data/shorashimData';
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
        
        Typography role 02: EDITORIAL DISPLAY.
        Contemporary, refined, clean architectural presence (not heavy traditional/religious serif).
        Communicates "NEW", while the house, stone & photography communicate "OLD".
      */}
      <section className="py-28 sm:py-44 max-w-7xl mx-auto px-6 sm:px-10 lg:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-end">
          
          {/* Asymmetric Typography Statement */}
          <div className="lg:col-span-8 space-y-8 sm:space-y-12">
            
            {/* Major Contemporary Editorial Statement */}
            <div className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-light text-[#1E1D1A] leading-[1.08] tracking-tight">
              <div>ישן. חדש.</div>
              <div className="text-[#7B6045] font-light mt-2">וכל מה שביניהם.</div>
            </div>

            {/* Generous pause and subtle supporting statement */}
            <div className="pt-4 max-w-xl">
              <p className="text-2xl sm:text-3xl md:text-4xl text-[#27241F]/85 font-light leading-relaxed">
                העבר לא נשאר מאחור.
                <br />
                <span className="text-[#7B6045]">הוא פשוט קיבל מקום חדש.</span>
              </p>
            </div>

          </div>

          {/* ONE Intimate Detail Photograph (Detail of stone, bathroom, water, texture) */}
          <div className="lg:col-span-4 lg:pb-3">
            <div className="max-w-[280px] sm:max-w-[320px] mr-auto lg:mr-0 lg:ml-auto">
              <div className="aspect-[3/4] overflow-hidden bg-[#E8E2D7] shadow-[0_8px_30px_rgba(30,29,26,0.06)]">
                <Picture
                  image={IMAGES.bathroom}
                  alt="פרט אינטימי בבית שורשים — אבן עתיקה, מים ואור רך"
                  className="w-full h-full object-cover brightness-[0.98] contrast-[1.02]"
                  sizes="(min-width: 1024px) 45vw, 100vw"
                />
              </div>
              <div className="mt-3 text-[11px] font-sans text-[#7B6045] tracking-wider text-right">
                פרט מתוך הבית · אבן, מים ואור
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 
        SECTION 02 — OLD × NEW:
        Asymmetric editorial image composition exploring the contrast:
        old stone / contemporary design
        heritage / new life
        antiques / clean modern elements
        historic architecture / contemporary hospitality
      */}
      <section className="py-24 sm:py-36 border-t border-[#E5DFD3]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* Left: Text & Editorial Tone */}
            <div className="lg:col-span-5 space-y-6">
              <span className="font-sans text-xs tracking-[0.25em] uppercase text-[#7B6045] font-normal block">
                02 · המפגש
              </span>

              <h2 className="text-3xl sm:text-4xl md:text-5xl text-[#1E1D1A] font-light leading-[1.15] tracking-tight">
                החומר זוכר,
                <br />
                <span className="text-[#7B6045]">העיצוב נושם.</span>
              </h2>

              <p className="text-lg sm:text-xl text-[#27241F]/80 font-light leading-relaxed max-w-md">
                קירות האבן המקורית ועצי הפיקוס חיים כאן בהרמוניה טבעית עם קווים נקיים, מצעי פשתן, מטבח שקט, רהיטים עכשוויים ואוויר הרים צלול.
              </p>

              <div className="pt-4 text-base text-[#7B6045] font-light">
                ״שום דבר לא הונח כאן כדי להיראות עתיק — הכל פשוט שייך לכאן.״
              </div>
            </div>

            {/* Right: Asymmetric Photographic Juxtaposition */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 items-start">
              
              {/* Photo 1: Historic Architecture & Natural Tree Canopy */}
              <div className="space-y-3">
                <div className="aspect-[4/5] overflow-hidden bg-[#E8E2D7] shadow-[0_6px_25px_rgba(30,29,26,0.05)]">
                  <Picture
                    image={IMAGES.rooftop}
                    alt="מרפסת הגג והעצים — חומרים טבעיים, אבן ואוויר הרים"
                    className="w-full h-full object-cover brightness-[0.98] contrast-[1.02]"
                    sizes="(min-width: 1024px) 45vw, 100vw"
                  />
                </div>
                <div className="text-[11px] font-sans text-[#7B6045] tracking-wider">
                  אבן עתיקה, מרפסת גג וצמרות העצים
                </div>
              </div>

              {/* Photo 2: Contemporary Linen & Clean Modern Comfort (offset downwards) */}
              <div className="space-y-3 sm:pt-16">
                <div className="aspect-[4/5] overflow-hidden bg-[#E8E2D7] shadow-[0_6px_25px_rgba(30,29,26,0.05)]">
                  <Picture
                    image={IMAGES.bedroom}
                    alt="חדר השינה בבית שורשים — מצעים טבעיים, שקט ועיצוב עכשווי"
                    className="w-full h-full object-cover brightness-[0.98] contrast-[1.02]"
                    sizes="(min-width: 1024px) 45vw, 100vw"
                  />
                </div>
                <div className="text-[11px] font-sans text-[#7B6045] tracking-wider">
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
        Shorashim is ultimately a place for adults and couples.
        
        בוקר שמתחיל לאט.
        קפה טוב.
        מצעים לבנים.
        זכרון יעקב מעבר לדלת.
        
        וערב שלא צריך למהר ממנו לשום מקום.
      */}
      <section className="py-28 sm:py-44 border-t border-[#E5DFD3]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            
            {/* Atmospheric Photography: Morning light, kitchen table, linen */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="aspect-[4/3] sm:aspect-[16/11] overflow-hidden bg-[#E8E2D7] shadow-[0_8px_32px_rgba(30,29,26,0.06)]">
                <Picture
                  image={IMAGES.interior}
                  alt="בוקר שמתחיל לאט בשורשים — אור טבעי, שקט ומטבח אינטימי"
                  className="w-full h-full object-cover brightness-[0.98] contrast-[1.01]"
                  sizes="(min-width: 1024px) 45vw, 100vw"
                />
              </div>
              <div className="mt-3 flex justify-between items-center text-[11px] font-sans text-[#7B6045] tracking-wider">
                <span>פינת קפה ואור בוקר בחלל המרכזי</span>
                <span>זכרון יעקב</span>
              </div>
            </div>

            {/* Poetic & Sensual Atmosphere Text */}
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-8 max-w-xl">
              
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#1E1D1A] font-light leading-[1.15] tracking-tight">
                בוקר שמתחיל לאט.
              </div>

              <div className="space-y-4 text-xl sm:text-2xl text-[#27241F]/85 font-light leading-relaxed">
                <p>
                  קפה טוב.
                </p>
                <p>
                  מצעים לבנים.
                </p>
                <p>
                  זכרון יעקב מעבר לדלת.
                </p>
              </div>

              <div className="pt-6 border-t border-[#DED5C8] text-xl sm:text-2xl md:text-3xl text-[#7B6045] font-light leading-snug">
                וערב שלא צריך למהר ממנו לשום מקום.
              </div>

            </div>

          </div>

        </div>
      </section>

    </div>
  );
}
