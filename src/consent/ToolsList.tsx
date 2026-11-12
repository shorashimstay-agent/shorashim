// The privacy policy's "tools we use now" list, drawn from the registry (tools.ts), so it always
// matches what the site actually loads.
import type { Lang } from '../legal/content';
import { MARKETING_TOOLS, type ToolUse } from './tools';

const T = {
  he: {
    provider: 'ספק',
    use: 'שימוש',
    uses: { site: 'כלים באתר', lists: 'רשימות לקוחות', both: 'כלים באתר ורשימות לקוחות' },
    cookies: 'עוגיות',
    platformDomain: 'נשמרת בדומיין של הפלטפורמה',
    policy: 'מדיניות הפרטיות',
    settings: 'הגדרות מודעות',
    terms: 'עיקרי ההסדר בין האחראים למידע',
  },
  en: {
    provider: 'Provider',
    use: 'Use',
    uses: { site: 'tools on the site', lists: 'customer lists', both: 'tools on the site and customer lists' },
    cookies: 'Cookies',
    platformDomain: 'stored on the platform’s domain',
    policy: 'Privacy policy',
    settings: 'Ad settings',
    terms: 'Essence of the joint-controller arrangement',
  },
};

const useLabel = (uses: ToolUse[], t: (typeof T)['he']) =>
  uses.includes('site') && uses.includes('lists') ? t.uses.both : uses.includes('lists') ? t.uses.lists : t.uses.site;

export default function ToolsList({ lang }: { lang: Lang }) {
  const t = T[lang];
  return (
    <ul className="list-disc ps-6 space-y-3 mb-3 text-base leading-relaxed" data-testid="marketing-tools">
      {MARKETING_TOOLS.map((tool) => (
        <li key={tool.id} data-tool={tool.id}>
          <strong>{tool.name[lang]}</strong>
          <br />
          {t.provider}: <span dir="ltr">{tool.provider}</span>
          <br />
          {t.use}: {useLabel(tool.uses, t)}
          {tool.cookies.length > 0 && (
            <>
              <br />
              {t.cookies}:{' '}
              {tool.cookies.map((c, i) => (
                <span key={c.name}>
                  {i > 0 && '; '}
                  <code dir="ltr">{c.name}</code> ({c.lifetime[lang]}
                  {!c.firstParty && `, ${t.platformDomain}`})
                </span>
              ))}
            </>
          )}
          <br />
          <a href={tool.policyUrl} className="underline text-[#6E4F2E]" target="_blank" rel="noopener noreferrer">{t.policy}</a>
          {' · '}
          <a href={tool.adSettingsUrl} className="underline text-[#6E4F2E]" target="_blank" rel="noopener noreferrer">{t.settings}</a>
          {' · '}
          <a href={tool.controllerTermsUrl} className="underline text-[#6E4F2E]" target="_blank" rel="noopener noreferrer">{t.terms}</a>
        </li>
      ))}
    </ul>
  );
}
