import { useState } from 'react';
import { Coffee, Utensils, Wine, Compass, MapPin } from 'lucide-react';
import { LOCAL_PLACES } from '../data/shorashimData';
import { RootLine, EditorialTag } from './RootLine';

export default function ZichronGuide() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'כל המקומות' },
    { id: 'coffee', label: 'קפה' },
    { id: 'food', label: 'לאכול' },
    { id: 'wine', label: 'יין' },
    { id: 'trails', label: 'לטייל' },
  ];

  const filteredPlaces =
    activeCategory === 'all'
      ? LOCAL_PLACES
      : LOCAL_PLACES.filter((p) => p.category === activeCategory);

  return (
    <section id="zichron" className="py-12 sm:py-24 lg:py-36 bg-[#F4F0E8] relative" dir="rtl" lang="he">
      <div className="max-w-7xl mx-auto px-7 sm:px-10 lg:px-12">
        
        {/* Section Header: Experiential Zichron framing */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 sm:mb-16 pb-6 sm:pb-8 border-b border-[#DED5C8]">
          <div className="w-full max-w-none md:max-w-3xl text-right">
            <EditorialTag className="mb-3 sm:mb-4 block">
              08 · זכרון יעקב
            </EditorialTag>
            
            <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl text-[#1E1D1A] font-normal tracking-tight mb-3 sm:mb-4 text-right">
              לצאת מהבית.
              <br />
              <span className="text-[#7B6045] font-light">ולהיות כבר בזכרון.</span>
            </h2>

            <p className="text-sm sm:text-lg text-[#292824]/75 font-light leading-relaxed text-right">
              משק פויזנר, המייסדים <bdi>71</bdi>, זכרון יעקב, במרחק כמה בתים מהמדרחוב ההיסטורי. יוצאים מהשקט של החצר ותוך דקת הליכה נמצאים בין בתי הקפה, המסעדות, יקבי הבוטיק ורוח הים. וכשרוצים לעצור, חוזרים לשורשים.
            </p>
          </div>

          {/* Editorial Category Selector */}
          <div role="group" aria-label="סינון לפי סוג המקום" className="mt-6 lg:mt-0 flex flex-wrap gap-2" dir="rtl">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`text-xs px-3.5 py-1.5 sm:px-4 sm:py-2 transition-all cursor-pointer font-sans tracking-wide rounded-[6px] ${
                    isActive
                      ? 'bg-[#1E1D1A] text-white'
                      : 'text-[#292824]/70 hover:text-[#1E1D1A] border border-[#DED5C8]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Editorial Unboxed Places Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
          {filteredPlaces.map((place) => (
            <div
              key={place.id}
              className="pb-8 border-b border-[#DED5C8] flex flex-col justify-between text-right"
              dir="rtl"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#7B6045] mb-2" dir="rtl">
                  <span>{place.categoryLabel}</span>
                  <span dir="rtl">{place.distance}</span>
                </div>

                <h3 className="font-serif text-2xl text-[#1E1D1A] font-normal mb-3 text-right">
                  {place.name}
                </h3>

                <p className="text-sm text-[#292824]/75 font-light leading-relaxed mb-6 text-right">
                  {place.description}
                </p>
              </div>

              {place.tip && (
                <div className="pt-4 border-t border-[#DED5C8]/50 flex items-start gap-1.5 text-xs text-[#7B6045] font-serif italic text-right" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                  <span className="shrink-0">טיפ מ{place.recommendationBy}:</span>
                  <span dir="rtl">״{place.tip}״</span>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
