import { useState } from 'react';
import { Coffee, Utensils, Wine, Compass, MapPin, Quote } from 'lucide-react';
import { LOCAL_PLACES } from '../data/shorashimData';

export default function ZichronGuide() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'כל ההמלצות', icon: null },
    { id: 'coffee', label: 'קפה', icon: Coffee },
    { id: 'food', label: 'לאכול', icon: Utensils },
    { id: 'wine', label: 'יין', icon: Wine },
    { id: 'trails', label: 'לטייל', icon: Compass },
  ];

  const filteredPlaces =
    activeCategory === 'all'
      ? LOCAL_PLACES
      : LOCAL_PLACES.filter((p) => p.category === activeCategory);

  return (
    <section id="zichron" className="py-24 bg-[#F5EFE6] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <span className="text-xs font-semibold tracking-wider text-[#A07044] uppercase block mb-2">
            05 | זכרון שלנו
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#241E1A] font-normal tracking-tight mb-4">
            המקומות שאנחנו באמת אוהבים
          </h2>
          <p className="text-base sm:text-lg text-[#6D6457] leading-relaxed">
            לא רצינו להכין לכם עוד מדריך תיירים לזכרון יעקב. אנחנו מעדיפים לספר לכם איפה אנחנו שותים קפה,
            איפה כדאי לאכול, איזה יין אנחנו אוהבים, לאן לצאת לטיול ואיפה נמצאות הפינות שאנחנו מכירים מאז שהיינו ילדים.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-12">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#8B6B48] text-white shadow-xs'
                    : 'bg-white/80 hover:bg-white text-[#4D4539] border border-[#E0D5C5]'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Places Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlaces.map((place) => (
            <div
              key={place.id}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E5DCD0] shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs px-3 py-1 rounded-full bg-[#F3ECE0] text-[#8B6B48] font-semibold">
                    {place.categoryLabel}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-[#7A7163]">
                    <MapPin className="w-3.5 h-3.5 text-[#8B6B48]" />
                    <span>{place.distance}</span>
                  </div>
                </div>

                <h3 className="font-serif text-xl text-[#241E1A] font-medium mb-3">
                  {place.name}
                </h3>

                <p className="text-sm text-[#5C5448] leading-relaxed mb-5">
                  {place.description}
                </p>
              </div>

              {/* Personal Quote by Sari or Yoav */}
              <div className="pt-4 border-t border-[#F0E8DD] bg-[#FAF8F5] -mx-6 -mb-6 p-5 rounded-b-3xl mt-2">
                <div className="flex items-start gap-2.5">
                  <Quote className="w-4 h-4 text-[#8B6B48] shrink-0 mt-1 rotate-180" />
                  <div className="text-xs sm:text-sm text-[#453D32] leading-relaxed">
                    <span className="font-semibold text-[#8B6B48] block mb-0.5">
                      {place.recommendationBy} {place.recommendationBy === 'יואב' ? 'ממליץ' : 'ממליצה'}:
                    </span>
                    {place.tip}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Location Notice Box */}
        <div className="mt-14 bg-white rounded-2xl p-6 sm:p-8 border border-[#E5DCD0] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-right">
            <h4 className="font-serif text-lg sm:text-xl font-medium text-[#241E1A]">
              הכול קרוב. השקט נשאר בפנים.
            </h4>
            <p className="text-sm text-[#6C6356]">
              משק פויזנר, המייסדים 71, זכרון יעקב, כמה בתים מהמדרחוב. יוצאים מהשקט של החצר ותוך רגע נמצאים בין בתי הקפה והמסעדות — וכשרוצים לעצור, חוזרים לשורשים.
            </p>
          </div>
          <a
            href="https://maps.google.com/?q=המייסדים+71+זכרון+יעקב"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-5 py-2.5 rounded-full border border-[#D0C2AF] hover:bg-[#F3ECE0] text-xs sm:text-sm font-medium text-[#2C2926] transition-colors"
          >
            פתיחה ב-Google Maps
          </a>
        </div>

      </div>
    </section>
  );
}
