import { IMAGES } from '../data/shorashimData';
import GallerySection from './GallerySection';
import type { GalleryItem } from '../types';

const details: GalleryItem[] = [
  { id: 'concept-sink', image: IMAGES.trough_sink, title: 'משוקת של פעם לכיור של היום', description: 'כיור אבן בצורת שוקת מתחת לחלון', category: 'details', categoryLabel: 'הפרטים' },
  { id: 'concept-shutters', image: IMAGES.old_new_shutters, title: 'התריסים של פעם, הנוחות של היום', description: 'תריסים ירוקים ישנים לצד חלונות זכוכית חדשים בחזית שורשים', category: 'details', categoryLabel: 'הפרטים' },
  { id: 'concept-family', image: IMAGES.kitchen_wall, title: 'תמונות המשפחה, בלב הבית של היום', description: 'המטבח בשורשים עם אי ישיבה וקיר תמונות משפחתיות', category: 'details', categoryLabel: 'הפרטים' },
];

export default function ConceptSection() {
  return <section id="concept" tabIndex={-1} aria-labelledby="concept-heading" className="mt-8 sm:mt-11 border-t border-[#DED5C8] pt-7 sm:pt-9">
    <div className="max-w-3xl"><p className="mb-3 text-sm text-[#665548] tracking-wide">ישן. חדש. וכל מה שביניהם.</p><h3 id="concept-heading" className="font-serif text-3xl sm:text-5xl font-normal mb-5">החומר זוכר. הבית ממשיך לחיות.</h3><p className="leading-relaxed">קירות האבן, התריסים ותמונות המשפחה נשארו חלק מהבית. לצדם — מטבח מלא, חדר שינה נעים ופינות ישיבה מוארות. מקום שהעבר שלו מורגש, והנוחות שלו שייכת להיום.</p></div>
    <GallerySection items={details} embedded />
  </section>;
}
