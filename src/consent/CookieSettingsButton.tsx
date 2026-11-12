// "הגדרות עוגיות": reopens the cookie banner, so withdrawing is as easy as accepting (GDPR art. 7(3)).
// The footer must keep it (scripts/design-contract.mjs checks).
import { openConsentSettings } from '../lib/consent';

export default function CookieSettingsButton({ className = '' }: { className?: string }) {
  return (
    <button type="button" className={`cookie-settings-button ${className}`} onClick={(e) => openConsentSettings(e.currentTarget)}>
      הגדרות עוגיות
    </button>
  );
}
