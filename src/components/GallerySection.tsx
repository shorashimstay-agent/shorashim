import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { GALLERY_ITEMS } from '../data/shorashimData';
import { GalleryItem } from '../types';
import { EditorialTag } from './RootLine';
import Picture from './Picture';

export default function GallerySection() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [activeLightboxItem, setActiveLightboxItem] = useState<GalleryItem | null>(null);
  const lightbox = useRef<HTMLDialogElement>(null);

  // A native modal dialog: Escape closes it, focus stays inside, and it returns to the photo after.
  useEffect(() => {
    const d = lightbox.current;
    if (activeLightboxItem && d && !d.open) d.showModal();
  }, [activeLightboxItem]);
  const closeLightbox = () => lightbox.current?.close();

  const tabs = [
    { id: 'all', label: 'הכול' },
    { id: 'house', label: 'הבית' },
    { id: 'courtyard', label: 'החצר והגג' },
    { id: 'bride', label: 'כלה בשורשים' },
    { id: 'details', label: 'הפרטים והמורשת' },
  ];

  const filteredItems =
    activeTab === 'all'
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === activeTab);

  return (
    <section id="gallery" className="py-12 sm:py-24 lg:py-36 bg-[#DED5C8]/30 relative" dir="rtl" lang="he">
      <div className="max-w-7xl mx-auto px-7 sm:px-10 lg:px-12">
        
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 sm:mb-16 pb-6 sm:pb-8 border-b border-[#DED5C8]">
          <div className="w-full max-w-none md:max-w-2xl text-right">
            <EditorialTag className="mb-3 sm:mb-4 block">
              09 · גלריה
            </EditorialTag>
            <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl text-[#1E1D1A] font-normal tracking-tight mb-3 sm:mb-4 text-right">
              לראות. להרגיש. להגיע.
            </h2>
            <p className="text-sm sm:text-lg text-[#292824]/75 font-light text-right">
              הצצה לפינות השונות של שורשים, בין השקט של החצר הירוקה לאבן החמה ולחללים המעוצבים.
            </p>
          </div>

          {/* Curated Editorial Filter */}
          <div role="group" aria-label="סינון התמונות לפי נושא" className="mt-6 lg:mt-0 flex flex-wrap gap-2" dir="rtl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-xs px-3.5 py-1.5 sm:px-4 sm:py-2 transition-all cursor-pointer font-sans tracking-wide rounded-[6px] ${
                  activeTab === tab.id
                    ? 'bg-[#1E1D1A] text-white'
                    : 'text-[#292824]/70 hover:text-[#1E1D1A] border border-[#DED5C8]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 09 — CURATED EDITORIAL GALLERY: Mixed scales and aspect ratios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5 sm:gap-8 items-start">
          {filteredItems.map((item, idx) => {
            // Assign varying spans and aspect ratios for rhythmic editorial layout
            const spanClass =
              idx === 0
                ? 'lg:col-span-8 aspect-[16/11]'
                : idx === 1
                ? 'lg:col-span-4 aspect-[4/5]'
                : idx === 2
                ? 'lg:col-span-4 aspect-[4/5]'
                : idx === 3
                ? 'lg:col-span-4 aspect-[1/1]'
                : idx === 4
                ? 'lg:col-span-4 aspect-[4/5]'
                : 'lg:col-span-6 aspect-[16/10]';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveLightboxItem(item)}
                aria-label={`הגדלת התמונה: ${item.title}`}
                className={`${spanClass} block w-full text-right overflow-hidden bg-[#292824] group cursor-pointer relative shadow-[0_2px_15px_rgba(30,29,26,0.04)]`}
              >
                <Picture
                  image={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover brightness-[0.98] group-hover:scale-103 transition-transform duration-700 ease-out"
                  sizes="(min-width: 1024px) 66vw, (min-width: 640px) 50vw, 100vw"
                />

                {/* Subtle, restrained hover overlay with editorial caption */}
                <span className="absolute inset-0 bg-gradient-to-t from-[#1E1D1A]/85 via-[#1E1D1A]/20 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 p-6 flex flex-col justify-end text-white text-right" dir="rtl">
                  <span className="text-[10px] font-mono tracking-widest text-[#DED5C8]/80 mb-1 text-right">
                    {item.categoryLabel}
                  </span>
                  <span className="block font-serif text-xl font-normal text-right">
                    {item.title}
                  </span>
                  <span className="block text-xs text-[#DED5C8]/90 font-light mt-1 line-clamp-2 text-right">
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* Lightbox: a native modal dialog */}
      <dialog
        ref={lightbox}
        aria-labelledby="lightbox-title"
        onClose={() => setActiveLightboxItem(null)}
        onClick={(e) => {
          if (e.target === lightbox.current) closeLightbox();
        }}
        className="fixed inset-0 m-0 w-full h-full max-w-none max-h-none bg-[#1E1D1A]/95 backdrop:bg-transparent p-6 sm:p-12 open:flex items-center justify-center"
      >
        {activeLightboxItem && (
          <>
            <button
              type="button"
              autoFocus
              onClick={closeLightbox}
              className="absolute top-6 right-6 text-white/70 hover:text-white p-2 transition-colors cursor-pointer"
              aria-label="סגירת התמונה"
            >
              <X className="w-7 h-7" />
            </button>

            <div className="max-w-4xl max-h-[88vh] flex flex-col items-center">
              <Picture
                image={activeLightboxItem.image}
                alt={activeLightboxItem.title}
                className="max-h-[72vh] w-auto object-contain border border-white/10"
                sizes="90vw"
              />
              <div className="mt-4 text-center text-white">
                <span className="text-xs font-mono text-[#DED5C8]/80 block mb-1">
                  {activeLightboxItem.categoryLabel}
                </span>
                <h3 id="lightbox-title" className="font-serif text-2xl font-normal">
                  {activeLightboxItem.title}
                </h3>
                <p className="text-sm text-[#DED5C8]/80 max-w-lg mt-1 font-light">
                  {activeLightboxItem.description}
                </p>
              </div>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
