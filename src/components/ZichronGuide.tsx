import { useRef, useState } from 'react';
import { LOCAL_PLACES } from '../data/shorashimData';
import { EditorialTag } from './RootLine';

export default function ZichronGuide() {
  const [index, setIndex] = useState(0);
  const swipeStart = useRef<number | null>(null);
  const move = (direction: number) => setIndex(old => (old + direction + LOCAL_PLACES.length) % LOCAL_PLACES.length);
  const places = Array.from({ length: Math.min(3, LOCAL_PLACES.length) }, (_, offset) => LOCAL_PLACES[(index + offset) % LOCAL_PLACES.length]);
  return (
    <section tabIndex={-1} id="zichron" className="py-12 sm:py-24 lg:py-36 bg-[#F4F0E8] relative" dir="rtl" lang="he">
      <div className="max-w-7xl mx-auto px-7 sm:px-10 lg:px-12">
        <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-[#DED5C8]">
          <EditorialTag className="mb-3 sm:mb-4 block">זכרון יעקב</EditorialTag>
          <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl text-[#1E1D1A] font-normal tracking-tight mb-3 sm:mb-4 text-right">יוצאים לגלות את המושבה</h2>
          <p className="text-sm sm:text-lg text-[#292824]/75 font-light leading-relaxed text-right">קפה של בוקר, ארוחה זוגית או דרינק בערב — כמה מקומות שכדאי להכיר בזמן החופשה בשורשים.</p>
        </div>
        <div className="places-carousel" role="region" aria-roledescription="קרוסלה" aria-label="המלצות למסעדות, בתי קפה ובילויים" onKeyDown={event => { if (event.key === 'ArrowLeft') { event.preventDefault(); move(1); } if (event.key === 'ArrowRight') { event.preventDefault(); move(-1); } }}>
          <div className="local-cards places-carousel-cards" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); swipeStart.current = event.clientX; }} onPointerUp={event => { if (swipeStart.current !== null && Math.abs(event.clientX - swipeStart.current) > 40) move(event.clientX > swipeStart.current ? 1 : -1); swipeStart.current = null; }} onPointerCancel={() => { swipeStart.current = null; }}>
            {places.map(place => <article key={place.id} className="local-card text-right"><h3 className="font-serif text-2xl text-[#1E1D1A] font-normal mb-3">{place.name}</h3><p className="text-sm text-[#292824]/75 font-light leading-relaxed">{place.description}</p></article>)}
          </div>
          <div className="gallery-carousel-controls places-carousel-controls"><button type="button" aria-label="ההמלצה הקודמת" onClick={() => move(-1)}><span aria-hidden="true">→</span></button><span aria-live="polite" aria-atomic="true">{index + 1} מתוך {LOCAL_PLACES.length}</span><button type="button" aria-label="ההמלצה הבאה" onClick={() => move(1)}><span aria-hidden="true">←</span></button></div>
        </div>
      </div>
    </section>
  );
}
