// The marketing tools the site uses: data only, no loaders (src/lib/marketingLoaders.ts maps each
// site tool's id to its loader, and only App imports that). The privacy page renders its "tools we
// use now" list from here, and the consent layer deletes the first-party cookies listed here.
//
// Adding a tool:
// - a site tool (uses 'site'): one entry here, a loader in marketingLoaders.ts, a CONSENT_VERSION
//   bump in shared/consentRules.js (re-asks everyone) and the policy's UPDATED date (content.ts);
// - a list-only recipient (uses 'lists', customer-list uploads): one entry and the UPDATED date.
// The policy's prose is generic (advertising platforms; pages and actions on the site; cookies and
// device identifiers; measuring, improving and tailoring ads). It needs an edit, and an independent
// legal-review round, when a tool goes beyond that: sending details the visitor typed (email or
// phone: Advanced Matching, Conversions API, customer lists), session recording or heatmaps, a new
// purpose, or a category that isn't advertising (e.g. analytics).
import type { Lang } from '../legal/content';

export type ToolUse = 'site' | 'lists';

export interface ToolCookie {
  name: string;
  /** How long it stays, as the policy shows it. */
  lifetime: Record<Lang, string>;
  /** Set on our domain (the consent layer deletes it on withdrawal), or on the platform's own. */
  firstParty: boolean;
}

export interface MarketingTool {
  id: string;
  /** The short brand name, used inside sentences ("including Meta"). */
  brand: string;
  name: Record<Lang, string>;
  provider: string;
  uses: ToolUse[];
  cookies: ToolCookie[];
  policyUrl: string;
  adSettingsUrl: string;
  /** The essence of the joint-controller arrangement (GDPR art. 26(2)). */
  controllerTermsUrl: string;
}

const NINETY_DAYS = { he: 'עד 90 יום', en: 'up to 90 days' };

export const MARKETING_TOOLS: MarketingTool[] = [
  {
    id: 'meta',
    brand: 'Meta',
    name: { he: 'Meta (פייסבוק ואינסטגרם)', en: 'Meta (Facebook and Instagram)' },
    provider: 'Meta Platforms Ireland Ltd. (EU/EEA) / Meta Platforms, Inc.',
    uses: ['site'],
    cookies: [
      { name: '_fbp', lifetime: NINETY_DAYS, firstParty: true },
      { name: '_fbc', lifetime: NINETY_DAYS, firstParty: true },
      { name: 'fr', lifetime: NINETY_DAYS, firstParty: false },
    ],
    policyUrl: 'https://www.facebook.com/privacy/policy',
    adSettingsUrl: 'https://www.facebook.com/adpreferences',
    controllerTermsUrl: 'https://www.facebook.com/legal/controller_addendum',
  },
];

export const SITE_TOOLS = MARKETING_TOOLS.filter((t) => t.uses.includes('site'));

/** The first-party cookies of every site tool: what withdrawing deletes. */
export const SITE_TOOL_COOKIES = SITE_TOOLS.flatMap((t) => t.cookies.filter((c) => c.firstParty).map((c) => c.name));
