import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      setVisible(window.scrollY > 500);
      setProgress(distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, []);

  const returnToTop = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.classList.contains('a11y-no-motion');
    window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' });
    document.getElementById('main')?.focus({ preventScroll: true });
  };

  if (!visible) return null;
  return <button type="button" className="back-to-top" onClick={returnToTop} aria-label="חזרה לראש העמוד" title="חזרה לראש העמוד">
    <svg className="top-progress-ring" viewBox="0 0 56 56" aria-hidden="true">
      <circle className="top-progress-track" cx="28" cy="28" r="24" />
      <circle className="top-progress-value" cx="28" cy="28" r="24" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - progress * 100} />
    </svg>
    <ArrowUp size={21} aria-hidden="true" />
  </button>;
}
