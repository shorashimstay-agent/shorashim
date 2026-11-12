// The cookie banner of the main and bride pages. Its wording, the two equal buttons and the easy way
// back (CookieSettingsButton) are legal requirements: this folder is code-owned (.github/CODEOWNERS).
// Not a dialog: it doesn't block the page or trap focus, and it is first in keyboard order.
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { getMarketingConsent, onConsentChange, OPEN_SETTINGS_EVENT, setMarketingConsent, type Choice } from '../lib/consent';
import { SITE_TOOLS } from './tools';
import './consent.css';

// The platforms are named from the registry (tools.ts), so adding a tool updates the banner too.
export const BANNER_TEXT = `נשתמש בעוגיות, במידע על הגלישה באתר ובפרטי הקשר שתמסרו (מוצפנים) כדי שפלטפורמות פרסום (כיום ${SITE_TOOLS.map((t) => t.brand).join(', ')}) ימדדו וישפרו את המודעות שלנו ויציגו לכם מודעות מותאמות. אפשר לשנות בכל עת.`;

const CURRENT: Record<Choice, string> = { granted: 'כרגע: מאשרים', denied: 'כרגע: לא מאשרים' };

export default function ConsentBanner() {
  const [open, setOpen] = useState(() => getMarketingConsent() === null);
  const [current, setCurrent] = useState<Choice | null>(null);
  const [status, setStatus] = useState('');
  const bar = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  // Reopened from "הגדרות עוגיות": show the current choice and move focus into the banner.
  useEffect(() => {
    const reopen = (e: Event) => {
      opener.current = (e as CustomEvent<{ opener: HTMLElement | null }>).detail?.opener ?? null;
      setCurrent(getMarketingConsent());
      setOpen(true);
      requestAnimationFrame(() => heading.current?.focus());
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, reopen);
    // A choice made in another tab hides this banner too.
    const off = onConsentChange((choice, source) => {
      // A choice made elsewhere hides the banner; a cleared or expired one shows it again.
      if (source === 'external') setOpen(choice === null);
    });
    return () => {
      window.removeEventListener(OPEN_SETTINGS_EVENT, reopen);
      off();
    };
  }, []);

  // The banner's height moves the floating buttons and the page's end clear of it (index.css).
  useEffect(() => {
    const root = document.documentElement;
    const el = bar.current;
    if (!open || !el) {
      root.style.removeProperty('--consent-offset');
      return;
    }
    const update = () => {
      const fixed = getComputedStyle(el).position === 'fixed';
      root.style.setProperty('--consent-offset', fixed ? `${el.offsetHeight}px` : '0px');
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      root.style.removeProperty('--consent-offset');
    };
  }, [open]);

  // The announcement clears after a few seconds, so no stray text stays outside the landmarks.
  useEffect(() => {
    if (!status) return;
    const t = window.setTimeout(() => setStatus(''), 5000);
    return () => window.clearTimeout(t);
  }, [status]);

  const choose = (choice: Choice, e: MouseEvent) => {
    const keyboard = e.detail === 0;
    const back = opener.current;
    opener.current = null;
    setOpen(false);
    const { saved } = setMarketingConsent(choice);
    setStatus(saved ? 'ההעדפה נשמרה' : 'הדפדפן חוסם שמירה, הבחירה תחול רק על הדף הזה');
    requestAnimationFrame(() => {
      if (back && back.isConnected) back.focus();
      else if (keyboard) document.getElementById('main')?.focus({ preventScroll: true });
    });
  };

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">{status}</div>
      {open && (
        <section ref={bar} className="consent-banner" role="region" aria-labelledby="consent-heading" dir="rtl" lang="he">
          <h2 id="consent-heading" ref={heading} tabIndex={-1} className="sr-only">עוגיות</h2>
          <p className="consent-text">
            {BANNER_TEXT} <a href="/privacy/#marketing">פרטים</a>
            {current && <span className="consent-current"> {CURRENT[current]}</span>}
          </p>
          <div className="consent-actions">
            <button type="button" className="consent-button" data-consent="granted" onClick={(e) => choose('granted', e)}>מאשרים</button>
            <button type="button" className="consent-button" data-consent="denied" onClick={(e) => choose('denied', e)}>לא מאשרים</button>
          </div>
        </section>
      )}
    </>
  );
}
