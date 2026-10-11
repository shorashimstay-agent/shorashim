import Picture from './Picture';
import { IMAGES } from '../data/shorashimData';
export default function ConceptSection() {
  return <section id="concept" tabIndex={-1} aria-labelledby="concept-heading" className="mt-8 sm:mt-11 border-t border-[#DED5C8] pt-7 sm:pt-9">
      <div className="max-w-3xl"><p className="mb-3 text-sm text-[#665548] tracking-wide">ישן. חדש. וכל מה שביניהם.</p><h3 id="concept-heading" className="font-serif text-3xl sm:text-5xl font-normal mb-5">החומר זוכר. הבית ממשיך לחיות.</h3><p className="leading-relaxed">קירות האבן, התריסים ותמונות המשפחה נשארו חלק מהבית. לצדם — מטבח מלא, חדר שינה נעים וחללי ישיבה מוארים. מקום שהעבר שלו מורגש, והנוחות שלו שייכת להיום.</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-[0.667fr_1.499fr] gap-7 mt-7 items-start"><figure className="w-[82%] mx-auto sm:w-full"><Picture image={IMAGES.trough_sink} alt="כיור אבן בצורת שוקת מתחת לחלון" sizes="(max-width: 639px) 82vw, 30vw" className="w-full h-auto object-contain" /><figcaption className="mt-2 text-sm text-[#665548]">משוקת של פעם לכיור של היום</figcaption></figure><figure><Picture image={IMAGES.old_new_shutters} alt="תריסים ירוקים ישנים לצד חלונות זכוכית חדשים בחזית שורשים" sizes="(max-width: 639px) 100vw, 65vw" className="w-full h-auto object-contain" /><figcaption className="mt-2 text-sm text-[#665548]">התריסים של פעם, הנוחות של היום</figcaption></figure></div>
  </section>;
}
