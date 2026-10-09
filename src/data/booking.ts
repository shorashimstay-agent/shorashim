import type { Prices } from '../lib/prices';
export type StayType = 'couple' | 'bride_day' | 'bride_night_day' | 'wedding_night';
export interface StayPackage {
  id: StayType;
  title: string;
  description: string;
  hours: string;
  capacity: string;
}

// No prices here: they come from the owner's prices sheet at runtime (src/lib/prices.ts, LIVE_SITE.md).
export const STAY_PACKAGES: Record<StayType, StayPackage> = {
  couple: { id: 'couple', title: 'חופשה זוגית', description: 'סוויטה לחופשה שקטה', hours: 'כניסה 15:00 · יציאה 11:00', capacity: 'עד 3 מבוגרים ללינה' },
  bride_day: { id: 'bride_day', title: 'יום כלה — התארגנות', description: 'בוקר ההתארגנות ללא לינה', hours: '08:00–15:30 ביום ההתארגנות', capacity: 'עד 5 משתתפים כולל הכלה, מלוות ואנשי מקצוע' },
  bride_night_day: { id: 'bride_night_day', title: 'לילה לפני + יום כלה', description: 'לינה ערב קודם ובוקר ההתארגנות', hours: '15:00 ביום שלפני · יציאה 15:30 ביום האירוע', capacity: 'עד 3 ללינה · עד 5 משתתפים ביום כולל הכלה ואנשי מקצוע' },
  wedding_night: { id: 'wedding_night', title: 'ליל כלולות', description: 'לילה זוגי לאחר האירוע', hours: 'הגעה לאחר האירוע בתיאום · יציאה 13:00', capacity: 'לינה לזוג' },
};
const shekels = (n: number) => `${n.toLocaleString('he-IL')} ₪`;
/** The couple-stay price note, from the live prices. */
export const couplePriceNote = (p: Prices) =>
  `מחירי הרצה: ${shekels(p.perNight)} ללילה באמצע השבוע · ${shekels(p.weekendPerNight)} ללילות שישי ושבת · אורח שלישי בתוספת ${shekels(p.thirdGuestPerNight)} ללילה.`;
export const PRICE_NOTE = 'המחיר משוער; המחיר הסופי והזמינות יאושרו אישית לפי המועד והמסלול.';
export const CANCELLATION_POLICY = 'אין צורך במקדמה; התשלום בתחילת האירוח. ביטול לפחות 14 ימים לפני תחילת האירוח: ללא חיוב. ביטול כשנותרו לפחות 7 ימים ופחות מ־14 ימים: 50% ממחיר ההזמנה. ביטול פחות מ־7 ימים מראש או אי־הגעה: 100% ממחיר ההזמנה. המועדים נספרים לפי שעת תחילת האירוח שסוכמה, בשעון ישראל; בחבילה עם לילה לפני — מתחילת הלינה. שינוי מועד אחד ללא דמי שינוי בהודעה של לפחות 14 ימים, בכפוף לזמינות ולהפרש מחיר. אם התאריך הוזמן מחדש באותו מחיר, יוחזרו דמי הביטול שנגבו. אם המארחים מבטלים או איסור רשמי מונע את האירוח, יינתן החזר מלא או שינוי מועד לבחירת האורחים. זכויות ביטול והחזר לפי הדין, לרבות זכויות מיטיבות, גוברות על מדיניות זו. התאריך נשמר רק לאחר אישור מפורש של המארחים והאורחים ב־WhatsApp הכולל מסלול, תאריך, מחיר ותנאי ביטול. ללא מקדמה אין פירושו פטור מדמי ביטול.';
