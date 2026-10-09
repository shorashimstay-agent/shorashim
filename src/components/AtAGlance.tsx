import { BRAND_DATA } from '../data/shorashimData';
export default function AtAGlance({ onSelectCouple }: { onSelectCouple: () => void }) {
  return <section id="overview" tabIndex={-1} className="overview-section"><div className="max-w-7xl mx-auto px-6 sm:px-10 py-7 sm:py-10">
    <h2 className="font-serif text-2xl mb-5">שורשים במבט אחד</h2>
    <ul className="overview-facts"><li><strong>סוויטה</strong><span>כ־80 מ״ר, חדר שינה ומטבח מלא</span></li><li><strong>למבוגרים בלבד</strong><span>עד 3 אורחי לינה</span></li><li><strong>חניה בתוך המשק</strong><span>המייסדים 71, זכרון יעקב</span></li><li><strong>חצר ומרפסת גג</strong><span>הסוויטה במפלס הקרקע; לגג מדרגות</span></li></ul>
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5"><p className="text-sm">צריכים לברר התאמות גישה? נשמח לבדוק יחד לפני ההזמנה.</p><a className="text-action" href={`tel:${BRAND_DATA.phone}`}>שיחה עם המארחים</a></div>
  </div></section>;
}
