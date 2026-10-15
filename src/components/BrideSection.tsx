import Picture from './Picture';
import { IMAGES } from '../data/shorashimData';
export default function BrideSection(_props: { onSelectPackage?: (id: string) => void }) {
  return <section id="bride" tabIndex={-1} className="py-12 sm:py-20 bg-[#EAE4D9]">
    <div className="max-w-7xl mx-auto px-6 sm:px-10">
      <div className="max-w-3xl mb-7">
        <div><p className="section-eyebrow">כלה בשורשים</p><h2 className="font-serif text-3xl sm:text-5xl mb-4">מקום יפה להתחיל בו יום יפה</h2><p className="leading-relaxed">סוויטה מוארת עם חדר שינה, מטבח וחצר לצילום. עד 5 משתתפים בהתארגנות, כולל הכלה, המלוות ואנשי המקצוע.</p></div>
      </div>
      <div className="photo-pair bridal-photos mb-8">
        <figure><Picture image={IMAGES.bride_dress} alt="שמלת כלה תלויה בחדר השינה בשורשים" sizes="(max-width: 639px) 100vw, 50vw" className="w-full h-auto object-contain" /><figcaption className="mt-3"><h3 className="font-serif text-2xl">החדר, האור וההתרגשות</h3><p className="text-sm mt-1">חדר השינה כחלק ממרחב ההתארגנות</p></figcaption></figure>
        <figure><Picture image={IMAGES.bridal_kitchen} alt="המטבח בשורשים: אי רחב, כיסאות בר וקיר תמונות משפחתיות" sizes="(max-width: 639px) 100vw, 50vw" className="w-full h-auto object-contain" /><figcaption className="mt-3"><h3 className="font-serif text-2xl">קפה קטן, רגעים גדולים</h3><p className="text-sm mt-1">המטבח והאי המרכזי — חלק ממרחב ההתארגנות בסוויטה</p></figcaption></figure>
      </div>
    </div>
  </section>;
}
