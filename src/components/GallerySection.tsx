import { useState } from 'react';
import { X, ZoomIn, Image as ImageIcon } from 'lucide-react';
import { GALLERY_ITEMS } from '../data/shorashimData';
import { GalleryItem } from '../types';
import Picture from './Picture';

export default function GallerySection() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [activeLightboxItem, setActiveLightboxItem] = useState<GalleryItem | null>(null);

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
          <span className="text-xs font-semibold tracking-wider text-[#A07044] uppercase block mb-2">
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
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
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
            <div
              key={item.id}
              onClick={() => setActiveLightboxItem(item)}
              className="group relative rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 bg-white border border-[#E8E1D5] cursor-pointer"
            >
              <div className="aspect-4/3 w-full overflow-hidden relative">
                <Picture
                  image={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white/90 backdrop-blur-xs text-[#2C2926] p-3 rounded-full shadow-md">
                    <ZoomIn className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[#8B6B48]">
                    {item.categoryLabel}
                  </span>
                </div>
                <h3 className="font-serif text-lg text-[#241E1A] font-medium mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-[#736B5F] line-clamp-2">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Lightbox Modal */}
      {activeLightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setActiveLightboxItem(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#FAF7F2] rounded-3xl overflow-hidden shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveLightboxItem(null)}
              className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
              aria-label="סגור תמונה"
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
              <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-[#8B6B48]">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{activeLightboxItem.categoryLabel}</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl text-[#241E1A] font-medium mb-2">
                {activeLightboxItem.title}
              </h3>
              <p className="text-sm text-[#635B4E]">
                {activeLightboxItem.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
