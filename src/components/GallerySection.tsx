import Picture from './Picture';
import { useEffect, useRef, useState } from 'react';
import { GALLERY_ITEMS } from '../data/shorashimData';
export default function GallerySection() {
  const [slide, setSlide] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const carousel = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<number | null>(null);
  const swiped = useRef(false);
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const filtered = GALLERY_ITEMS;
  const current = filtered[slide];
  const next = filtered[(slide + 1) % filtered.length];
  const moveSlide = (direction: number) => {
    setPlaying(false);
    setSlide(old => (old + direction + filtered.length) % filtered.length);
  };
  const item = index === null ? null : filtered[index];
  const close = () => { dialog.current?.close(); setIndex(null); opener.current?.focus(); };
  const move = (direction: number) => setIndex(old => old === null ? null : (old + direction + filtered.length) % filtered.length);
  useEffect(() => {
    if (!inView) return;
    const preload = new Image();
    preload.sizes = '(max-width: 767px) 85vw, 900px';
    preload.srcset = next.image.avif;
    preload.src = next.image.fallback;
  }, [slide, inView]);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    if (carousel.current) observer.observe(carousel.current);
    const onVisibility = () => setPageVisible(!document.hidden);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => { if (motion.matches) setPlaying(false); };
    document.addEventListener('visibilitychange', onVisibility);
    motion.addEventListener('change', onMotion);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      motion.removeEventListener('change', onMotion);
    };
  }, []);
  useEffect(() => {
    if (!playing || hovered || !inView || !pageVisible || index !== null) return;
    const timer = window.setInterval(() => setSlide(old => (old + 1) % GALLERY_ITEMS.length), 8000);
    return () => window.clearInterval(timer);
  }, [playing, hovered, inView, pageVisible, index !== null]);
  useEffect(() => {
    if (index === null) return;
    dialog.current?.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = oldOverflow; };
  }, [index !== null]);
  return <section id="gallery" tabIndex={-1} className="py-12 sm:py-24 bg-[#DED5C8]/30">
    <div className="max-w-7xl mx-auto px-6 sm:px-10">
      <h2 className="font-serif text-4xl sm:text-5xl mb-4 text-center">מבט אל שורשים</h2>
      <p className="mb-6 text-center">חדרי הסוויטה, החצר והרגעים הקטנים שביניהם</p>
      <div ref={carousel} className="gallery-carousel" role="region" aria-roledescription="קרוסלה" aria-label="תמונות שורשים" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={event => { if (!(event.target as HTMLElement).closest('[data-autoplay]')) setPlaying(false); }} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); moveSlide(1); } if (event.key === 'ArrowRight') { event.preventDefault(); moveSlide(-1); } }}>
        <div className="gallery-carousel-stage">
          <button type="button" className="gallery-carousel-main" aria-label={`הגדלת התמונה: ${current.title}`} onDragStart={event => event.preventDefault()} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); swipeStart.current = event.clientX; swiped.current = false; }} onPointerUp={event => { if (swipeStart.current !== null && Math.abs(event.clientX - swipeStart.current) > 40) { swiped.current = true; moveSlide(event.clientX > swipeStart.current ? 1 : -1); } swipeStart.current = null; }} onPointerCancel={() => { swipeStart.current = null; }} onClick={event => { if (swiped.current) { swiped.current = false; return; } opener.current = event.currentTarget; setIndex(slide); }}>
            <span key={current.id} className="gallery-carousel-frame"><Picture image={current.image} alt={current.description} sizes="(max-width: 767px) 85vw, 900px" /></span>
          </button>
          <button type="button" className="gallery-carousel-peek" aria-label={`התמונה הבאה: ${next.title}`} onClick={() => moveSlide(1)}><Picture image={next.image} alt="" sizes="80px" /></button>
        </div>
        <div className="gallery-carousel-footer">
          <div><h3 className="font-serif text-2xl mb-1">{current.title}</h3><p>{current.description}</p></div>
          <div className="gallery-carousel-controls"><button type="button" data-autoplay className="gallery-autoplay" aria-pressed={!playing} aria-label={playing ? 'עצירת החלפת התמונות האוטומטית' : 'הפעלת החלפת התמונות האוטומטית'} onClick={() => setPlaying(old => !old)}>{playing ? 'עצירה' : 'המשך'}</button><button type="button" aria-label="התמונה הקודמת" onClick={() => moveSlide(-1)}><span aria-hidden="true">→</span></button><span aria-live={playing ? 'off' : 'polite'} aria-atomic="true">{slide + 1} מתוך {filtered.length}</span><button type="button" aria-label="התמונה הבאה" onClick={() => moveSlide(1)}><span aria-hidden="true">←</span></button></div>
        </div>
      </div>
    </div>
    <dialog ref={dialog} className="gallery-dialog" aria-labelledby="lightbox-title" aria-describedby="lightbox-description" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); move(1); } if (event.key === 'ArrowRight') { event.preventDefault(); move(-1); } }}>
      {item && <><div className="flex justify-between items-center gap-4 mb-4"><span aria-live="polite">תמונה {index! + 1} מתוך {filtered.length}</span><button type="button" className="secondary-action !text-white !border-white" onClick={close} autoFocus>סגירת התמונה <span aria-hidden="true">✕</span></button></div><Picture image={item.image} alt={item.title} sizes="(max-width: 1100px) 100vw, 1100px" /><h3 id="lightbox-title" className="font-serif text-2xl mt-4">{item.title}</h3><p id="lightbox-description">{item.description}</p><div className="flex justify-between gap-3 mt-4"><button type="button" className="secondary-action !text-white !border-white" onClick={() => move(-1)}>התמונה הקודמת</button><button type="button" className="secondary-action !text-white !border-white" onClick={() => move(1)}>התמונה הבאה</button></div></>}
    </dialog>
  </section>;
}


