import Picture from './Picture';
import { useEffect, useRef, useState } from 'react';
import { GALLERY_ITEMS } from '../data/shorashimData';
export default function GallerySection() {
  const [category, setCategory] = useState('all');
  const [slide, setSlide] = useState(0);
  const swipeStart = useRef<number | null>(null);
  const swiped = useRef(false);
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const filtered = category === 'all' ? GALLERY_ITEMS : GALLERY_ITEMS.filter(item => item.category === category);
  const current = filtered[slide];
  const next = filtered[(slide + 1) % filtered.length];
  const moveSlide = (direction: number) => setSlide(old => (old + direction + filtered.length) % filtered.length);
  const item = index === null ? null : filtered[index];
  const close = () => { dialog.current?.close(); setIndex(null); opener.current?.focus(); };
  const move = (direction: number) => setIndex(old => old === null ? null : (old + direction + filtered.length) % filtered.length);
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
      <div role="group" className="flex flex-wrap gap-2 mb-6" aria-label="סינון תמונות">{[['all','הכול'],['house','הבית'],['courtyard','החצר והגג'],['bride','כלה בשורשים'],['details','הפרטים והמורשת']].map(([id,label]) => <button key={id} aria-pressed={category === id} className={category === id ? 'primary-action' : 'secondary-action'} onClick={() => { setCategory(id); setSlide(0); }}>{label}</button>)}</div>
      <div className="gallery-carousel" role="region" aria-roledescription="קרוסלה" aria-label="תמונות שורשים" onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); moveSlide(1); } if (event.key === 'ArrowRight') { event.preventDefault(); moveSlide(-1); } }}>
        <div className="gallery-carousel-stage">
          <button type="button" className="gallery-carousel-main" aria-label={`הגדלת התמונה: ${current.title}`} onDragStart={event => event.preventDefault()} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); swipeStart.current = event.clientX; swiped.current = false; }} onPointerUp={event => { if (swipeStart.current !== null && Math.abs(event.clientX - swipeStart.current) > 40) { swiped.current = true; moveSlide(event.clientX > swipeStart.current ? 1 : -1); } swipeStart.current = null; }} onPointerCancel={() => { swipeStart.current = null; }} onClick={event => { if (swiped.current) { swiped.current = false; return; } opener.current = event.currentTarget; setIndex(slide); }}>
            <Picture image={current.image} alt={current.description} sizes="(max-width: 767px) 85vw, 900px" />
          </button>
          <button type="button" className="gallery-carousel-peek" aria-label={`התמונה הבאה: ${next.title}`} onClick={() => moveSlide(1)}><Picture image={next.image} alt="" sizes="80px" /></button>
        </div>
        <div className="gallery-carousel-footer">
          <div><h3 className="font-serif text-2xl mb-1">{current.title}</h3><p>{current.description}</p></div>
          <div className="gallery-carousel-controls"><button type="button" aria-label="התמונה הקודמת" onClick={() => moveSlide(-1)}><span aria-hidden="true">→</span></button><span aria-live="polite" aria-atomic="true">{slide + 1} מתוך {filtered.length}</span><button type="button" aria-label="התמונה הבאה" onClick={() => moveSlide(1)}><span aria-hidden="true">←</span></button></div>
        </div>
      </div>
    </div>
    <dialog ref={dialog} className="gallery-dialog" aria-labelledby="lightbox-title" aria-describedby="lightbox-description" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); move(1); } if (event.key === 'ArrowRight') { event.preventDefault(); move(-1); } }}>
      {item && <><div className="flex justify-between items-center gap-4 mb-4"><span aria-live="polite">תמונה {index! + 1} מתוך {filtered.length}</span><button type="button" className="secondary-action !text-white !border-white" onClick={close} autoFocus>סגירת התמונה <span aria-hidden="true">✕</span></button></div><Picture image={item.image} alt={item.title} sizes="(max-width: 1100px) 100vw, 1100px" /><h3 id="lightbox-title" className="font-serif text-2xl mt-4">{item.title}</h3><p id="lightbox-description">{item.description}</p><div className="flex justify-between gap-3 mt-4"><button type="button" className="secondary-action !text-white !border-white" onClick={() => move(-1)}>התמונה הקודמת</button><button type="button" className="secondary-action !text-white !border-white" onClick={() => move(1)}>התמונה הבאה</button></div></>}
    </dialog>
  </section>;
}


