import Picture from './Picture';
import { useEffect, useRef, useState } from 'react';
import { GALLERY_ITEMS } from '../data/shorashimData';
export default function GallerySection() {
  const [category, setCategory] = useState('all');
  const [expanded, setExpanded] = useState(false);
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const filtered = category === 'all' ? GALLERY_ITEMS : GALLERY_ITEMS.filter(item => item.category === category);
  const visible = expanded ? filtered : filtered.slice(0, 3);
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
      <h2 className="font-serif text-4xl sm:text-5xl mb-4">לראות. להרגיש. להגיע.</h2>
      <p className="mb-6">חדר השינה, חללי הבית והחצר — הצצה לשורשים.</p>
      <div role="group" className="flex flex-wrap gap-2 mb-6" aria-label="סינון תמונות">{[['all','הכול'],['house','הבית'],['courtyard','החצר והגג'],['bride','כלה בשורשים'],['details','הפרטים והמורשת']].map(([id,label]) => <button key={id} aria-pressed={category === id} className={category === id ? 'primary-action' : 'secondary-action'} onClick={() => { setCategory(id); setExpanded(false); }}>{label}</button>)}</div>
      <div className={expanded ? "gallery-expanded" : "gallery-preview"}>{visible.map(photo => <button type="button" className="gallery-tile text-right overflow-hidden" key={photo.id} aria-label={`הגדלת התמונה: ${photo.title}`} onClick={event => { opener.current = event.currentTarget; setIndex(filtered.indexOf(photo)); }}><Picture image={photo.image} alt={photo.title} sizes="(max-width: 767px) 100vw, 40vw" className="gallery-photo w-full object-cover" /><span className="block font-serif text-2xl mt-3">{photo.title}</span></button>)}</div>
      {filtered.length > 3 && <button type="button" className="secondary-action mt-6" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? 'הצגת מבחר תמונות' : `לכל התמונות (${filtered.length})`}</button>}
    </div>
    <dialog ref={dialog} className="gallery-dialog" aria-labelledby="lightbox-title" aria-describedby="lightbox-description" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); move(1); } if (event.key === 'ArrowRight') { event.preventDefault(); move(-1); } }}>
      {item && <><div className="flex justify-between items-center gap-4 mb-4"><span aria-live="polite">תמונה {index! + 1} מתוך {filtered.length}</span><button type="button" className="secondary-action !text-white !border-white" onClick={close} autoFocus>סגירת התמונה <span aria-hidden="true">✕</span></button></div><Picture image={item.image} alt={item.title} sizes="(max-width: 1100px) 100vw, 1100px" /><h3 id="lightbox-title" className="font-serif text-2xl mt-4">{item.title}</h3><p id="lightbox-description">{item.description}</p><div className="flex justify-between gap-3 mt-4"><button type="button" className="secondary-action !text-white !border-white" onClick={() => move(-1)}>התמונה הקודמת</button><button type="button" className="secondary-action !text-white !border-white" onClick={() => move(1)}>התמונה הבאה</button></div></>}
    </dialog>
  </section>;
}


