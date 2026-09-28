import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, Image as ImageIcon } from 'lucide-react';
import { GALLERY_ITEMS } from '../data/shorashimData';
import { GalleryItem } from '../types';
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
    <section id="gallery" className="py-24 bg-[#FAF7F2] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <span className="text-xs font-semibold tracking-wider text-[#89603A] uppercase block mb-2">
            06 | גלריה
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#241E1A] font-normal tracking-tight mb-4">
            לראות. להרגיש. להגיע.
          </h2>
          <p className="text-base sm:text-lg text-[#6D6457]">
            הצצה לפינות השונות של שורשים, בין השקט של החצר הירוקה לאבן החמה ולחללים המעוצבים.
          </p>
        </div>

        {/* Gallery Filter Tabs */}
        <div role="group" aria-label="סינון התמונות לפי נושא" className="flex flex-wrap items-center gap-2 sm:gap-3 mb-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#8B6B48] text-white shadow-xs'
                  : 'bg-[#EFEAE2] hover:bg-[#E5DED4] text-[#4E463A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Masonry-like Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveLightboxItem(item)}
              aria-label={`הגדלת התמונה: ${item.title}`}
              className="group relative block w-full text-right rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 bg-white border border-[#E8E1D5] cursor-pointer"
            >
              <span className="block aspect-4/3 w-full overflow-hidden relative">
                <Picture
                  image={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                />
                <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="bg-white/90 backdrop-blur-xs text-[#2C2926] p-3 rounded-full shadow-md">
                    <ZoomIn className="w-5 h-5" />
                  </span>
                </span>
              </span>

              <span className="block p-5">
                <span className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[#816342]">
                    {item.categoryLabel}
                  </span>
                </span>
                <span className="block font-serif text-lg text-[#241E1A] font-medium mb-1">
                  {item.title}
                </span>
                <span className="block text-xs text-[#6B6255] line-clamp-2">
                  {item.description}
                </span>
              </span>
            </button>
          ))}
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
        className="m-auto max-w-4xl w-[calc(100%-2rem)] p-0 bg-[#FAF7F2] rounded-3xl overflow-hidden shadow-2xl border border-white/20 backdrop:bg-black/85"
      >
        {activeLightboxItem && (
          <div className="relative">
            <button
              type="button"
              autoFocus
              onClick={closeLightbox}
              className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
              aria-label="סגירת התמונה"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="max-h-[75vh] overflow-hidden flex items-center justify-center bg-black/10">
              <Picture
                image={activeLightboxItem.image}
                alt={activeLightboxItem.title}
                className="max-h-[75vh] w-auto object-contain"
                sizes="90vw"
              />
            </div>

            <div className="p-6 bg-white">
              <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-[#816342]">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{activeLightboxItem.categoryLabel}</span>
              </div>
              <h3 id="lightbox-title" className="font-serif text-xl sm:text-2xl text-[#241E1A] font-medium mb-2">
                {activeLightboxItem.title}
              </h3>
              <p className="text-sm text-[#635B4E]">{activeLightboxItem.description}</p>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
