import Picture from './Picture';
import { IMAGES } from '../data/shorashimData';
export default function ConceptSection() {
  return <section id="concept" tabIndex={-1} className="py-12 sm:py-20 bg-[#F4F0E8]">
    <div className="max-w-7xl mx-auto px-6 sm:px-10 grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
      <div><p className="section-eyebrow">החומר זוכר. הבית ממשיך לחיות.</p><h2 className="font-serif text-3xl sm:text-5xl mb-5">ישן. חדש.<br />וכל מה שביניהם.</h2><p className="max-w-lg leading-relaxed">קירות האבן, התריסים ותמונות המשפחה נשארו חלק מהבית. לצדם — מטבח מלא, חדר שינה נעים וחללי ישיבה מוארים. מקום שהעבר שלו מורגש, והנוחות שלו שייכת להיום.</p></div>
      <div className="photo-pair detail-photos"><figure><Picture image={IMAGES.trough_sink} alt="כיור אבן בצורת שוקת מתחת לחלון" className="w-full h-auto object-contain" /><figcaption className="mt-2 text-sm">משוקת של פעם לכיור של היום</figcaption></figure><figure><Picture image={IMAGES.old_new_shutters} alt="תריסים ירוקים ישנים לצד חלונות זכוכית חדשים בחזית שורשים" className="w-full h-auto object-contain" /><figcaption className="mt-2 text-sm">התריסים של פעם, הנוחות של היום</figcaption></figure></div>
    </div>
  </section>;
}
