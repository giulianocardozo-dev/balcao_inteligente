import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Clock, Newspaper } from 'lucide-react';
import {
  getUpdatedMarketNews,
  NEWS_FILTER_CHIPS,
  NEWS_TIME_RANGES,
} from '../data/marketNews';
import { MarketNewsItem, NewsCategory, NewsTimeRange } from '../types/inventory';
import { ViewportFormat } from '../hooks/useViewportFormat';
import { NewsCard } from './NewsCard';

interface MarketNewsScreenProps {
  items: MarketNewsItem[];
  onOpenCalculator: (materialId: string) => void;
  syncError?: string | null;
  viewportFormat?: ViewportFormat;
}

export function MarketNewsScreen({
  items,
  onOpenCalculator,
  syncError = null,
  viewportFormat = 'mobile',
}: MarketNewsScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<NewsCategory>('todos');
  const [selectedTimeRange, setSelectedTimeRange] = useState<NewsTimeRange>('mes');
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);

  const isMobile = viewportFormat === 'mobile';
  const isDesktop = viewportFormat === 'desktop';

  const activeTimeOption =
    NEWS_TIME_RANGES.find((opt) => opt.id === selectedTimeRange) ?? NEWS_TIME_RANGES[2];

  const visibleNews = getUpdatedMarketNews(selectedTimeRange, selectedCategory, items);

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Tela */}
      <div className={isMobile ? 'flex items-center gap-2' : 'flex items-center justify-between gap-4'}>
        <div className="flex items-center gap-2">
          <Newspaper
            className="w-5 h-5 text-[#1D4ED8] dark:text-blue-300 shrink-0"
            aria-hidden="true"
          />
          <h2 className="text-[20px] font-extrabold text-[#0F172A] dark:text-slate-50">
            Notícias &amp; Mercado
          </h2>
        </div>
        {!isMobile && (
          <span className="text-[13.5px] font-bold text-[#334155] dark:text-slate-300 font-num whitespace-nowrap">
            {visibleNews.length}{' '}
            {visibleNews.length === 1 ? 'notícia atualizada' : 'notícias atualizadas'}
          </span>
        )}
      </div>

      {syncError && (
        <div
          role="status"
          className="px-3.5 py-2.5 rounded-xl bg-[#FEF3C7] dark:bg-amber-950/80 border border-[#FCD34D] dark:border-amber-700 text-[#92400E] dark:text-amber-200 text-[13px] font-semibold leading-snug"
        >
          {syncError}
        </div>
      )}

      {/* Barra de filtros: lado a lado em tablet/desktop, empilhada no celular */}
      <div className={isMobile ? 'space-y-4' : 'flex flex-wrap items-center justify-between gap-3'}>
        {/* Botão para filtrar por período atualizado (24h, semana, mês) */}
        <div className={isMobile ? 'space-y-2' : 'relative w-[260px] shrink-0'}>
          <button
            type="button"
            onClick={() => setIsTimeMenuOpen((prev) => !prev)}
            aria-expanded={isTimeMenuOpen}
            aria-controls="news-time-range-options"
            className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl border text-[14px] font-extrabold flex items-center justify-between gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400 ${
              selectedTimeRange !== 'mes'
                ? 'bg-[#DBEAFE]/75 dark:bg-blue-950/75 border-[#1D4ED8] dark:border-blue-400 text-[#0F172A] dark:text-slate-50'
                : 'bg-[#F8FAFC] dark:bg-slate-800 border-[#CBD5E1] dark:border-slate-700 text-[#0F172A] dark:text-slate-100 hover:border-[#94A3B8] dark:hover:border-slate-500'
            }`}
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              <Clock
                className="w-4 h-4 text-[#1D4ED8] dark:text-blue-300 shrink-0"
                aria-hidden="true"
              />
              <span className="truncate">
                Período: {activeTimeOption.label}
              </span>
            </span>
            {isTimeMenuOpen ? (
              <ChevronUp className="w-4 h-4 text-[#334155] dark:text-slate-300 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#334155] dark:text-slate-300 shrink-0" aria-hidden="true" />
            )}
          </button>

          {isTimeMenuOpen && (
            <div
              id="news-time-range-options"
              role="radiogroup"
              aria-label="Filtrar notícias por período de atualização"
              className={`${
                isMobile
                  ? 'bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-xl p-1.5 space-y-1'
                  : 'absolute left-0 top-full mt-1.5 z-30 w-full bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 rounded-xl p-1.5 space-y-1 shadow-xl'
              }`}
            >
              {NEWS_TIME_RANGES.map((option) => {
                const isSelected = selectedTimeRange === option.id;
                const optionCount = getUpdatedMarketNews(option.id, selectedCategory, items).length;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setSelectedTimeRange(option.id);
                      setIsTimeMenuOpen(false);
                    }}
                    className={`w-full min-h-[44px] px-3 py-2 rounded-lg text-[14px] font-extrabold flex items-center justify-between gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400 ${
                      isSelected
                        ? 'bg-[#0F172A] text-white dark:bg-slate-100 dark:text-slate-950'
                        : 'text-[#0F172A] dark:text-slate-100 hover:bg-[#F1F5F9] dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {isSelected && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
                      <span>{option.label}</span>
                    </span>
                    <span
                      className={`text-[12.5px] font-bold font-num ${
                        isSelected
                          ? 'text-slate-200 dark:text-slate-700'
                          : 'text-[#475569] dark:text-slate-300'
                      }`}
                    >
                      {optionCount} {optionCount === 1 ? 'notícia' : 'notícias'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Filtros Rápidos Horizontais */}
        <div
          role="tablist"
          aria-label="Filtrar notícias por categoria de material"
          className={
            isMobile
              ? 'flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1'
              : 'flex flex-wrap items-center gap-2 flex-1'
          }
        >
          {NEWS_FILTER_CHIPS.map((chip) => {
            const isActive = selectedCategory === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedCategory(chip.id)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-[13.5px] font-extrabold whitespace-nowrap shrink-0 inline-flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400 ${
                  isActive
                    ? 'bg-[#0F172A] text-white border-[#0F172A] dark:bg-slate-100 dark:text-slate-950 dark:border-slate-100'
                    : 'bg-[#F8FAFC] text-[#0F172A] border-[#CBD5E1] hover:border-[#94A3B8] dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:border-slate-500'
                }`}
              >
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contagem (mobile) */}
      {isMobile && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-bold text-[#334155] dark:text-slate-300 font-num">
            {visibleNews.length}{' '}
            {visibleNews.length === 1 ? 'notícia atualizada' : 'notícias atualizadas'}
          </span>
        </div>
      )}

      {/* Lista de Cards de Notícias */}
      {visibleNews.length === 0 ? (
        <div className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-2xl p-5 text-center space-y-3">
          <p className="text-[15px] font-semibold text-[#334155] dark:text-slate-300">
            Nenhuma notícia encontrada para este filtro no período selecionado.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {selectedTimeRange !== 'mes' && (
              <button
                type="button"
                onClick={() => setSelectedTimeRange('mes')}
                className="min-h-[44px] px-4 rounded-xl bg-[#1D4ED8] dark:bg-blue-600 text-white text-[14px] font-bold"
              >
                Ver no último mês
              </button>
            )}
            {selectedCategory !== 'todos' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('todos')}
                className="min-h-[44px] px-4 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 text-[#0F172A] dark:text-slate-100 text-[14px] font-bold"
              >
                Ver todos os materiais
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          className={
            isMobile
              ? 'space-y-3.5'
              : isDesktop
              ? 'grid grid-cols-2 xl:grid-cols-3 gap-4'
              : 'grid grid-cols-2 gap-4'
          }
        >
          {visibleNews.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              onOpenCalculator={onOpenCalculator}
              fillHeight={!isMobile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
