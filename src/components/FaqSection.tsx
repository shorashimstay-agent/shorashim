import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FAQ_ITEMS } from '../data/shorashimData';
import { EditorialTag } from './RootLine';

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section tabIndex={-1} id="faq" className="py-12 sm:py-24 lg:py-36 bg-[#DED5C8]/30 relative" dir="rtl" lang="he">
      <div className="max-w-4xl mx-auto px-7 sm:px-10 lg:px-12">
        
        {/* Section Header */}
        <div className="w-full max-w-none md:max-w-2xl mb-6 text-right">
          <EditorialTag className="mb-3 sm:mb-4 block">
            שאלות נפוצות
          </EditorialTag>
          <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl text-[#1E1D1A] font-normal tracking-tight mb-3 sm:mb-4 text-right">
            כל מה שחשוב לדעת
          </h2>
          <p className="text-sm sm:text-lg text-[#292824]/75 font-light text-right">
            פרטים על האירוח, ההתארגנות ונהלי המקום בשורשים.
          </p>
        </div>

        {/* Minimal Editorial Accordion (no heavy cards or drop-shadows) */}
        <div className="divide-y divide-[#DED5C8] border-y border-[#DED5C8]" dir="rtl">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="py-3 text-right" dir="rtl">
                <h3 className="m-0">
                <button
                  type="button"
                  id={`faq-q-${idx}`}
                  onClick={() => toggleAccordion(idx)}
                  aria-controls={isOpen ? `faq-a-${idx}` : undefined}
                  className="w-full text-right flex items-center justify-between gap-4 sm:gap-6 cursor-pointer group"
                  aria-expanded={isOpen}
                  dir="rtl"
                >
                  <span className="font-serif text-lg sm:text-xl text-[#1E1D1A] group-hover:text-[#7B6045] transition-colors font-normal text-right">
                    {item.question}
                  </span>
                  <span className="inline-flex shrink-0 p-1 text-[#7B6045] transition-transform duration-300">
                    <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                </h3>

                {isOpen && (
                  <div
                    id={`faq-a-${idx}`}
                    role="region"
                    aria-labelledby={`faq-q-${idx}`}
                    className="pt-3 sm:pt-4 text-sm sm:text-base text-[#292824]/75 font-light leading-relaxed animate-fadeIn text-right"
                    dir="rtl"
                  >
                    <p className="text-right">{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}


