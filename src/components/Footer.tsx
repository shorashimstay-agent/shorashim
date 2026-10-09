import { navigateTo } from './navigate';
import { BRAND_DATA } from '../data/shorashimData';
export default function Footer({ onOpenBooking }: { onOpenBooking: () => void }) {
  return <footer className="site-footer" dir="rtl" lang="he">
    <div className="closing-invitation"><p className="section-eyebrow">נשמח לארח אתכם</p><h2 className="font-serif text-3xl sm:text-5xl">החופשה הבאה שלכם מתחילה כאן.</h2><button type="button" className="primary-action mt-6" onClick={onOpenBooking}>בקשת תאריכים</button></div>
    <div className="footer-inner">
      <div className="footer-contact"><a href="#home" onClick={e=>{e.preventDefault();navigateTo('home');}} aria-label="שורשים — דף הבית"><img src="/images/logo-256.webp" alt="" width={256} height={256} loading="lazy" decoding="async" className="h-16 w-auto" /></a><div><p>{BRAND_DATA.address}</p><a href={'tel:'+BRAND_DATA.phone} className="footer-phone" dir="ltr">{BRAND_DATA.phoneFormatted}</a></div></div>
      <nav aria-label="קישורים בתחתית האתר" className="footer-links">{[['house','הסוויטה'],['bride','כלה בשורשים'],['story','הסיפור'],['faq','שאלות נפוצות']].map(([id,label])=><a key={id} href={'#'+id} onClick={e=>{e.preventDefault();navigateTo(id);}}>{label}</a>)}<a href={'https://wa.me/'+BRAND_DATA.whatsappNumber} target="_blank" rel="noopener noreferrer">WhatsApp</a><a href={BRAND_DATA.instagram} target="_blank" rel="noopener noreferrer">Instagram</a><a href="mailto:shorashimstay@gmail.com">דוא״ל</a></nav>
      <nav aria-label="מסמכים" className="footer-links"><a href="/terms/">תנאי הזמנה ושימוש</a><a href="/privacy/">מדיניות פרטיות</a><a href="/accessibility/">הצהרת נגישות</a><a href="/en/terms/" lang="en" hrefLang="en">English</a></nav>
      <p className="footer-copyright">© {new Date().getFullYear()} שורשים · כל הזכויות שמורות</p>
    </div>
  </footer>;
}
