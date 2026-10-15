// Scrolls to a section and moves focus there, so keyboard and screen-reader users land on it too.
export function navigateTo(id: string) {
  if (id === 'bride' && window.location.pathname.replace(/\/$/, '') !== '/bride' && window.location.hash !== '#bride-page') {
    window.location.assign('/#bride-page');
    return;
  }
  const target = document.getElementById(id);
  if (!target) { window.location.assign(`/#${id}`); return; }
  if (id === 'bride') {
    window.dispatchEvent(new Event('shorashim:show-bride'));
    if (window.location.hash !== '#bride') history.pushState(null, '', '#bride');
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
    });
    return;
  }
  if (id === 'booking') window.dispatchEvent(new Event('shorashim:open-booking'));
  if (id === 'faq') {
    window.dispatchEvent(new Event('shorashim:show-faq'));
    return;
  }
  if (window.location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
  target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
}
