// Text of the legal pages. Everything here describes how the site and the booking system actually
// work (apps-script/, src/); change it together with them.
// A body item is a paragraph (string), a bulleted list (string[]) or a component slot. URLs, emails and phone numbers
// in the text become links.
import { NIGHT_BEFORE_CHECK_IN, PREP_FRIDAY_START, PREP_START } from '../../shared/rules.js';
import { SITE_TOOLS } from '../consent/tools';

export type Lang = 'he' | 'en';
export type PageId = 'terms' | 'privacy' | 'accessibility';

/** A part of a page drawn by a component: the cookie choice, or the marketing tools list. */
export interface Slot {
  slot: 'consentControls' | 'marketingTools';
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: { id?: string; heading: string; body: (string | string[] | Slot)[] }[];
}

const UPDATED = { he: 'עודכן לאחרונה: 18.10.2026', en: 'Last updated: 18 October 2026' };
const UPDATED_PRIVACY_A11Y = { he: 'עודכן לאחרונה: 12.11.2026', en: 'Last updated: 12 November 2026' };
/** The site tools' names, for the sentence Meta's Business Tools Terms require (src/consent/tools.ts). */
const SITE_TOOL_NAMES = {
  he: SITE_TOOLS.map((t) => t.brand).join(', '),
  en: SITE_TOOLS.map((t) => t.brand).join(', '),
};
const CONTACT_HE = ['טלפון ו-WhatsApp: 051-500-6613', 'דוא"ל: shorashimstay@gmail.com', 'כתובת: משק פויזנר, המייסדים 71, זכרון יעקב'];
const CONTACT_EN = ['Phone and WhatsApp: +972-51-500-6613', 'Email: shorashimstay@gmail.com', 'Address: Poisner Farm, 71 HaMeyasdim St., Zichron Ya’akov, Israel'];

