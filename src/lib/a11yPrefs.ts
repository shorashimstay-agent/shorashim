// Visitor accessibility preferences (the accessibility menu). Each one is a class on <html>, and
// src/index.css implements it; they are saved per browser so they survive reloads and page changes.

export type A11yPref = 'textLarge' | 'textLarger' | 'contrast' | 'links' | 'readableFont' | 'noMotion';

export const A11Y_CLASSES: Record<A11yPref, string> = {
  textLarge: 'a11y-text-lg',
  textLarger: 'a11y-text-xl',
  contrast: 'a11y-contrast',
  links: 'a11y-links',
  readableFont: 'a11y-readable-font',
  noMotion: 'a11y-no-motion',
};

const STORAGE_KEY = 'shorashim:a11y';

export function loadPrefs(): Set<A11yPref> {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[];
    return new Set(saved.filter((p): p is A11yPref => p in A11Y_CLASSES));
  } catch {
    return new Set();
  }
}

export function applyPrefs(prefs: Set<A11yPref>): void {
  const root = document.documentElement;
  (Object.keys(A11Y_CLASSES) as A11yPref[]).forEach((p) => root.classList.toggle(A11Y_CLASSES[p], prefs.has(p)));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...prefs]));
  } catch {
    // Storage can be blocked; the preferences still apply to this page.
  }
}
