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
// Follows the booking terms (src/legal/content.ts, /terms/), which bind every booking.
export const CANCELLATION_POLICY = 'השליחה היא בקשה ולא הזמנה מחייבת: התאריכים נשמרים עבורכם 24 שעות, וההזמנה מאושרת רק באישור מפורש שלנו בטלפון, ב־WhatsApp או בדוא״ל. המחיר הסופי, אופן התשלום ומועדו יסוכמו לפני האישור; האתר אינו גובה תשלום. ביטול עד 7 ימים לפני יום ההגעה: ללא עלות. ביטול מאוחר יותר ועד 48 שעות לפני ההגעה: 50% ממחיר ההזמנה, ובפחות מ־48 שעות או אי־הגעה: המחיר המלא. שינוי מועד אחד ללא עלות עד 7 ימים לפני ההגעה, לתאריך פנוי בתוך 6 חודשים. אם הנחיות פיקוד העורף אוסרות הגעה, אפשר לבטל ללא דמי ביטול או להעביר מועד. זכות הביטול לפי חוק הגנת הצרכן ושאר הפרטים מופיעים בתנאי ההזמנה.';