export const DOCS: Record<PageId, Record<Lang, LegalDoc>> = {
  terms: {
    he: {
      title: 'תנאי הזמנה ושימוש',
      updated: UPDATED.he,
      intro:
        'האתר shorashimstay.com מופעל על ידי "שורשים" – בית בוטיק לאירוח במשק פויזנר, זכרון יעקב ("שורשים", "אנחנו"). השימוש באתר ושליחת בקשת הזמנה כפופים לתנאים שלהלן. התנאים מנוסחים לעיתים בלשון זכר או נקבה מטעמי נוחות בלבד, והם פונים לכל המגדרים.',
      sections: [
        {
          heading: 'בקשת הזמנה',
          body: [
            'טופס ההזמנה באתר שולח בקשה, ואינו הזמנה מחייבת. לאחר השליחה התאריכים שביקשתם מוחזקים עבורכם באופן זמני למשך 24 שעות, עד שנבדוק את הבקשה.',
            'התאריך נשמר רק לאחר אישור מפורש שלנו ושלכם, בדרך כלל ב-WhatsApp, הכולל את המסלול, התאריך, המחיר ותנאי הביטול. מי שמסר כתובת דוא"ל מקבל עם האישור גם זימון ליומן. אם הבקשה לא אושרה תוך 24 שעות, התאריכים נפתחים שוב להזמנה.',
            'אנחנו רשאים לדחות בקשה, למשל כשהתאריכים אינם פנויים. הודעה על דחייה תימסר לכם בטלפון או ב-WhatsApp.',
          ],
        },
        {
          heading: 'מחירים ותשלום',
          body: [
            'המחיר המוצג באתר הוא עבור האירוח שבחרתם, בהתאם לתאריכים ולמספר האורחים. ההזמנה כפופה לאישור זמינות, והיא נקבעת רק לאחר אישור מפורש כמתואר למעלה.',
            'אין צורך במקדמה; התשלום הוא בתחילת האירוח. ללא מקדמה אין פירושו פטור מדמי ביטול.',
            'האתר אינו גובה תשלום ואינו מבקש פרטי כרטיס אשראי.',
            'מסלולי הכלה (יום כלה, לילה לפני + יום כלה, ליל כלולות, יום התארגנות + ליל כלולות) מתומחרים בנפרד, בהתאם לשעות ולצרכים של יום החתונה.',
          ],
        },
        {
          heading: 'ביטול ושינוי הזמנה',
          body: [
            'אפשר לבטל הזמנה בטלפון, ב-WhatsApp או בדוא"ל. מועד הביטול הוא המועד שבו קיבלנו את ההודעה. דמי הביטול מחושבים ממחיר ההזמנה הכולל:',
            [
              'ביטול לפחות 14 ימים לפני תחילת האירוח – ללא חיוב.',
              'ביטול כשנותרו לפחות 7 ימים ופחות מ-14 ימים – 50% ממחיר ההזמנה.',
              'ביטול פחות מ-7 ימים מראש, או אי-הגעה – 100% ממחיר ההזמנה.',
            ],
            'המועדים נספרים לפי שעת תחילת האירוח שסוכמה, בשעון ישראל; בחבילות עם לילה לפני – מתחילת הלינה.',
            'אם התאריך הוזמן מחדש באותו מחיר, יוחזרו דמי הביטול שנגבו.',
            'זכות הביטול לפי חוק הגנת הצרכן: אם תבטלו תוך 14 ימים מיום אישור ההזמנה, ובתנאי שנותרו לפחות 7 ימים שאינם ימי מנוחה עד יום ההגעה, דמי הביטול יהיו 5% ממחיר ההזמנה או 100 ₪, הנמוך מביניהם. במקרה של סתירה, הזכות לפי החוק גוברת על האמור בסעיף זה.',
            'שינוי מועד: פעם אחת וללא דמי שינוי, בהודעה של לפחות 14 ימים לפני תחילת האירוח, בכפוף לזמינות ולהפרש מחיר.',
            'עזיבה מוקדמת אינה מזכה בהחזר על הלילות שלא נוצלו.',
            'אם אנחנו מבטלים את ההזמנה, או שאיסור רשמי (למשל הנחיות פיקוד העורף) מונע את האירוח, תקבלו לבחירתכם החזר מלא או שינוי מועד.',
            'החזר כספי יבוצע תוך 14 ימים מיום קבלת הודעת הביטול, באמצעי התשלום שבו שילמתם.',
          ],
        },
        {
          heading: 'כללי האירוח',
          body: [
            [
              'האירוח מיועד למבוגרים בלבד.',
              'עד שלושה מבוגרים. האורח השלישי לן על ספה נפתחת בסלון.',
              "צ'ק-אין החל מהשעה 15:00, וצ'ק-אאוט עד השעה 11:00. שינוי בשעות אפשרי בתיאום מראש.",
              `יום כלה: ${PREP_START}–15:30 ביום ההתארגנות, ללא לינה. לילה לפני + יום כלה: הגעה ב-${NIGHT_BEFORE_CHECK_IN} ביום שלפני ויציאה ב-15:30 ביום האירוע, עד 3 אורחי לינה. ליל כלולות: הגעה לאחר האירוע בתיאום, יציאה ב-13:00, לזוג. יום התארגנות + ליל כלולות: הגעה ב-${PREP_START} ביום החתונה, התארגנות וחזרה ללינה אחרי האירוע, יציאה ב-13:00 למחרת החתונה (לילה אחד), עד 3 אורחי לינה. ביום שישי אפשר להתחיל את ההתארגנות גם ב-${PREP_FRIDAY_START}, בתיאום. לפני יום התארגנות שמתחיל בבוקר הבית נשאר ריק מאורחים בלילה שלפני; הלילה הזה אינו חלק מהאירוח ואינו מחויב.`,
              'במסלולי יום הכלה משתתפים עד 5 אנשים, כולל הכלה, המלוות ואנשי המקצוע.',
              'האירוח הוא ללא בעלי חיים.',
              'העישון מותר בחצר ובמרפסת הגג בלבד, ואסור בתוך החלל הסגור.',
              'צילומים מקצועיים בחללי המקום ובחצר מתקיימים במסגרת מסלולי הכלה ובתיאום מראש.',
            ],
            'האורחים אחראים לנזק שייגרם במהלך השהות, במידה שנגרם באשמתם.',
          ],
        },
        {
          heading: 'המידע באתר',
          body: [
            'אנחנו משתדלים שהמידע באתר, כולל התמונות, התיאורים והזמינות, יהיה מדויק ועדכני. ייתכנו שינויים בין התיאור באתר לבין המצב בפועל, והמידע המחייב הוא זה שנמסר לכם עם אישור ההזמנה.',
            'ההמלצות על מקומות בזכרון יעקב והסביבה הן המלצות אישיות שלנו. איננו אחראים לשירות, למחירים או לזמינות של העסקים המומלצים.',
            'האתר מקשר לשירותים חיצוניים כמו WhatsApp, אינסטגרם ו-Google. השימוש בהם כפוף לתנאים שלהם.',
          ],
        },
        {
          heading: 'קניין רוחני',
          body: ['כל התכנים באתר, כולל הטקסטים, התמונות והעיצוב, שייכים לשורשים. אין להעתיק אותם או להשתמש בהם ללא רשות בכתב.'],
        },
        {
          heading: 'פרטיות ונגישות',
          body: [
            'המידע שאתם מוסרים בטופס ההזמנה מטופל לפי מדיניות הפרטיות: https://shorashimstay.com/privacy/',
            'על נגישות האתר והמקום ראו את הצהרת הנגישות: https://shorashimstay.com/accessibility/',
          ],
        },
        {
          heading: 'דין וסמכות שיפוט',
          body: ['על תנאים אלה חלים דיני מדינת ישראל. סמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים במחוז חיפה.'],
        },
        { heading: 'יצירת קשר', body: [CONTACT_HE] },
      ],
    },
    en: {
      title: 'Booking Terms and Terms of Use',
      updated: UPDATED.en,
      intro:
        'shorashimstay.com is operated by Shorashim, a boutique guesthouse at the Poisner Farm in Zichron Ya’akov, Israel ("Shorashim", "we"). Using the site and sending a booking request are subject to the terms below. The Hebrew version of these terms prevails.',
      sections: [
        {
          heading: 'Booking requests',
          body: [
            'The booking form sends a request, not a binding reservation. After you send it, the dates you asked for are held for you temporarily, for 24 hours, while we check the request.',
            'A date is reserved only after explicit confirmation by us and by you, usually on WhatsApp, stating the package, date, price and cancellation terms. If you gave an email address, the confirmation also includes a calendar invitation. If a request is not confirmed within 24 hours, its dates become available again.',
            'We may decline a request, for example when the dates are not available. We will tell you by phone or WhatsApp.',
          ],
        },
        {
          heading: 'Prices and payment',
          body: [
            'The price shown on the site is for the stay you chose, according to the dates and the number of guests. Bookings are subject to availability, and a booking is made only after the explicit confirmation described above.',
            'No deposit is needed; payment is made at the start of your stay. No deposit does not mean no cancellation fee.',
            'The site does not take payments and never asks for credit card details.',
            'The bride packages (bride day, night before + bride day, wedding night, preparation day + wedding night) are priced separately, according to the hours and needs of the wedding day.',
          ],
        },
        {
          heading: 'Cancellations and changes',
          body: [
            'You can cancel by phone, WhatsApp or email. The cancellation time is when we receive your message. Fees are a share of the total booking price:',
            [
              'Cancel at least 14 days before the stay begins – free of charge.',
              'Cancel with at least 7 but fewer than 14 days to go – 50% of the booking price.',
              'Cancel fewer than 7 days ahead, or not arriving – 100% of the booking price.',
            ],
            'Days are counted from the agreed start time of the stay, Israel time; for the packages with the night before, from the start of the night.',
            'If your date is rebooked at the same price, any cancellation fee you paid is refunded.',
            'Your statutory right under the Israeli Consumer Protection Law: if you cancel within 14 days of the booking confirmation, and at least 7 days that are not rest days remain before arrival, the fee is 5% of the booking price or ILS 100, whichever is lower. Where they differ, this statutory right prevails over the terms above.',
            'Changing dates: once, without a change fee, with at least 14 days notice before the stay begins, subject to availability and any price difference.',
            'Leaving early does not entitle you to a refund for unused nights.',
            'If we cancel your booking, or an official prohibition (for example Home Front Command instructions) prevents the stay, you choose between a full refund and new dates.',
            'Refunds are made within 14 days of receiving your cancellation notice, to the payment method you used.',
          ],
        },
        {
          heading: 'House rules',
          body: [
            [
              'Adults only.',
              'Up to three adults. The third guest sleeps on a sofa bed in the living room.',
              'Check-in from 15:00, check-out by 11:00. Other times can be arranged in advance.',
              `Bride day: ${PREP_START}–15:30 on the day, no overnight stay. Night before + bride day: arrive ${NIGHT_BEFORE_CHECK_IN} the day before, leave 15:30 on the wedding day, up to 3 overnight guests. Wedding night: arrive after the event by arrangement, leave 13:00, for the couple. Preparation day + wedding night: arrive ${PREP_START} on the wedding day, get ready and come back for the night after the event, leave 13:00 the day after the wedding (one night), up to 3 overnight guests. On a Friday, preparation can also start at ${PREP_FRIDAY_START}, by arrangement. Before a preparation day that starts in the morning, the house stays empty of guests the night before; that night is not part of the stay and is not charged.`,
              'Bride-day packages host up to 5 people during the day, including the bride, her companions and the professionals.',
              'No pets.',
              'Smoking is allowed only in the courtyard and on the roof terrace, never indoors.',
              'Professional photo shoots on the premises take place as part of the bride packages and by prior arrangement.',
            ],
            'Guests are responsible for damage caused during their stay through their fault.',
          ],
        },
        {
          heading: 'Information on the site',
          body: [
            'We try to keep the information on the site, including photos, descriptions and availability, accurate and up to date. Details may differ from the actual state, and the information given to you with the booking confirmation is binding.',
            'Recommendations of places in and around Zichron Ya’akov are our personal recommendations. We are not responsible for the service, prices or availability of the businesses we recommend.',
            'The site links to external services such as WhatsApp, Instagram and Google, whose own terms apply.',
          ],
        },
        {
          heading: 'Intellectual property',
          body: ['All content on the site, including text, photos and design, belongs to Shorashim and may not be copied or used without written permission.'],
        },
        {
          heading: 'Privacy and accessibility',
          body: [
            'Information you give in the booking form is handled according to our privacy policy: https://shorashimstay.com/en/privacy/',
            'For the accessibility of the site and the premises, see the accessibility statement: https://shorashimstay.com/en/accessibility/',
          ],
        },
        {
          heading: 'Governing law',
          body: ['These terms are governed by the laws of the State of Israel. The competent courts of the Haifa district have exclusive jurisdiction.'],
        },
        { heading: 'Contact', body: [CONTACT_EN] },
      ],
    },
  },

  privacy: {
    he: {
      title: 'מדיניות פרטיות',
      updated: UPDATED_PRIVACY_A11Y.he,
      intro:
        'מדיניות זו מסבירה איזה מידע אנחנו אוספים באתר shorashimstay.com, למה, איפה הוא נשמר ומה הזכויות שלכם לגביו. האחראית על המידע היא "שורשים" – בית בוטיק לאירוח, משק פויזנר, זכרון יעקב.',
      sections: [
        {
          heading: 'המידע שאנחנו אוספים',
          body: [
            'כשאתם שולחים בקשת הזמנה, אנחנו מקבלים את הפרטים שמילאתם בטופס:',
            ['שם מלא ומספר טלפון (חובה)', 'כתובת דוא"ל (לא חובה)', 'סוג האירוח, התאריכים, מספר האורחים ובמסלולי יום הכלה גם מספר משתתפי היום', 'הערות או בקשות מיוחדות שכתבתם'],
            'אין חובה חוקית למסור לנו מידע. בלי שם ומספר טלפון לא נוכל לטפל בבקשת ההזמנה.',
            'איננו מבקשים ואיננו שומרים פרטי תשלום.',
            'אם תאשרו זאת בבאנר העוגיות, נאסף גם מידע על השימוש באתר באמצעות כלי שיווק ופרסום (ראו "שיווק ופרסום"). בלי אישורכם, כלים אלה אינם מופעלים.',
          ],
        },
        {
          heading: 'למה אנחנו משתמשים במידע',
          body: [
            [
              'כדי לטפל בבקשת ההזמנה, לחזור אליכם ולנהל את השהות שלכם',
              'כדי לשלוח לכם זימון ליומן לאחר אישור ההזמנה, אם מסרתם כתובת דוא"ל',
              'כדי למנוע ספאם ושימוש לרעה בטופס',
              'כדי לעמוד בחובות שלנו לפי דין',
              'רק אם אישרתם: כדי למדוד ולשפר את המודעות שלנו, כולל הצגתן לאנשים בעלי מאפיינים דומים, ולהציג לכם מודעות מותאמות בפלטפורמות פרסום',
            ],
            'לא נשלח לכם הודעות שיווקיות בדוא"ל, ב-SMS או בטלפון, ולא נמכור את המידע.',
            'לתושבי האיחוד האירופי: הבסיס החוקי לכלי השיווק והפרסום הוא הסכמתכם; לטיפול בבקשת ההזמנה – ביצוע ההזמנה וחובות לפי דין; למניעת ספאם – האינטרס הלגיטימי שלנו.',
          ],
        },
        {
          heading: 'איפה המידע נשמר ומי מקבל אותו',
          body: [
            'בקשות ההזמנה וההזמנות נשמרות בחשבון Google של שורשים: ביומן Google, בגיליון Google פרטי ובתיבת הדוא"ל שלנו, שם אנחנו מקבלים הודעה על כל בקשה. Google מעבדת את המידע עבורנו.',
            'לצורך הגנה מפני ספאם, הטופס משתמש ב-Google reCAPTCHA, שאוסף מידע על המכשיר והדפדפן לפי מדיניות הפרטיות של Google: https://policies.google.com/privacy',
            'האתר מאוחסן אצל ספק אחסון, והגופנים נטענים מ-Google Fonts; כמו כל שרת אתרים, הם מקבלים את כתובת ה-IP של הדפדפן.',
            'לחיצה על קישור WhatsApp, אינסטגרם או טלפון מעבירה אתכם לשירות החיצוני, והמידע שתמסרו שם כפוף למדיניות שלו.',
            'בהסכמתכם בלבד, מידע מועבר גם לפלטפורמות פרסום (ראו "שיווק ופרסום").',
            'חלק מהמידע עשוי להיות מעובד מחוץ לישראל, כולל בארה"ב, על בסיס החלטות הלימות (כגון EU-U.S. Data Privacy Framework) או סעיפים חוזיים תקניים; לעותק פנו אלינו.',
            'מלבד זאת לא נעביר את המידע לגורמים אחרים, אלא אם נידרש לכך על פי דין.',
          ],
        },
        {
          heading: 'כמה זמן המידע נשמר',
          body: [
            'בקשה שנדחתה נמחקת מהיומן מיד עם הדחייה. בקשה שאושרה הופכת להזמנה ביומן, ונשמרת כל עוד היא נדרשת לניהול האירוח ולחובותינו לפי דין, למשל לצורכי הנהלת חשבונות.',
            'לצורך מניעת ספאם, מספר הטלפון נשמר זמנית במערכת עד 6 שעות לאחר שליחת הבקשה. פרטי ההחלטה על בקשה (שם, טלפון ותאריכים) מוצגים בגיליון הניהול שלנו עד 3 ימים.',
            'תקופות השמירה של כלי השיווק והפרסום מפורטות בסעיף שלהם.',
          ],
        },
        {
          id: 'marketing',
          heading: 'שיווק ופרסום',
          body: [
            'בהסכמתכם בלבד (כפתור "מאשרים" בבאנר העוגיות), אנחנו מפעילים באתר כלים של פלטפורמות הפרסום המפורטות ברשימה שבסוף סעיף זה.',
            'הכלים אוספים אילו עמודים ביקרתם ואילו פעולות עשיתם באתר (למשל בדיקת זמינות או שליחת בקשת הזמנה, וסוג האירוח שבחרתם), ומזהים טכניים: עוגיות, כתובת IP, סוג הדפדפן והמכשיר. הם אינם אוספים את הפרטים שאתם מקלידים בטפסים.',
            'המטרות: למדוד אילו מודעות וקמפיינים שלנו מביאים פניות, לשפר את הצגת המודעות שלנו, כולל לאנשים בעלי מאפיינים דומים, ולהציג לכם מודעות מותאמות בפלטפורמות אלה.',
            'הפלטפורמה אוספת את המידע עבורנו או יחד איתנו, ולשימושיה שלה היא אחראית לבדה; לכל בקשה פנו אלינו.',
            `פלטפורמות אלה (כולל ${SITE_TOOL_NAMES.he}) וגורמים שלישיים אחרים עשויים להשתמש בעוגיות, בפיקסלים ובטכנולוגיות אחסון אחרות כדי לאסוף או לקבל מידע מהאתר שלנו וממקומות אחרים באינטרנט, ולהשתמש בו כדי לספק שירותי מדידה ולהציג מודעות ממוקדות. אפשר להגביל זאת בהגדרות של כל פלטפורמה (קישורים ברשימה) וגם ב-https://optout.aboutads.info וב-https://www.youronlinechoices.eu`,
            'העוגיות נשמרות בדפדפן לתקופה המפורטת ברשימה. מבקר נשאר בקהלי האתר שלנו בפלטפורמה עד 180 יום מהביקור האחרון שבו הסכים לכך. הבחירה שלכם נשמרת בדפדפן 6 חודשים, ואז נשאל שוב.',
            'שום דבר מאלה לא פועל אם לא בחרתם "מאשרים". אפשר לשנות או לבטל את הבחירה בכל עת ב"הגדרות עוגיות" (בתחתית האתר ובסעיף זה). הביטול עוצר איסוף חדש ומוחק את העוגיות של הכלים מהדומיין שלנו, אך אינו מוחק מידע שכבר נמסר. עוגיות בדומיין של הפלטפורמה מנוהלות בהגדרות שלה.',
            { slot: 'consentControls' },
            'הכלים שבהם אנו משתמשים כעת:',
            { slot: 'marketingTools' },
          ],
        },
        {
          id: 'cookies',
          heading: 'עוגיות ואחסון בדפדפן',
          body: [
            'האתר עצמו אינו מגדיר עוגיות, מלבד עוגיות של כלי השיווק והפרסום שנשמרות בדומיין שלנו רק אם אישרתם (ראו "שיווק ופרסום"). הבחירה שלכם בבאנר נשמרת בדפדפן שלכם.',
            'אם תבחרו התאמות בתפריט הנגישות, הן יישמרו בדפדפן שלכם בלבד (localStorage), כדי שיישארו גם בכניסה הבאה. Google reCAPTCHA עשוי להשתמש בעוגיות משלו.',
          ],
        },
        {
          heading: 'הזכויות שלכם',
          body: [
            'לפי חוק הגנת הפרטיות, התשמ"א-1981, אתם רשאים לעיין במידע שלכם שנמצא אצלנו, לבקש לתקן אותו ולבקש למחוק אותו, בכפוף לחובות שלנו לפי דין.',
            'כדי לממש זכות, פנו אלינו בכתב בדוא"ל. ייתכן שנבקש פרטים לאימות זהותכם לפני המענה, ונשיב תוך 30 יום.',
            'אפשר לבטל בכל עת הסכמה שנתתם, ב"הגדרות עוגיות".',
            'אפשר להגיש תלונה לרשות להגנת הפרטיות. תושבי האיחוד האירופי רשאים גם לבקש הגבלת עיבוד, להתנגד לעיבוד ולקבל את המידע בפורמט נייד, ולהתלונן לרשות הפיקוח במדינתם.',
          ],
        },
        {
          heading: 'אבטחת מידע',
          body: [
            'האתר מוצפן (HTTPS). הגישה לבקשות ולהזמנות מוגבלת לחשבון של שורשים ולמי שמנהלים את ההזמנות. הקישורים לאישור או לדחיית בקשה חתומים דיגיטלית, כך שרק מי שקיבל אותם בדוא"ל יכול להשתמש בהם.',
          ],
        },
        {
          heading: 'קטינים',
          body: ['האירוח בשורשים מיועד למבוגרים בלבד, והאתר אינו מיועד לאיסוף מידע מקטינים.'],
        },
        {
          heading: 'שימוש בשירותי Google API',
          body: [
            'מערכת ההזמנות פועלת בחשבון Google של שורשים ומשתמשת בממשקי Google (יומן, גיליונות, Drive, Gmail ו-Apps Script) רק כדי לנהל את הבקשות וההזמנות שתוארו כאן. המערכת אינה ניגשת לחשבונות Google של אורחים.',
            'השימוש של שורשים במידע המתקבל מממשקי Google API והעברתו לכל אפליקציה אחרת יעמדו במדיניות נתוני המשתמש של שירותי Google API, כולל דרישות השימוש המוגבל (Limited Use): https://developers.google.com/terms/api-services-user-data-policy',
          ],
        },
        {
          heading: 'שינויים במדיניות',
          body: ['נעדכן את המדיניות כשיהיו שינויים באתר או במערכת. תאריך העדכון האחרון מופיע בראש העמוד.'],
        },
        { heading: 'יצירת קשר בנושא פרטיות', body: [CONTACT_HE] },
      ],
    },
    en: {
      title: 'Privacy Policy',
      updated: UPDATED_PRIVACY_A11Y.en,
      intro:
        'This policy explains what information we collect on shorashimstay.com, why, where it is kept and what your rights are. The data controller is Shorashim, a boutique guesthouse at the Poisner Farm, Zichron Ya’akov, Israel. The Hebrew version of this policy prevails.',
      sections: [
        {
          heading: 'What we collect',
          body: [
            'When you send a booking request, we receive the details you entered in the form:',
            ['Full name and phone number (required)', 'Email address (optional)', 'Type of stay, dates, number of guests and, for bride-day packages, the number of people present during the day', 'Any notes or special requests you wrote'],
            'You have no legal duty to give us any information. Without a name and phone number we cannot handle a booking request.',
            'We do not ask for or store payment details.',
            'If you accept it in the cookie banner, information about your use of the site is also collected by marketing and advertising tools (see "Marketing and advertising"). Without your consent, these tools do not run.',
          ],
        },
        {
          heading: 'Why we use it',
          body: [
            [
              'To handle your booking request, get back to you and manage your stay',
              'To send you a calendar invitation once the booking is confirmed, if you gave an email address',
              'To prevent spam and abuse of the form',
              'To meet our legal obligations',
              'Only if you agreed: to measure and improve our ads, including showing them to people with similar characteristics, and to show you relevant ads on advertising platforms',
            ],
            'We will not send you marketing messages by email, SMS or phone, and we will not sell your information.',
            'For EU residents: the legal basis for the marketing and advertising tools is your consent; for handling a booking request, performing the booking and our legal obligations; for spam prevention, our legitimate interest.',
          ],
        },
        {
          heading: 'Where it is kept and who receives it',
          body: [
            'Booking requests and bookings are kept in Shorashim’s Google account: in Google Calendar, in a private Google Sheet and in our email inbox, where we are notified of each request. Google processes this information on our behalf.',
            'To protect against spam, the form uses Google reCAPTCHA, which collects device and browser information under Google’s privacy policy: https://policies.google.com/privacy',
            'The site is hosted by a hosting provider, and fonts are loaded from Google Fonts; like any web server, they receive your browser’s IP address.',
            'Clicking a WhatsApp, Instagram or phone link takes you to that external service, whose own policy covers what you share there.',
            'Only with your consent, information also goes to advertising platforms (see "Marketing and advertising").',
            'Some information may be processed outside Israel, including in the United States, on the basis of adequacy decisions (such as the EU-U.S. Data Privacy Framework) or standard contractual clauses; contact us for a copy.',
            'Otherwise we do not pass your information to anyone, unless the law requires us to.',
          ],
        },
        {
          heading: 'How long we keep it',
          body: [
            'A declined request is deleted from our calendar as soon as it is declined. An approved request becomes a booking in our calendar and is kept for as long as we need it to manage the stay and to meet our legal obligations, such as accounting.',
            'To prevent spam, your phone number is kept temporarily for up to 6 hours after you send a request. The details of a decision on a request (name, phone and dates) are shown in our admin sheet for up to 3 days.',
            'How long the marketing and advertising tools keep information is set out in their section.',
          ],
        },
        {
          id: 'marketing',
          heading: 'Marketing and advertising',
          body: [
            'Only with your consent ("Accept" in the cookie banner) do we run tools of the advertising platforms listed at the end of this section.',
            'These tools collect which pages you visited and what you did on the site (for example checking availability or sending a booking request, and the type of stay you chose), and technical identifiers: cookies, IP address, browser and device type. They do not collect the details you type into the forms.',
            'The purposes: to measure which of our ads and campaigns bring enquiries, to improve how our ads are shown, including to people with similar characteristics, and to show you relevant ads on these platforms.',
            'The platform collects this information for us or jointly with us, and is solely responsible for its own uses of it; contact us with any request.',
            `These platforms (including ${SITE_TOOL_NAMES.en}) and other third parties may use cookies, pixels and other storage technologies to collect or receive information from our site and elsewhere on the internet, and use it to provide measurement services and targeted ads. You can limit this in each platform’s settings (links in the list) and at https://optout.aboutads.info and https://www.youronlinechoices.eu`,
            'The cookies stay in your browser for the period shown in the list. A visitor stays in our site audiences on the platform for up to 180 days from their last visit on which they consented. Your choice is kept in your browser for 6 months, then we ask again.',
            'None of this runs unless you chose "Accept". You can change or withdraw your choice at any time in "Cookie settings" (at the bottom of the site and in this section). Withdrawing stops new collection and deletes the tools’ cookies from our domain, but does not delete information already sent. Cookies on the platform’s own domain are managed in its settings.',
            { slot: 'consentControls' },
            'The tools we use now:',
            { slot: 'marketingTools' },
          ],
        },
        {
          id: 'cookies',
          heading: 'Cookies and browser storage',
          body: [
            'The site itself sets no cookies, except the marketing and advertising tools’ cookies, which are stored on our domain only if you accepted (see "Marketing and advertising"). Your banner choice is saved in your browser.',
            'If you choose adjustments in the accessibility menu, they are saved only in your browser (localStorage) so they apply on your next visit. Google reCAPTCHA may use its own cookies.',
          ],
        },
        {
          heading: 'Your rights',
          body: [
            'Under the Israeli Protection of Privacy Law, 5741-1981, you may access the information we hold about you, ask us to correct it, and ask us to delete it, subject to our legal obligations.',
            'To exercise a right, write to us by email. We may ask for details to confirm your identity before we answer, and we will reply within 30 days.',
            'You can withdraw any consent you gave at any time, in "Cookie settings".',
            'You can complain to the Israeli Privacy Protection Authority. EU residents may also ask us to restrict processing, object to processing and receive their information in a portable format, and complain to the supervisory authority in their country.',
          ],
        },
        {
          heading: 'Security',
          body: [
            'The site is encrypted (HTTPS). Access to requests and bookings is limited to Shorashim’s account and the people who manage bookings. The links for approving or declining a request are digitally signed, so only whoever received them by email can use them.',
          ],
        },
        {
          heading: 'Minors',
          body: ['Shorashim hosts adults only, and the site is not meant for collecting information from minors.'],
        },
        {
          heading: 'Use of Google API services',
          body: [
            'The booking system runs in Shorashim’s own Google account and uses Google APIs (Calendar, Sheets, Drive, Gmail and Apps Script) only to manage the requests and bookings described here. It does not access guests’ Google accounts.',
            'Shorashim’s use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements: https://developers.google.com/terms/api-services-user-data-policy',
          ],
        },
        {
          heading: 'Changes to this policy',
          body: ['We update this policy when the site or the booking system changes. The date of the last update is shown at the top of the page.'],
        },
        { heading: 'Privacy contact', body: [CONTACT_EN] },
      ],
    },
  },

  accessibility: {
    he: {
      title: 'הצהרת נגישות',
      updated: UPDATED_PRIVACY_A11Y.he,
      intro:
        'בשורשים חשוב לנו שכל אחד ואחת יוכלו לגלוש באתר, לבדוק זמינות ולשלוח בקשת הזמנה בקלות ובעצמאות. הצהרה זו מתארת את נגישות האתר ואת נגישות המקום עצמו.',
      sections: [
        {
          heading: 'רמת הנגישות של האתר',
          body: [
            'האתר הותאם לדרישות תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013, ולרמה AA של התקן הישראלי ת"י 5568, המבוסס על הנחיות WCAG 2.0 של ארגון W3C. במקומות שבהם הדבר התאפשר עמדנו גם בהנחיות WCAG 2.1 ברמה AA.',
          ],
        },
        {
          heading: 'מה עשינו באתר',
          body: [
            [
              'ניווט מלא במקלדת בכל חלקי האתר, כולל טופס ההזמנה, לוח התאריכים והגלריה, עם סימון פוקוס בולט',
              'קישור "דלגו לתוכן העיקרי" בתחילת כל עמוד',
              'מבנה כותרות ואזורים (landmarks) ברור, ושפה וכיוון מוגדרים לכל עמוד',
              'טקסט חלופי לתמונות',
              'ניגודיות צבעים לפי התקן',
              'תוויות לכל שדות הטופס, והודעות שגיאה שמוקראות לקוראי מסך ומקושרות לשדה',
              'לוח תאריכים שבו כל יום מוקרא עם התאריך המלא וסטטוס הזמינות שלו',
              'חלונות (כמו הגלריה) שנסגרים במקש Esc ומחזירים את הפוקוס למקום שממנו נפתחו',
              'כיבוד הגדרת "הפחתת תנועה" של מערכת ההפעלה',
              'האתר מותאם לתצוגה במחשב, בטאבלט ובטלפון, וגם ברוחב מסך של 320 פיקסלים אין צורך בגלילה לצדדים',
            ],
          ],
        },
        {
          heading: 'תפריט הנגישות',
          body: [
            'בפינת המסך נמצא כפתור הנגישות. התפריט מאפשר:',
            ['הגדלת טקסט בשתי דרגות', 'ניגודיות גבוהה (שחור על לבן)', 'הדגשת קישורים וכפתורים', 'גופן קריא', 'עצירת אנימציות'],
            'ההתאמות נשמרות בדפדפן שלכם ונשארות גם בכניסה הבאה. כפתור האיפוס מחזיר את התצוגה הרגילה.',
            'באנר העוגיות אינו חוסם את הדף ואינו לוכד את המיקוד. הוא מופיע ראשון בסדר הניווט במקלדת (גם כשהוא מוצג בתחתית המסך), שני הכפתורים בו זהים, והודעה על שמירת הבחירה מוקראת בקוראי מסך. אפשר לפתוח אותו שוב בכל עת ב"הגדרות עוגיות" בתחתית האתר.',
          ],
        },
        {
          heading: 'בדיקות',
          body: [
            'האתר נבדק בכלי בדיקה אוטומטי (axe-core) ובבדיקות של ניווט במקלדת, בדפדפן Chrome במסך מחשב ובמסך טלפון. הבדיקות רצות על כל שינוי באתר.',
          ],
        },
        {
          heading: 'מגבלות ידועות',
          body: [
            [
              'רכיבים של צד שלישי אינם בשליטתנו המלאה: Google reCAPTCHA, כלי הפרסום שפועלים רק אם אישרתם אותם בבאנר העוגיות, ו-WhatsApp ואינסטגרם שהאתר מקשר אליהם.',
              'בחירת תאריכים בלוח נעשית בלחיצה על יום. לחלופין, אפשר תמיד לשלוח את הפרטים ב-WhatsApp או בטלפון, ונשריין עבורכם.',
            ],
            'אם נתקלתם בקושי, נשמח לשמוע ולתקן.',
          ],
        },
        {
          heading: 'נגישות המקום',
          body: [
            [
              'יחידת האירוח נמצאת במפלס הקרקע, עם פתחים רחבים ומקלחון מרווח.',
              'חניה פרטית צמודה במתחם המשק.',
              'מרפסת הגג נמצאת בקומה העליונה, והעלייה אליה במדרגות בלבד, כך שאינה נגישה.',
            ],
            'יש לכם צורך מיוחד? ספרו לנו בעת ההזמנה ונעשה כל שביכולתנו להתאים את השהות.',
          ],
        },
        {
          heading: 'רכזת הנגישות ופניות בנושא נגישות',
          body: ['נתקלתם בבעיה או שיש לכם הצעה? פנו לרכזת הנגישות שלנו, שרי פויזנר, ונחזור אליכם תוך 3 ימי עבודה:', CONTACT_HE],
        },
      ],
    },
    en: {
      title: 'Accessibility Statement',
      updated: UPDATED_PRIVACY_A11Y.en,
      intro:
        'At Shorashim we want everyone to be able to browse the site, check availability and send a booking request easily and independently. This statement covers the accessibility of the site and of the premises.',
      sections: [
        {
          heading: 'Conformance level',
          body: [
            'The site meets the Israeli Equal Rights for Persons with Disabilities (Service Accessibility Adaptations) Regulations, 5773-2013, and level AA of Israeli Standard IS 5568, which is based on the W3C’s WCAG 2.0. Where possible we also meet WCAG 2.1 level AA.',
          ],
        },
        {
          heading: 'What we have done',
          body: [
            [
              'Full keyboard navigation, including the booking form, the date picker and the gallery, with a clearly visible focus indicator',
              'A "skip to main content" link at the top of every page',
              'Clear headings and landmarks, with the language and direction of every page declared',
              'Text alternatives for images',
              'Color contrast that meets the standard',
              'Labels for every form field, and error messages that screen readers announce and link to their field',
              'A date picker that reads out each day’s full date and whether it is available',
              'Dialogs (such as the gallery) that close with Esc and return focus to where they were opened',
              'The operating system’s "reduce motion" setting is respected',
              'Responsive layout for desktop, tablet and phone; even at a 320-pixel-wide screen there is no sideways scrolling',
            ],
          ],
        },
        {
          heading: 'The accessibility menu',
          body: [
            'An accessibility button sits in the corner of the screen. Its menu offers:',
            ['Two levels of larger text', 'High contrast (black on white)', 'Highlighted links and buttons', 'A readable font', 'Stopping animations'],
            'Your choices are saved in your browser for your next visit. The reset button restores the default display.',
            'The cookie banner does not block the page or trap focus. It comes first in keyboard order (even when shown at the bottom of the screen), its two buttons are identical, and screen readers announce when your choice is saved. You can reopen it at any time with "הגדרות עוגיות" (cookie settings) at the bottom of the site.',
          ],
        },
        {
          heading: 'Testing',
          body: [
            'The site was tested with an automated checker (axe-core) and for keyboard navigation, in Chrome at desktop and phone screen sizes. The checks run on every change to the site.',
          ],
        },
        {
          heading: 'Known limitations',
          body: [
            [
              'Third-party components are not fully under our control: Google reCAPTCHA, the advertising tools that run only if you accept them in the cookie banner, and WhatsApp and Instagram, which the site links to.',
              'Dates are chosen by selecting days in the calendar. You can always send your details by WhatsApp or phone instead, and we will book for you.',
            ],
            'If you run into any difficulty, please tell us and we will fix it.',
          ],
        },
        {
          heading: 'Accessibility of the premises',
          body: [
            [
              'The guest unit is on ground level, with wide doorways and a spacious walk-in shower.',
              'Private parking next to the unit, within the farm.',
              'The roof terrace is upstairs and reached by stairs only, so it is not accessible.',
            ],
            'Have a specific need? Tell us when you book and we will do everything we can to accommodate it.',
          ],
        },
        {
          heading: 'Accessibility coordinator',
          body: ['Found a problem or have a suggestion? Contact our accessibility coordinator, Saray Poisner, and we will reply within 3 business days:', CONTACT_EN],
        },
      ],
    },
  },
};
