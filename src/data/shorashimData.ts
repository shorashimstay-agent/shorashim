import { GENERATED_IMAGES } from './generatedImages';
import { Amenity, BridePackage, FaqItem, GalleryItem, LocalPlace } from '../types';
import { CANCELLATION_POLICY, STAY_PACKAGES } from './booking';

export const BRAND_DATA = {
  name: 'שורשים',
  subtitle: 'בית בוטיק לאירוח למבוגרים בלב זכרון יעקב',
  tagline: 'מקום להתחבר אליו',
  address: 'משק פויזנר, המייסדים 71, זכרון יעקב',
  locationDetails: 'כמה בתים מהמדרחוב, מבתי הקפה, המסעדות, הפאבים, הגלידריות ובית הכנסת',
  phone: '0515006613',
  phoneFormatted: '051-500-6613',
  whatsappNumber: '972515006613',
  instagram: 'https://instagram.com/shorashim.zichron',
  size: 'כ-80 מ״ר',
  capacity: 'אירוח בוטיק למבוגרים בלבד | לזוגות ועד 3 אורחים',
  checkIn: '15:00',
  checkOut: '11:00',
};

export const IMAGES = GENERATED_IMAGES;

export const AMENITIES: Amenity[] = [
  { id: '1', name: 'חדר שינה נפרד', category: 'comfort', icon: 'BedDouble', description: 'מיטה מרווחת, מזרן איכותי, מצעי כותנה טבעיים ומיזוג אוויר נפרד' },
  { id: '2', name: 'מטבח מלא ומאובזר', category: 'kitchen', icon: 'UtensilsCrossed', description: 'אי רחב לישיבה ואכילה, מקרר גדול, תנור, כיריים וכלי בישול' },
  { id: '3', name: 'מרפסת גג פרטית', category: 'outdoor', icon: 'Sun', description: 'פינת ישיבה אינטימית וערסל מול צמרות העצים והבריזה' },
  { id: '4', name: 'חצר ירוקה ופוטוגנית', category: 'outdoor', icon: 'Trees', description: 'מוקפת עצי פיקוס עתיקים, פינות ישיבה באווירה פסטורלית' },
  { id: '5', name: 'חדר רחצה מוקפד', category: 'comfort', icon: 'Bath', description: 'מקלחון מרווח עם ראש גשם, מגבות עבות, חלוקי רחצה ומוצרי טיפוח' },
  { id: '6', name: 'מכונת קפה איכותית', category: 'kitchen', icon: 'Coffee', description: 'פולי קפה מובחרים, חלב טרי ופינוקים חמים' },
  { id: '7', name: 'אינטרנט אלחוטי מהיר', category: 'general', icon: 'Wifi', description: 'חיבור Wi-Fi יציב וחופשי בכל חלל הצימר והחצר' },
  { id: '8', name: 'חניה פרטית צמודה', category: 'general', icon: 'Car', description: 'חניה שמורה לאורחים במתחם המשק השקט' },
  { id: '9', name: 'מסך טלוויזיה חכם', category: 'comfort', icon: 'Tv', description: 'מסך שטוח וחיבור לסטרימינג ברגעי מנוחה' },
  { id: '10', name: 'אירוח מבוגרים בלבד', category: 'general', icon: 'Sparkles', description: 'אווירת שלווה מוחלטת המותאמת לזוגות או עד 3 מבוגרים' },
  { id: '11', name: 'גישה לבית ולגג', category: 'general', icon: 'Accessibility', description: 'הבית במפלס הקרקע; הגג במדרגות. לבירור התאמות, מדרגות וספי כניסה פנו למארחים לפני ההזמנה.' },
  { id: '12', name: 'אורח שלישי אפשרי', category: 'comfort', icon: 'Sofa', description: 'ספה נפתחת ונוחה במיוחד בסלון הצימר' },
];

