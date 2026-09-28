import { Fragment, type ReactNode } from 'react';
import AccessibilityMenu from '../components/AccessibilityMenu';
import { DOCS, type Lang, type PageId } from './content';

const PAGES: PageId[] = ['terms', 'privacy', 'accessibility'];

const NAV = {
  he: { home: 'לדף הבית', skip: 'דלגו לתוכן העיקרי', other: 'English', nav: 'ניווט', pages: 'מסמכים', rights: 'כל הזכויות שמורות © שורשים' },
  en: { home: 'Home', skip: 'Skip to main content', other: 'עברית', nav: 'Navigation', pages: 'Documents', rights: 'All rights reserved © Shorashim' },
};

export const pagePath = (page: PageId, lang: Lang) => (lang === 'he' ? `/${page}/` : `/en/${page}/`);

/** Turns URLs, email addresses and phone numbers in plain text into links. */
function linkify(text: string): ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.]+|\+?972-?\d{2}-?\d{3}-?\d{4}|0\d{2}-\d{3}-\d{4})/g);
  return parts.map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    const href = part.startsWith('http') ? part : part.includes('@') ? `mailto:${part}` : `tel:${part.replace(/[^\d+]/g, '')}`;
    return (
      <a key={i} href={href} dir="ltr" className="underline text-[#6E4F2E] break-all">
        {part.replace(/^https:\/\/shorashimstay\.com/, 'shorashimstay.com')}
      </a>
    );
  });
}

export default function LegalPage({ page, lang }: { page: PageId; lang: Lang }) {
  const doc = DOCS[page][lang];
  const t = NAV[lang];
  const otherLang: Lang = lang === 'he' ? 'en' : 'he';

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C2926]">
      <a href="#main" className="skip-link">
        {t.skip}
      </a>

      <header className="border-b border-[#E8E1D7] bg-[#FAF7F2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <a href="/" className="flex flex-col" aria-label={`${lang === 'he' ? 'שורשים' : 'Shorashim'} – ${t.home}`}>
            <span className="font-serif text-2xl font-medium">{lang === 'he' ? 'שורשים' : 'Shorashim'}</span>
            <span className="text-xs text-[#6B6255]">{lang === 'he' ? 'מקום להתחבר אליו' : 'Boutique stay in Zichron Ya’akov'}</span>
          </a>
          <nav aria-label={t.nav} className="flex items-center gap-4 text-sm">
            <a href="/" className="underline text-[#6E4F2E]">
              {t.home}
            </a>
            <a href={pagePath(page, otherLang)} lang={otherLang} hrefLang={otherLang} className="underline text-[#6E4F2E]">
              {t.other}
            </a>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="outline-none max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="font-serif text-3xl sm:text-4xl font-medium mb-2">{doc.title}</h1>
        <p className="text-sm text-[#6B6255] mb-8">{doc.updated}</p>
        <p className="text-base leading-relaxed mb-10">{linkify(doc.intro)}</p>

        {doc.sections.map((section) => (
          <section key={section.heading} className="mb-9">
            <h2 className="font-serif text-2xl font-medium mb-3">{section.heading}</h2>
            {section.body.map((item, i) =>
              typeof item === 'string' ? (
                <p key={i} className="text-base leading-relaxed mb-3">
                  {linkify(item)}
                </p>
              ) : (
                <ul key={i} className="list-disc ps-6 space-y-1.5 mb-3 text-base leading-relaxed">
                  {item.map((li) => (
                    <li key={li}>{linkify(li)}</li>
                  ))}
                </ul>
              )
            )}
          </section>
        ))}
      </main>

      <footer className="border-t border-[#E8E1D7] bg-[#F5EFE6]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row gap-4 justify-between text-sm">
          <nav aria-label={t.pages}>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {PAGES.map((p) => (
                <li key={p}>
                  <a href={pagePath(p, lang)} aria-current={p === page ? 'page' : undefined} className="underline text-[#6E4F2E]">
                    {DOCS[p][lang].title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-[#5C5549]">{t.rights}</p>
        </div>
      </footer>

      <AccessibilityMenu lang={lang} />
    </div>
  );
}
