import Picture from './Picture';
import { IMAGES } from '../data/shorashimData';
import { navigateTo } from './navigate';
export default function StayPaths({ onSelectCouple }: { onSelectCouple: () => void }) {
  return <section id="stay-paths" tabIndex={-1} className="stay-paths">
    <div className="max-w-7xl mx-auto px-6 sm:px-10">
      <p className="section-eyebrow">שתי דרכים להגיע. בית אחד להרגיש בו בבית.</p>
      <h2 className="font-serif text-3xl sm:text-5xl mb-7">איך תרצו להתארח?</h2>
      <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
        <article className="stay-path">
          <Picture image={IMAGES.living_room} alt="הסלון בשורשים עם ספה ירוקה, שולחן עץ ואור חם" className="w-full aspect-[16/9] object-cover" />
          <div className="p-5 sm:p-7"><h3 className="font-serif text-2xl sm:text-3xl mb-2">חופשה זוגית</h3><p>חופשה זוגית בלב המושבה בזכרון יעקב. מקום להאט, ליהנות מזמן יחד ולצאת לגלות את הטעמים והאווירה של המושבה.</p><p className="mt-3">לילה או יותר בסוויטה פרטית, עם מטבח מלא וחצר. לזוג ולעד 3 מבוגרים.</p><p className="stay-meta">כניסה 15:00 · יציאה 11:00</p><button type="button" className="primary-action mt-4" onClick={onSelectCouple}>בקשת תאריכים לחופשה</button></div>
        </article>
        <article className="stay-path">
          <Picture image={IMAGES.bride_dress} alt="שמלת כלה תלויה בחדר השינה בשורשים" className="w-full aspect-[16/9] object-cover" />
          <div className="p-5 sm:p-7"><h3 className="font-serif text-2xl sm:text-3xl mb-2">כלה בשורשים</h3><p>שלושה מסלולים לבחירה: התארגנות בלבד, לילה לפני עם התארגנות או לילה אחרי החתונה.</p><p className="stay-meta">עד 5 משתתפים בהתארגנות, כולל הכלה ואנשי המקצוע</p><a href="#bride" className="secondary-action mt-4" onClick={event => { event.preventDefault(); navigateTo('bride'); }}>השוואת מסלולי כלה</a></div>
        </article>
      </div>
    </div>
  </section>;
}