export const BRIDE_PACKAGES: BridePackage[] = [
  {
    id: 'bride_day',
    title: 'יום כלה - התארגנות בשורשים',
    subtitle: 'מרחב שליו, מעוצב ומואר המותאם במיוחד לשעות ההתארגנות שלפני החופה',
    description: STAY_PACKAGES.bride_day.hours + ' · ' + STAY_PACKAGES.bride_day.capacity,
    recommendedFor: 'כלות המעוניינות בבוקר חתונה נינוח, מואר ומלא סטייל לצילומים ולהתארגנות',
    highlights: [
      'חלל מרווח עם תאורה טבעית מושלמת לצילומי בוקר והתארגנות',
      'מראות גוף מלאות, שקעים נוחים ופינות ייעודיות לשיער ואיפור',
      'חצר ירוקה, קירות אבן ומרפסת גג לתמונות ראשונות בלתי נשכחות',
      'אווירה רגועה ואינטימית ללא הפרעות, בלב זכרון יעקב ההיסטורית',
      'חניה שמורה וצמודה לרכב הכלה ולרכבי המלווים',
    ],
  },
  {
    id: 'bride_night_day',
    title: 'חבילת כלה מלאה - לילה לפני + יום ההתארגנות',
    subtitle: 'להגיע ערב קודם, לישון טוב, ולהתעורר ברוגע מוחלט בבוקר החתונה',
    badge: 'החוויה השלמה',
    description: STAY_PACKAGES.bride_night_day.hours + ' · ' + STAY_PACKAGES.bride_night_day.capacity,
    recommendedFor: 'כלה שרוצה להסיר לחצים, לבלות לילה שקט עם מלווה ולהתחיל את הבוקר בלי נסיעות',
    highlights: [
      'כל היתרונות של חבילת יום הכלה',
      'לינה שקטה ומרגיעה במיטת קינג מרווחת עם מצעי כותנה מפנקים',
      'ערב אינטימי של שקט, שיחה ויין עם אמא, אחות או חברה קרובה',
      'התעוררות טבעית ללא פקקים וללא לחץ של נסיעות בבוקר החתונה',
      'מרפסת גג פרטית לקפה ראשון של בוקר מול נוף צמרות העצים',
    ],
  },
  {
    id: 'wedding_night',
    title: 'ליל כלולות - הנחיתה המושלמת',
    subtitle: 'לסיים את ערב החתונה במקום שקט, אינטימי ורומנטי במיוחד',
    description: 'כניסה לאחר האירוע | צ\'ק-אאוט מאוחר ב-13:00 למחרת. זוגי בלבד.',
    recommendedFor: 'זוגות טריים שרוצים לסיים את יום החתונה במרחב פרטי, שקט ואיכותי',
    highlights: [
      'נרות דולקים, אווירה חמה ורומנטית שממתינה לכם בלילה',
      'מקלחת מרווחת ומפנקת עם חלוקי רחצה רכים וסבונים טבעיים',
      'צ\'ק אאוט מאוחר ב-13:00 שמאפשר לישון עד מאוחר ולקום בנחת',
      'בוקר רגוע בחצר ההיסטורית של זכרון יעקב',
    ],
  },
];

export const GALLERY_ITEMS: GalleryItem[] = [
  { id: 'bedroom', title: 'חדר השינה', category: 'house', categoryLabel: 'הבית', image: IMAGES.bedroom_linen, description: 'מיטה זוגית, מצעים לבנים ואור טבעי' },
  { id: 'living', title: 'הסלון', category: 'house', categoryLabel: 'הבית', image: IMAGES.living_room, description: 'עיצוב שנבנה משכבות של זמן — ספה ירוקה, שולחן עץ, תמונות ואור חם' },
  { id: 'balcony', title: 'המבט מהמרפסת', category: 'courtyard', categoryLabel: 'החצר והגג', image: IMAGES.balcony_view, description: 'מאה ועשרים שנה, ממש מול המרפסת — בית האבן הישן בצל הפיקוס' },
  { id: 'kitchen', title: 'המטבח והאי', category: 'house', categoryLabel: 'הבית', image: IMAGES.kitchen_wall, description: 'אי הישיבה, כיסאות הבר וקיר האבן' },
  { id: 'bathroom', title: 'חדר הרחצה', category: 'house', categoryLabel: 'הבית', image: IMAGES.rain_shower, description: 'מקלחון גשם עם דלתות זכוכית ואור שמש' },
  { id: 'bride', title: 'כלה בשורשים', category: 'bride', categoryLabel: 'התארגנות כלה', image: IMAGES.bride_dress, description: 'שמלת כלה בחדר השינה' },
  { id: '1', title: 'עץ הפיקוס הוותיק', category: 'courtyard', categoryLabel: 'חצר הבית', image: IMAGES.ficus_trunk, description: 'גזע הפיקוס העתיק וקיר האבן בחצר' },
  { id: '3', title: 'יין וגבינות מקומיים', category: 'details', categoryLabel: 'תמונת אווירה', image: IMAGES.wine_cheese, description: 'בקבוק יין מקומי, כוסות ומגש גבינות' },
  { id: '4', title: 'עיצוב שנבנה משכבות של זמן', category: 'house', categoryLabel: 'הבית', image: IMAGES.lounge, description: 'פינת ישיבה רכה, תמונות משפחה ואור חם' },
  { id: '6', title: 'העבר על הקיר. החיים ממשיכים לפרוח.', category: 'details', categoryLabel: 'פרטים', image: IMAGES.flowers_wall, description: 'פרחים לבנים מול קיר תמונות המשפחה' },
  { id: '7', title: 'חומרים מתקופות שונות. סיפור אחד.', category: 'details', categoryLabel: 'פרטים', image: IMAGES.corridor_shutter, description: 'מסדרון עם קיר אבן, תמונות משפחה ותריס ירוק' },
];

