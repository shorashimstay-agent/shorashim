import Picture from './Picture';
import PolicyDetails from './PolicyDetails';
import PriceStatus from './PriceStatus';
import { STAY_PACKAGES, PRICE_NOTE, type StayType } from '../data/booking';
import { usePrices } from '../lib/stay';
import { BRIDE_PACKAGES, IMAGES } from '../data/shorashimData';
/** A package's fixed price; null without prices. */
const packagePrice = (type: StayType, prices: Record<string, number> | null) => (type === 'couple' || !prices ? null : prices[type] ?? null);
const routeLabels: Record<string, string> = { bride_day: 'יום התארגנות בלבד', bride_night_day: 'לילה לפני + התארגנות', wedding_night: 'לילה זוגי אחרי החתונה' };
const schedules: Record<string, { arrival: string; departure: string; sleep: string }> = {
  bride_day: { arrival: '08:00 ביום ההתארגנות', departure: '15:30 באותו יום', sleep: 'ללא לינה' },
  bride_night_day: { arrival: '15:00 ביום שלפני האירוע', departure: '15:30 ביום האירוע', sleep: 'לילה לפני · עד 3 מבוגרים' },
  wedding_night: { arrival: 'לאחר האירוע, בתיאום אישי', departure: '13:00 ביום שאחרי', sleep: 'לילה זוגי לאחר החתונה' },
};
export default function BrideSection({ onSelectPackage }: { onSelectPackage?: (id: string) => void }) {
  const prices = usePrices();
  return <section id="bride" tabIndex={-1} className="py-12 sm:py-20 bg-[#EAE4D9]">
    <div className="max-w-7xl mx-auto px-6 sm:px-10">
      <div className="max-w-3xl mb-7">
        <div><p className="section-eyebrow">כלה בשורשים</p><h2 className="font-serif text-3xl sm:text-5xl mb-4">מקום יפה להתחיל בו יום יפה</h2><p className="leading-relaxed">סוויטה מוארת עם חדר שינה, מטבח וחצר לצילום. עד 5 משתתפים בהתארגנות, כולל הכלה, המלוות ואנשי המקצוע.</p></div>
      </div>
      <div className="photo-pair bridal-photos mb-8">
        <figure><Picture image={IMAGES.bride_dress} alt="שמלת כלה תלויה בחדר השינה בשורשים" sizes="(max-width: 639px) 100vw, 50vw" className="w-full h-auto object-contain" /><figcaption className="mt-3"><h3 className="font-serif text-2xl">החדר, האור וההתרגשות</h3><p className="text-sm mt-1">חדר השינה כחלק ממרחב ההתארגנות</p></figcaption></figure>
        <figure><Picture image={IMAGES.bridal_kitchen} alt="חלל המטבח בשורשים: אי רחב, כיסאות בר וקיר תמונות משפחתיות" sizes="(max-width: 639px) 100vw, 50vw" className="w-full h-auto object-contain" /><figcaption className="mt-3"><h3 className="font-serif text-2xl">ישן, חדש וסביב אותו שולחן</h3><p className="text-sm mt-1">המטבח והאי המרכזי — חלק ממרחב ההתארגנות בסוויטה</p></figcaption></figure>
      </div>
      <h3 className="font-serif text-2xl sm:text-3xl mb-5">שלושה מסלולים, לפי היום שלך</h3>
      <PriceStatus />
      <div className="grid md:grid-cols-3 gap-5 items-stretch">
        {BRIDE_PACKAGES.map(base => {
          const id = base.id as StayType;
          const pkg = STAY_PACKAGES[id];
          const schedule = schedules[id];
          const price = packagePrice(id, prices);
          return <article key={id} className="bride-package">
            <div><p className="route-label">{routeLabels[id]}</p><h4 className="font-serif text-2xl mb-4">{pkg.title}</h4>
              <dl className="package-facts"><div><dt>הגעה</dt><dd>{schedule.arrival}</dd></div><div><dt>יציאה</dt><dd>{schedule.departure}</dd></div></dl>
              <div className="package-price"><span>מחיר המסלול</span><strong>{price === null ? 'מחיר בתיאום אישי' : price.toLocaleString('he-IL') + ' ₪'}</strong></div>
              <details className="mt-3"><summary>לינה, אורחים ומה כלול</summary><p className="mt-2">{schedule.sleep} · {pkg.capacity}</p><ul className="space-y-2 mt-2">{base.highlights.map(item => <li key={item}>✓ {item}</li>)}</ul></details>
            </div>
            <button type="button" className="primary-action w-full mt-5" onClick={() => onSelectPackage?.(id)}>בחירת המסלול הזה</button>
          </article>;
        })}
      </div>
      <p className="text-sm mt-5">{PRICE_NOTE}</p>
      <div className="mt-4"><PolicyDetails /></div>
    </div>
  </section>;
}
