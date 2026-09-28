import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FAQ_ITEMS } from '../data/shorashimData';

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-[#F5EFE6] relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#DFD3C2] text-xs font-semibold tracking-wider text-[#89603A] mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-[#816342]" />
            <span>08 | שאלות נפוצות</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#241E1A] font-normal tracking-tight mb-4">
            כל מה שחשוב לדעת
          </h2>
          <p className="text-base sm:text-lg text-[#6D6457]">
            תשובות מפורטות לשאלות נפוצות על האירוח, ההתארגנות ונהלי המקום בשורשים.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#E5DCD0] overflow-hidden shadow-xs transition-all duration-200"
              >
                <h3 className="m-0">
                <button
                  type="button"
                  id={`faq-q-${idx}`}
                  onClick={() => toggleAccordion(idx)}
                  aria-controls={isOpen ? `faq-a-${idx}` : undefined}
                  className="w-full px-6 py-5 text-right flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF8F5] transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="font-serif text-lg sm:text-xl text-[#241E1A] font-medium">
                    {item.question}
                  </span>
                  <span
                    className={`inline-flex shrink-0 p-1.5 rounded-full bg-[#F3ECE0] text-[#816342] transition-transform duration-300 ${
                      isOpen ? 'rotate-180 bg-[#8B6B48] text-white' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </button>
                </h3>

                {isOpen && (
                  <div
                    id={`faq-a-${idx}`}
                    role="region"
                    aria-labelledby={`faq-q-${idx}`}
                    className="px-6 pb-6 pt-1 text-sm sm:text-base text-[#574F44] leading-relaxed border-t border-[#F3ECE0] animate-fadeIn"
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
