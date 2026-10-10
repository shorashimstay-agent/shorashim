import { BRAND_DATA } from '../data/shorashimData';
export default function AtAGlance({ onSelectCouple }: { onSelectCouple: () => void }) {
  return <section id="overview" tabIndex={-1} className="overview-section"><div className="max-w-7xl mx-auto px-6 sm:px-10 py-7 sm:py-10">
    <h2 className="font-serif text-2xl mb-5">שורשים במבט אחד</h2>
    <ul className="overview-facts">
      <li><strong>סוויטה פרטית</strong><span>כ־80 מ״ר, חדר שינה נפרד, סלון, מטבח מאובזר וחדר רחצה מפנק</span></li>
      <li><strong>בלב המושבה</strong><span>בקרבת המדרחוב, המסעדות, בתי הקפה והפאבים</span></li>
      <li><strong>חצר ומרפסת גג</strong><span>אווירה פסטורלית, סיפור של פעם והרבה שלווה</span></li>
      <li><strong>חניה בתוך המשק</strong><span>חניה פרטית לאורחים</span></li>
    </ul>
    <p className="text-sm leading-relaxed mt-5">אירוח למבוגרים בלבד, לעד שלושה אורחי לינה. הסוויטה במפלס הקרקע; העלייה לגג במדרגות.</p>
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5"><p className="text-sm">לשאלות על הגישה לסוויטה ולגג, נשמח לעזור לפני ההזמנה.</p><a className="text-action" href={`tel:${BRAND_DATA.phone}`}>שיחה עם המארחים</a></div>
  </div></section>;
}
