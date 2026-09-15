import { RECAPTCHA_SITE_KEY } from '../data/bookingConfig';

declare global {
  interface Window {
    grecaptcha?: {
      ready(callback: () => void): void;
      execute(siteKey: string, options: { action: string }): Promise<string>;
    };
  }
}

let loading: Promise<void> | null = null;

function loadRecaptcha(): Promise<void> {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.onload = () => window.grecaptcha!.ready(resolve);
    script.onerror = () => {
      loading = null;
      reject(new Error('reCAPTCHA failed to load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** A reCAPTCHA v3 token for `action`, or '' when no site key is configured. */
export async function recaptchaToken(action: string): Promise<string> {
  if (!RECAPTCHA_SITE_KEY) return '';
  await loadRecaptcha();
  return window.grecaptcha!.execute(RECAPTCHA_SITE_KEY, { action });
}
