/**
 * TerraScan AI - Interactive Frequently Asked Questions (SSS) Component
 * With real-time search, category filtering, animated accordions, and 2863 S.K. legal badges.
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Key, 
  Radio, 
  Box, 
  Scale, 
  Coins, 
  ShieldCheck, 
  HelpCircle,
  CheckCircle2,
  FileQuestion,
  ExternalLink
} from 'lucide-react';
import { FAQ_ITEMS, FAQ_CATEGORIES, FAQItem } from '../data/faqData';
import { sound } from '../utils/anomalyEngine';

interface FAQSectionProps {
  compact?: boolean;
  onOpenSupport?: () => void;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ compact = false, onOpenSupport }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openItemIds, setOpenItemIds] = useState<Record<string, boolean>>({
    'lic-1': true, // Keep first open by default
    'leg-1': true,
  });

  const toggleItem = (id: string) => {
    sound.playRadarBeep();
    setOpenItemIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesSearch = !query || 
        item.question.toLowerCase().includes(query) || 
        item.answer.toLowerCase().includes(query) ||
        item.categoryLabel.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Key': return <Key className="w-3.5 h-3.5" />;
      case 'Radio': return <Radio className="w-3.5 h-3.5" />;
      case 'Box': return <Box className="w-3.5 h-3.5" />;
      case 'Scale': return <Scale className="w-3.5 h-3.5" />;
      case 'Coins': return <Coins className="w-3.5 h-3.5" />;
      case 'ShieldCheck': return <ShieldCheck className="w-3.5 h-3.5" />;
      default: return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>Sıkça Sorulan Sorular (SSS)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  {FAQ_ITEMS.length} Rehber
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Lisans, 2863 S.K. mevzuatı, SAR interferometri ve Voxler 3B kullanım kılavuzu
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Soru veya anahtar kelime arayın (örn: lisans, 2863, derinlik, csv)..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
            >
              Temizle
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {FAQ_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  sound.playScanBeep();
                  setSelectedCategory(cat.key);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {getCategoryIcon(cat.icon)}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accordion Questions List */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
            <FileQuestion className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-xs font-bold text-slate-400">Aradığınız kriterlere uygun soru bulunamadı.</div>
            <div className="text-[11px] text-slate-500">
              Farklı bir arama terimi deneyebilir veya destek ekibimize danışabilirsiniz.
            </div>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isOpen = !!openItemIds[item.id];
            return (
              <div
                key={item.id}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-slate-900/90 border-cyan-500/50 shadow-sm'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className="w-full text-left p-3 flex items-start justify-between gap-3 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                        {item.categoryLabel}
                      </span>
                      {item.badge && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${
                          item.badge === 'PRO' 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : item.badge === 'Yasal Sorumluluk'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-100 leading-snug">
                      {item.question}
                    </div>
                  </div>
                  <div className="mt-0.5 text-slate-400 shrink-0">
                    {isOpen ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-3 pb-3.5 pt-1 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/50 space-y-2 animate-fadeIn font-sans">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Trust & Compliance Footer Banner */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Sorunuzun yanıtını bulamadınız mı?</span>
        </div>
        {onOpenSupport && (
          <button
            type="button"
            onClick={() => {
              sound.playScanBeep();
              onOpenSupport();
            }}
            className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[10px] transition-colors cursor-pointer"
          >
            Uzmana Sor
          </button>
        )}
      </div>
    </div>
  );
};
