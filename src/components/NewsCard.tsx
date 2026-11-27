import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  ExternalLink,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { formatNewsDateLabel } from '../data/marketNews';
import { MarketNewsItem, NewsSignal } from '../types/inventory';

interface NewsCardProps {
  item: MarketNewsItem;
  onOpenCalculator: (materialId: string) => void;
  compact?: boolean;
  fillHeight?: boolean;
}

const SIGNAL_STYLES: Record<
  NewsSignal,
  {
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    dotColor: string;
  }
> = {
  ALTA: {
    badgeBg: 'bg-[#FEE2E2] dark:bg-red-950/90',
    badgeText: 'text-[#B91C1C] dark:text-red-200',
    badgeBorder: 'border-[#FCA5A5] dark:border-red-700',
    dotColor: 'bg-[#B91C1C] dark:bg-red-400',
  },
  QUEDA: {
    badgeBg: 'bg-[#DCFCE7] dark:bg-emerald-950/90',
    badgeText: 'text-[#15803D] dark:text-emerald-200',
    badgeBorder: 'border-[#86EFAC] dark:border-emerald-700',
    dotColor: 'bg-[#15803D] dark:bg-emerald-400',
  },
  ATENCAO: {
    badgeBg: 'bg-[#FEF3C7] dark:bg-amber-950/90',
    badgeText: 'text-[#B45309] dark:text-amber-200',
    badgeBorder: 'border-[#FCD34D] dark:border-amber-700',
    dotColor: 'bg-[#B45309] dark:bg-amber-400',
  },
  ESTAVEL: {
    badgeBg: 'bg-[#DBEAFE] dark:bg-blue-950/90',
    badgeText: 'text-[#1D4ED8] dark:text-blue-200',
    badgeBorder: 'border-[#93C5FD] dark:border-blue-700',
    dotColor: 'bg-[#1D4ED8] dark:bg-blue-400',
  },
};

function SignalIcon({ signal }: { signal: NewsSignal }) {
  switch (signal) {
    case 'ALTA':
      return <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'QUEDA':
      return <TrendingDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'ATENCAO':
      return <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
    case 'ESTAVEL':
      return <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  }
}

export function NewsCard({
  item,
  onOpenCalculator,
  compact = false,
  fillHeight = false,
}: NewsCardProps) {
  const signalStyle = SIGNAL_STYLES[item.sinal];
  const dateLabel = formatNewsDateLabel(item.publishedAt);

  return (
    <article
      aria-label={item.titulo}
      className={`bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-2xl p-4 ${
        fillHeight ? 'h-full flex flex-col justify-between gap-3' : 'space-y-3'
      }`}
    >
      <div className="space-y-3">
      {/* Header do Card: Material + Fonte (link para a notícia) + Data */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12.5px] font-semibold text-[#334155] dark:text-slate-300 leading-snug">
        <span className="font-extrabold text-[#0F172A] dark:text-slate-100">
          {item.materialNome}
        </span>
        <span aria-hidden="true">•</span>
        <a
          href={item.articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ler notícia em ${item.fonte} em nova aba`}
          className="inline-flex items-center gap-1 underline underline-offset-2 font-bold text-[#1D4ED8] dark:text-blue-300 hover:text-[#1E40AF] dark:hover:text-blue-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400 rounded-sm"
        >
          <span>{item.fonte}</span>
          <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
        </a>
        <span aria-hidden="true">•</span>
        <span>{dateLabel}</span>
      </div>

      {/* Badge de Sinal */}
      <div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px] font-extrabold ${signalStyle.badgeBg} ${signalStyle.badgeText} ${signalStyle.badgeBorder}`}
        >
          <SignalIcon signal={item.sinal} />
          <span>{item.sinalLabel}</span>
        </span>
      </div>

      {/* Título Principal com link direto para a notícia */}
      <h3
        className={`${
          compact ? 'text-[16px]' : 'text-[17px]'
        } font-extrabold text-[#0F172A] dark:text-slate-50 leading-snug`}
      >
        <a
          href={item.articleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400 rounded-sm"
        >
          {item.titulo}
        </a>
      </h3>

      {/* Gatilhos de Insumo / Custo */}
      {!compact && (
        <p className="text-[12.5px] font-medium text-[#475569] dark:text-slate-300 leading-snug">
          <span className="font-bold text-[#334155] dark:text-slate-200">O que mexe no preço:</span>{' '}
          {item.gatilhos}
        </p>
      )}

      </div>

      {/* Ação compacta para Calculadora */}
      <div className="pt-2 flex justify-end border-t border-[#E2E8F0] dark:border-slate-700/80">
        <button
          type="button"
          onClick={() => onOpenCalculator(item.materialId)}
          className="min-h-[38px] px-2 py-1 rounded-lg text-[#1D4ED8] dark:text-blue-300 hover:bg-[#DBEAFE]/60 dark:hover:bg-blue-950/60 font-extrabold text-[13px] inline-flex items-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
        >
          <Calculator className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Simular na calculadora</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