export const LOCAL_PLACES: LocalPlace[] = [
  { id: '1', name: 'מדרחוב המייסדים ההיסטורי', category: 'trails', categoryLabel: 'סיור ושיטוט', distance: '1 דקת הליכה (כ-80 מטר)', recommendationBy: 'שרי', tip: 'מומלץ לטייל בשעות אחה״צ כשהאוויר מתקרר והחנויות פתוחות', description: 'הרחוב המרכזי והציורי של המושבה, רצוף מבני אבן היסטוריים, בוטיקים, גלריות אמנים, בתי קפה ומסעדות מעולות.' },
  { id: '2', name: 'יקב כרמל ההיסטורי', category: 'wine', categoryLabel: 'יין וכרמים', distance: '3 דקות הליכה', recommendationBy: 'יואב', tip: 'מומלץ לתאם סיור במרתפים התת-קרקעיים המקוריים', description: 'היקב שהוקם על ידי הברון רוטשילד ב-1890, כולל מרכז מבקרים, טעימות יין וסיורים מרתקים במרתפים העתיקים.' },
  { id: '3', name: 'יקב סומק (Sommek Winery)', category: 'wine', categoryLabel: 'יין וכרמים', distance: '5 דקות הליכה', recommendationBy: 'שרי', tip: 'אל תפספסו את הבלנד הלבן שלהם בישיבה בחצר', description: 'יקב בוטיק משפחתי מעולה בלב המושבה, המציע יינות עטורי שבחים ואירוח חם בחצר אותנטית.' },
  { id: '4', name: 'קפה תרשיש ופיקוקו', category: 'coffee', categoryLabel: 'קפה ובוקר', distance: '2 דקות הליכה', recommendationBy: 'שרי', tip: 'מאפים טריים שנאפים במקום וקפה משובח במיוחד', description: 'נקודת פתיחה מושלמת לבוקר שקט במושבה עם אווירה מקומית אותנטית.' },
  { id: '5', name: 'מוזיאון העלייה הראשונה ובית ניל״י', category: 'trails', categoryLabel: 'היסטוריה ותרבות', distance: '4 דקות הליכה', recommendationBy: 'יואב', tip: 'חוויה מעוררת השראה הממחישה את סיפור המייסדים של המקום', description: 'סיפור ההתיישבות המרתק של מייסדי זכרון יעקב וביתה של מחתרת ניל״י המפורסמת.' },
  { id: '6', name: 'מסעדת אדמה', category: 'food', categoryLabel: 'קולינריה', distance: '6 דקות הליכה', recommendationBy: 'יואב', tip: 'להזמין מקום מראש לישיבה בגינה הרומנטית בערב', description: 'מסעדת ביסטרו כפרית המשלבת חומרי גלם מקומיים מהאזור באווירה חמימה ואינטימית.' },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'למי מתאים האירוח בשורשים?',
    answer: 'שורשים מיועד למבוגרים בלבד, לזוגות המחפשים חופשה שלווה ואינטימית, לכלות ולמלוות ביום ההתארגנות, או לעד 3 מבוגרים. המתחם אינו מתאים לילדים, למסיבות או לאירועים רבי משתתפים, מתוך כוונה לשמור על שקט מוחלט ושלוות נפש.',
  },
  {
    question: 'מה כוללת חבילת התארגנות כלה?',
    answer: `${STAY_PACKAGES.bride_day.hours}. ${STAY_PACKAGES.bride_day.capacity}. כולל חלל להתארגנות, חצר וגג לצילום. במסלול לילה לפני ניתן ללון עד 3 אורחים.`,
  },
  {
    question: 'מהם זמני הצ\'ק-אין והצ\'ק-אאוט באירוח רגיל?',
    answer: 'הכניסה (צ\'ק-אין) היא החל מהשעה 15:00, והעזיבה (צ\'ק-אאוט) היא עד השעה 11:00. בימי שישי ושבת ניתן בתיאום מראש ובמידת האפשר לבקש עזיבה מאוחרת יותר.',
  },
  {
    question: 'האם יש חניה מסודרת?',
    answer: 'כן, לצימר יש חניה פרטית צמודה בתוך מתחם המשק, כך שאינכם צריכים לחפש חניה ברחובות המושבה. החניה מתאימה גם לרכב ההסעות או המלווים ביום החתונה.',
  },
  {
    question: 'מה המרחק מהמדרחוב וממסעדות?',
    answer: 'הצימר ממוקם בתוך משק פויזנר ברחוב המייסדים 71, במרחק של כ-80 מטרים בלבד (כדקת הליכה רגלית) מתחילת מדרחוב המייסדים. כל בתי הקפה, המסעדות, הגלידריות והיקבים נמצאים במרחק פסיעות בודדות ללא צורך בהנעת הרכב.',
  },
  {
    question: 'מה כולל המטבח בצימר?',
    answer: 'המטבח מלא ומצויד היטב: מקרר גדול, תנור אפייה, כיריים, מיקרוגל, קומקום חשמלי, מכונת קפה עם פולי קפה איכותיים, כלי בישול מלאים, סכו"ם, כוסות יין וצלחות, ואי רחב ונוח לארוחות.',
  },
  {
    question: 'האם ניתן להביא בעלי חיים?',
    answer: 'בשל שמירה על הניקיון והאלרגיות של כלל האורחים, האירוח בצימר הינו ללא חיות מחמד.',
  },
  {
    question: 'מהי מדיניות הביטולים?',
    answer: CANCELLATION_POLICY,
  },
];



