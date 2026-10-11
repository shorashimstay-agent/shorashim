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
  size: 'כ־80 מ״ר',
  capacity: 'אירוח בוטיק למבוגרים בלבד | לזוגות או לעד שלושה אורחים',
  checkIn: '15:00',
  checkOut: '11:00',
};

export const IMAGES = GENERATED_IMAGES;

export const AMENITIES: Amenity[] = [
  { id: '1', name: 'חדר שינה נפרד', category: 'comfort', icon: 'BedDouble', description: 'מיטה מרווחת, מזרן איכותי, מצעי כותנה טבעיים ומיזוג אוויר נפרד' },
  { id: '2', name: 'מטבח מלא ומאובזר', category: 'kitchen', icon: 'UtensilsCrossed', description: 'אי רחב לישיבה ולאכילה, מקרר גדול, תנור, כיריים וכלי בישול' },
  { id: '3', name: 'מרפסת גג פרטית', category: 'outdoor', icon: 'Sun', description: 'פינת ישיבה אינטימית וערסל מול צמרות העצים, באוויר הפתוח' },
  { id: '4', name: 'חצר ירוקה ופוטוגנית', category: 'outdoor', icon: 'Trees', description: 'חצר מוקפת עצי פיקוס עתיקים, עם פינות ישיבה באווירה פסטורלית' },
  { id: '5', name: 'חדר רחצה מוקפד', category: 'comfort', icon: 'Bath', description: 'מקלחון מרווח עם ראש גשם, מגבות עבות, חלוקי רחצה ומוצרי טיפוח' },
  { id: '6', name: 'מכונת קפה איכותית', category: 'kitchen', icon: 'Coffee', description: 'פולי קפה מובחרים, חלב טרי ופינוקים חמים' },
  { id: '7', name: 'אינטרנט אלחוטי מהיר', category: 'general', icon: 'Wifi', description: 'חיבור Wi-Fi יציב וחופשי בכל הסוויטה והחצר' },
  { id: '8', name: 'חניה פרטית צמודה', category: 'general', icon: 'Car', description: 'חניה שמורה לאורחים במתחם המשק השקט' },
  { id: '9', name: 'מסך טלוויזיה חכם', category: 'comfort', icon: 'Tv', description: 'מסך שטוח וחיבור לסטרימינג ברגעי מנוחה' },
  { id: '10', name: 'אירוח מבוגרים בלבד', category: 'general', icon: 'Sparkles', description: 'אווירה שלווה לזוגות או לעד שלושה מבוגרים' },
  { id: '11', name: 'גישה לבית ולגג', category: 'general', icon: 'Accessibility', description: 'הבית במפלס הקרקע; הגג במדרגות. לבירור התאמות, מדרגות וספי כניסה פנו למארחים לפני ההזמנה.' },
  { id: '12', name: 'אורח שלישי אפשרי', category: 'comfort', icon: 'Sofa', description: 'ספה נפתחת ונוחה בסלון הצימר' },
];

