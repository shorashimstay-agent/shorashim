import Picture from './Picture';
import { IMAGES } from '../data/shorashimData';
import BookingSection from './BookingSection';
import type { StayType } from '../data/booking';

export default function BridalPage({ stayType, onStayTypeChange }: { stayType: StayType; onStayTypeChange: (type: StayType) => void }) {
  return <>
    <section id="bride" className="bridal-page-hero">
      <div className="bridal-hero-copy"><a className="bridal-back" href="/">שורשים · חזרה לחופשה בשורשים ←</a><p className="section-eyebrow">כלה בשורשים · זכרון יעקב</p><h1 className="font-serif">לפני שהכול מתחיל,<br /><em>רגע שהוא שלך.</em></h1><p className="bridal-lead">בוקר החתונה שלך, בבית עם אור, אופי ומקום לאנשים הקרובים אלייך.</p><p>בין קירות עם סיפור, חצר ירוקה ופינות שמצטלמות יפה, שורשים מזמין אותך להתחיל את היום בקצב שלך. להתארגן, להתרגש, לשתות קפה ולהיות יחד, לפני שיוצאים לחגוג.</p></div>
      <div className="bridal-hero-photo"><Picture image={IMAGES.bride_dress} alt="שמלת כלה תלויה בחדר השינה המואר בשורשים" className="w-full h-full object-cover" priority sizes="(max-width: 767px) 100vw, 50vw" /></div>
    </section>

    <section className="bridal-editorial-section"><div className="bridal-editorial-heading"><p className="section-eyebrow">להתחיל בנחת</p><h2 className="font-serif">לא עוד תחנה בדרך לחתונה.<br />מקום להיות בו.</h2><p>ביום מלא התרגשות, נעים לדעת איפה מתחיל הבוקר. הבית, המטבח והחצר מאפשרים לך ולאנשים שאיתך להתכנס במקום אחד, להתכונן וליהנות גם מהרגעים שבין ההכנות.</p></div><div className="bridal-benefits"><article><span>01</span><h3>אור ורקע לצילומים</h3><p>חדר השינה, קירות האבן, תמונות המשפחה והחצר מוסיפים אופי לתמונות של היום שלך.</p></article><article><span>02</span><h3>האנשים שלך, איתך</h3><p>מקום להתארגנות של עד 5 משתתפים בסך הכול, כולל אותך, המלוות ואנשי המקצוע.</p></article><article><span>03</span><h3>בית בתוך המושבה</h3><p>בלב זכרון יעקב, עם מטבח מאובזר, חצר ומרפסת גג, בתוך המשק המשפחתי.</p></article></div></section>

    <section className="bridal-photo-story"><figure><Picture image={IMAGES.bridal_kitchen} alt="אי המטבח ופינות הישיבה בשורשים לקפה ולהתכנסות בזמן ההתארגנות" className="w-full h-auto" sizes="(max-width: 767px) 100vw, 55vw" /><figcaption>קפה קטן. נשימה עמוקה. האנשים שלך.</figcaption></figure><div><p className="section-eyebrow">היופי נמצא גם בין הרגעים</p><h2 className="font-serif">להרגיש בבית,<br />גם ביום הכי מיוחד.</h2><p>יש את רגע לבישת השמלה, ויש את כל מה שסביבו. שיחה ליד האי במטבח, מבט במראה, תמונה בחצר וחיבוק לפני היציאה. הבית של שורשים נותן מקום גם לרגעים האלה.</p><p>במסלול יום ההתארגנות כלולה ארוחת בוקר לעד 5 אנשים.</p></div></section>

    <section className="bridal-route-intro"><p className="section-eyebrow">לפי היום שאת מתכננת</p><h2 className="font-serif">איך תרצי להתחיל את היום שלך?</h2><p>יום התארגנות בלבד, או לילה לפני כדי להתעורר כאן בבוקר החתונה. בחרי מסלול ותאריך, והשאירי פרטים לתיאום אישי.</p></section>
    <BookingSection stayType={stayType === 'couple' ? 'bride_day' : stayType} onStayTypeChange={onStayTypeChange} />

    <section className="bridal-editorial-section bridal-practical"><h2 className="font-serif">כמה דברים שכדאי לדעת מראש</h2><div>
      <details><summary>כמה אנשים יכולים להיות איתי?</summary><p>עד 5 משתתפים בסך הכול בזמן ההתארגנות, כולל הכלה, המלוות ואנשי המקצוע. במסלול עם לילה לפני אפשר לארח עד 3 מבוגרים ללינה.</p></details>
      <details><summary>מתי מגיעים ומתי יוצאים?</summary><p>יום התארגנות בלבד: 08:00–15:30. במסלול לילה לפני ויום התארגנות: כניסה ב־15:00 ביום שלפני ויציאה ב־15:30 ביום האירוע.</p></details>
      <details><summary>אפשר גם לחזור אחרי החתונה?</summary><p>לשילוב יום התארגנות עם חזרה ללינה אחרי החתונה, פנו למארחים לבירור אישי. האפשרות אינה זמינה להזמנה דרך האתר.</p></details>
      <details><summary>מה לגבי גישה וחניה?</summary><p>הסוויטה במפלס הקרקע והעלייה לגג במדרגות. יש חניה פרטית בתוך המשק. לבירור התאמות גישה ולתיאום ההגעה, פנו למארחים לפני ההזמנה.</p></details>
      <details><summary>שליחת הפרטים מאשרת את ההזמנה?</summary><p>לא. זו בקשה לבירור. המחיר הסופי, הזמינות ופרטי האירוח יאושרו אישית מול המארחים.</p></details>
    </div></section>
  </>;
}
