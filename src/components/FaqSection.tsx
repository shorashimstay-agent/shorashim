import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FAQ_ITEMS } from '../data/shorashimData';
import { EditorialTag } from './RootLine';

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-28 sm:py-36 bg-[#DED5C8]/30 relative">
      <div className="max-w-4xl mx-auto px-6 sm:px-12">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-16 pb-8 border-b border-[#DED5C8]">
          <EditorialTag className="mb-4 block">
            11 · שאלות נפוצות
          </EditorialTag>
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[#1E1D1A] font-normal tracking-tight mb-4">
            כל מה שחשוב לדעת
          </h2>
          <p className="text-base sm:text-lg text-[#292824]/75 font-light">
            פרטים על האירוח, ההתארגנות ונהלי המקום בשורשים.
          </p>
        </div>

        {/* Minimal Editorial Accordion (no heavy cards or drop-shadows) */}
        <div className="divide-y divide-[#DED5C8] border-y border-[#DED5C8]">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="py-6">
                <h3 className="m-0">
                <button
                  type="button"
                  id={`faq-q-${idx}`}
                  onClick={() => toggleAccordion(idx)}
                  aria-controls={isOpen ? `faq-a-${idx}` : undefined}
                  className="w-full text-right flex items-center justify-between gap-6 cursor-pointer group"
                  aria-expanded={isOpen}
                >
                  <span className="font-serif text-xl sm:text-2xl text-[#1E1D1A] group-hover:text-[#7B6045] transition-colors font-normal">
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
                    className="pt-4 text-base text-[#292824]/75 font-light leading-relaxed animate-fadeIn"
                  >
                    <p>{item.answer}</p>
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
