import { useEffect, useRef, useState } from 'react';
import { Accessibility, X } from 'lucide-react';
import { type A11yPref, applyPrefs, loadPrefs } from '../lib/a11yPrefs';

interface Option {
  pref: A11yPref;
  he: string;
  en: string;
}

const OPTIONS: Option[] = [
  { pref: 'textLarge', he: 'הגדלת טקסט', en: 'Larger text' },
  { pref: 'textLarger', he: 'הגדלת טקסט נוספת', en: 'Largest text' },
  { pref: 'contrast', he: 'ניגודיות גבוהה', en: 'High contrast' },
  { pref: 'links', he: 'הדגשת קישורים', en: 'Highlight links' },
  { pref: 'readableFont', he: 'גופן קריא', en: 'Readable font' },
  { pref: 'noMotion', he: 'עצירת אנימציות', en: 'Stop animations' },
];

const TEXT = {
  he: {
    open: 'תפריט נגישות',
    title: 'התאמות נגישות',
    close: 'סגירת תפריט הנגישות',
    reset: 'איפוס ההתאמות',
    statement: 'הצהרת הנגישות',
    statementHref: '/accessibility/',
  },
  en: {
    open: 'Accessibility menu',
    title: 'Accessibility adjustments',
    close: 'Close the accessibility menu',
    reset: 'Reset adjustments',
    statement: 'Accessibility statement',
    statementHref: '/en/accessibility/',
  },
};

/** The site's own accessibility menu: a button that opens a native modal dialog of display options. */
export default function AccessibilityMenu({ lang = 'he' }: { lang?: 'he' | 'en' }) {
  const [prefs, setPrefs] = useState<Set<A11yPref>>(loadPrefs);
  const dialog = useRef<HTMLDialogElement>(null);
  const t = TEXT[lang];

  useEffect(() => applyPrefs(prefs), [prefs]);

  const toggle = (pref: A11yPref) =>
    setPrefs((current) => {
      const next = new Set(current);
      if (next.has(pref)) next.delete(pref);
      else {
        next.add(pref);
        // The two text sizes are alternatives.
        if (pref === 'textLarge') next.delete('textLarger');
        if (pref === 'textLarger') next.delete('textLarge');
      }
      return next;
    });

  return (
    <>
      <button
        type="button"
        id="accessibility-menu-btn"
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
        aria-label={t.open}
        title={t.open}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-[#1F3A5F] hover:bg-[#162B47] text-white shadow-xl cursor-pointer"
      >
        <Accessibility className="w-6 h-6" />
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="a11y-menu-title"
        dir={lang === 'he' ? 'rtl' : 'ltr'}
        onClick={(e) => {
          // A click on the backdrop lands on the dialog element itself.
          if (e.target === dialog.current) dialog.current.close();
        }}
        className="m-auto w-[min(92vw,380px)] rounded-3xl p-0 bg-white text-[#2C2926] shadow-2xl backdrop:bg-black/50"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 id="a11y-menu-title" className="font-serif text-xl font-medium">
              {t.title}
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label={t.close}
              className="p-2 rounded-full hover:bg-[#F0EAE1] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {OPTIONS.map((o) => {
              const on = prefs.has(o.pref);
              return (
                <button
                  key={o.pref}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(o.pref)}
                  className={`py-3 px-3 rounded-2xl border text-sm font-medium text-center cursor-pointer ${
                    on ? 'bg-[#1F3A5F] border-[#1F3A5F] text-white' : 'bg-[#FAF8F5] border-[#D9CFBF] text-[#2C2926] hover:bg-[#F0EAE1]'
                  }`}
                >
                  {o[lang]}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <button type="button" onClick={() => setPrefs(new Set())} className="underline text-[#1F3A5F] cursor-pointer">
              {t.reset}
            </button>
            <a href={t.statementHref} className="underline text-[#1F3A5F]">
              {t.statement}
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