export const BRIDE_PACKAGES: BridePackage[] = [
  {
    id: 'bride_day',
    title: 'יום כלה — התארגנות בשורשים',
    subtitle: 'מרחב שליו, מעוצב ומואר המותאם במיוחד לשעות ההתארגנות שלפני החופה',
    description: STAY_PACKAGES.bride_day.hours + ' · ' + STAY_PACKAGES.bride_day.capacity,
    recommendedFor: 'כלות המעוניינות בבוקר חתונה נינוח, מואר ומלא סטייל לצילומים ולהתארגנות',
    highlights: [
      'מרחב מרווח עם אור טבעי לצילומי בוקר ולהתארגנות',
      'מראות באורך מלא, שקעים נוחים ופינות ייעודיות לעיצוב שיער ולאיפור',
      'חצר ירוקה, קירות אבן ומרפסת גג לצילומים ביום החתונה',
      'אווירה רגועה ואינטימית ללא הפרעות, בלב זכרון יעקב ההיסטורית',
      'חניה שמורה וצמודה לרכב הכלה ולרכבי המלווים',
    ],
  },
  {
    id: 'bride_night_day',
    title: 'חבילת כלה מלאה — לילה לפני + יום ההתארגנות',
    subtitle: 'להגיע ערב קודם, לישון טוב ולהתעורר בנחת בבוקר החתונה',
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
    title: 'ליל כלולות — הנחיתה המושלמת',
    subtitle: 'לסיים את ערב החתונה במקום שקט, אינטימי ורומנטי במיוחד',
    description: 'כניסה לאחר האירוע | יציאה מאוחרת ב־13:00 למחרת. זוגי בלבד.',
    recommendedFor: 'זוגות טריים שרוצים לסיים את יום החתונה במרחב פרטי, שקט ואיכותי',
    highlights: [
      'נרות דולקים, אווירה חמה ורומנטית שממתינה לכם בלילה',
      'מקלחת מרווחת ומפנקת עם חלוקי רחצה רכים וסבונים טבעיים',
      'יציאה מאוחרת ב־13:00 שמאפשרת לישון עד מאוחר ולקום בנחת',
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
  {
    "id": "manuella",
    "name": "מנואלה",
    "category": "food",
    "categoryLabel": "אוכל ובילוי",
    "description": "מסעדה איטלקית במבנה היסטורי במדרחוב — פסטות, פיצות ואווירה נעימה.",
    "recommendationBy": "שרי",
    "tip": "",
    "distance": ""
  },
  {
    "id": "uma",
    "name": "אומה — בר וסושי",
    "category": "food",
    "categoryLabel": "אוכל ובילוי",
    "description": "סושי, אוכל אסייתי וקוקטיילים במבנה לשימור ברחוב הנדיב. לערב זוגי בבר או בחצר.",
    "recommendationBy": "שרי",
    "tip": "",
    "distance": ""
  },
  {
    "id": "hobbit",
    "name": "ההוביט",
    "category": "wine",
    "categoryLabel": "בילוי בערב",
    "description": "הפאב הוותיק במדרחוב — בירות, ויסקי ואוכל באווירה מקומית.",
    "recommendationBy": "שרי",
    "tip": "",
    "distance": ""
  },
  {
    "id": "luma",
    "name": "לומא",
    "category": "coffee",
    "categoryLabel": "קפה ובוקר",
    "description": "קפה, חליטות וכריכי מחמצת במדרחוב. עצירה נעימה לקפה ולמשהו טעים.",
    "recommendationBy": "שרי",
    "tip": "",
    "distance": ""
  },
  {
    "id": "simcha",
    "name": "שמחה בר יין",
    "category": "wine",
    "categoryLabel": "יין ובילוי",
    "description": "בר יין ברחוב הנדיב, עם מבחר יינות ואוכל לצד הכוס. לערב נינוח במרכז המושבה.",
    "recommendationBy": "שרי",
    "tip": "",
    "distance": ""
  }
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'למי מתאים האירוח בשורשים?',
    answer: 'שורשים מיועד למבוגרים בלבד, לזוגות המחפשים חופשה שלווה ואינטימית, לכלות ולמלוות ביום ההתארגנות, או לעד שלושה מבוגרים. המתחם אינו מתאים לילדים, למסיבות או לאירועים רבי משתתפים, מתוך כוונה לשמור על שקט מוחלט ושלוות נפש.',
  },
  {
    question: 'מה כוללת חבילת התארגנות כלה?',
    answer: `${STAY_PACKAGES.bride_day.hours}. ${STAY_PACKAGES.bride_day.capacity}. כולל מרחב להתארגנות, חצר וגג לצילום. במסלול לילה לפני יכולים ללון עד שלושה אורחים.`,
  },
  {
    question: 'מהם זמני הכניסה והיציאה באירוח רגיל?',
    answer: 'הכניסה היא החל מהשעה 15:00, והיציאה היא עד השעה 11:00. בימי שישי ושבת ניתן בתיאום מראש ובמידת האפשר לבקש עזיבה מאוחרת יותר.',
  },
  {
    question: 'האם יש חניה מסודרת?',
    answer: 'כן, לצימר יש חניה פרטית צמודה בתוך מתחם המשק, כך שאינכם צריכים לחפש חניה ברחובות המושבה. החניה מתאימה גם לרכב ההסעות או לרכבי המלווים ביום החתונה.',
  },
  {
    question: 'מה המרחק מהמדרחוב וממסעדות?',
    answer: 'הצימר ממוקם בתוך משק פויזנר ברחוב המייסדים 71, במרחק של כ־80 מטרים בלבד (כדקת הליכה רגלית) מתחילת מדרחוב המייסדים. כל בתי הקפה, המסעדות, הגלידריות והיקבים נמצאים במרחק פסיעות בודדות ללא צורך בהנעת הרכב.',
  },
  {
    question: 'מה כולל המטבח בצימר?',
    answer: 'המטבח מלא ומצויד היטב: מקרר גדול, תנור אפייה, כיריים, מיקרוגל, קומקום חשמלי, מכונת קפה עם פולי קפה איכותיים, מבחר כלי בישול, סכו״ם, כוסות יין וצלחות, ואי רחב ונוח לארוחות.',
  },
  {
    question: 'האם ניתן להביא בעלי חיים?',
    answer: 'כדי לשמור על הניקיון ולהתחשב באורחים עם אלרגיות, לא ניתן להביא חיות מחמד.',
  },
  {
    question: 'מהי מדיניות הביטולים?',
    answer: CANCELLATION_POLICY,
  },
];



