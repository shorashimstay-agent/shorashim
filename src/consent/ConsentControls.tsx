// The privacy page's own accept/decline controls. No tool ever runs on the legal pages: accepting here
// only saves the choice (the tools start on the next main-page visit); declining deletes the tools'
// cookies at once.
import { useEffect, useState } from 'react';
import { canStoreChoice, getMarketingConsent, onConsentChange, setMarketingConsent, type Choice } from '../lib/consent';
import type { Lang } from '../legal/content';
import './consent.css';

const T = {
  he: {
    current: { granted: 'הבחירה הנוכחית: מאשרים', denied: 'הבחירה הנוכחית: לא מאשרים', none: 'עדיין לא בחרתם.' },
    accept: 'מאשרים',
    decline: 'לא מאשרים',
    saved: 'ההעדפה נשמרה',
    blocked: 'הדפדפן חוסם שמירה, הבחירה לא תישמר.',
    label: 'הגדרות עוגיות',
  },
  en: {
    current: { granted: 'Current choice: Accept', denied: 'Current choice: Decline', none: 'You have not chosen yet.' },
    accept: 'Accept',
    decline: 'Decline',
    saved: 'Your choice was saved',
    blocked: 'Your browser blocks saving, so the choice won’t be kept.',
    label: 'Cookie settings',
  },
};

export default function ConsentControls({ lang = 'he' }: { lang?: Lang }) {
  const t = T[lang];
  const [choice, setChoice] = useState<Choice | null>(() => getMarketingConsent());
  const [storable] = useState(canStoreChoice);
  const [status, setStatus] = useState('');

  useEffect(() => onConsentChange((c) => setChoice(c)), []);
  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(''), 5000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const choose = (c: Choice) => {
    setMarketingConsent(c);
    setChoice(c);
    setStatus(storable ? t.saved : t.blocked);
  };

  return (
    <div className="consent-controls" role="group" aria-label={t.label}>
      <p>{choice ? t.current[choice] : t.current.none}</p>
      {!storable && <p>{t.blocked}</p>}
      <div className="consent-actions">
        <button type="button" className="consent-button" data-consent="granted" onClick={() => choose('granted')}>{t.accept}</button>
        <button type="button" className="consent-button" data-consent="denied" onClick={() => choose('denied')}>{t.decline}</button>
      </div>
      <div role="status" aria-live="polite" className="sr-only">{status}</div>
    </div>
  );
}
