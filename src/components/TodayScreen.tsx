import { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Info,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { EvaluatedMaterial, TrafficLightStatus } from '../types/inventory';
import {
  formatBRLWhole,
  formatPercentSigned,
  formatQty,
} from '../utils/mathEngine';
import { STATUS_META, StatusChip } from './StatusVisuals';

interface TodayScreenProps {
  items: EvaluatedMaterial[];
  onSelectMaterial: (materialId: string) => void;
}

const WELCOME_STORAGE_KEY = 'balcao_inteligente_welcome_open_v1';

export function TodayScreen({ items, onSelectMaterial }: TodayScreenProps) {
  const [filterStatus, setFilterStatus] = useState<TrafficLightStatus | 'ALL'>('ALL');
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(WELCOME_STORAGE_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const toggleWelcome = () => {
    setShowWelcome((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(WELCOME_STORAGE_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const countComprar = items.filter((i) => i.status === 'COMPRAR_AGORA').length;
  const countAntecipar = items.filter((i) => i.status === 'ANTECIPAR_COMPRA').length;
  const countNaoComprar = items.filter((i) => i.status === 'NAO_COMPRAR').length;
  const countAguardar = items.filter((i) => i.status === 'AGUARDAR').length;

  const totalDinheiroParado = items.reduce((acc, i) => acc + i.dinheiroParado, 0);
  const totalEconomia45d = items.reduce((acc, i) => acc + i.economiaEstimada, 0);

  const visibleItems =
    filterStatus === 'ALL'
      ? items
      : items.filter((i) => i.status === filterStatus);

  const toggleFilter = (target: TrafficLightStatus) => {
    setFilterStatus((prev) => (prev === target ? 'ALL' : target));
  };

  return (
    <div className="space-y-5">
      {/* Card de Boas-vindas */}
      <section
        aria-label="Guia rápido do balcão"
        className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-2xl overflow-hidden"
      >
        <button
          type="button"
          onClick={toggleWelcome}
          aria-expanded={showWelcome}
          className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-[#F1F5F9]/60 dark:hover:bg-slate-700/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <Info className="w-5 h-5 text-[#1D4ED8] dark:text-blue-300 shrink-0" aria-hidden="true" />
            <span className="text-[16px] font-extrabold text-[#0F172A] dark:text-slate-50 truncate">
              Bem-vindo! Como ler este painel
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-[#1D4ED8] dark:text-blue-300 shrink-0">
            <span>{showWelcome ? 'Ocultar' : 'Abrir'}</span>
            {showWelcome ? (
              <ChevronUp className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            )}
          </span>
        </button>

        {showWelcome && (
          <div className="px-4 pb-4 pt-1 border-t border-[#E2E8F0] dark:border-slate-700 space-y-3 text-[15px] text-[#334155] dark:text-slate-300 leading-snug">
            <p className="font-medium text-[#0F172A] dark:text-slate-100">
              Acompanhe o Termômetro de Mercado para apoiar sua decisão no depósito:
            </p>

            <ul className="space-y-2 text-[14px]">
              <li className="flex items-start gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#B91C1C] dark:bg-red-400 shrink-0 mt-1.5" aria-hidden="true" />
                <span>
                  <strong className="text-[#B91C1C] dark:text-red-300">Atenção ao Estoque:</strong> Volume baixo no pátio — avalie a reposição para evitar falta ao cliente.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#B45309] dark:bg-amber-400 shrink-0 mt-1.5" aria-hidden="true" />
                <span>
                  <strong className="text-[#B45309] dark:text-amber-300">Pressão de Alta:</strong> Estoque suficiente, mas a tendência estatística aponta alta nos próximos 30 dias.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#15803D] dark:bg-emerald-400 shrink-0 mt-1.5" aria-hidden="true" />
                <span>
                  <strong className="text-[#15803D] dark:text-emerald-300">Tendência de Acomodação:</strong> Estoque confortável e mercado com viés de queda ou estabilidade.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#1D4ED8] dark:bg-blue-400 shrink-0 mt-1.5" aria-hidden="true" />
                <span>
                  <strong className="text-[#1D4ED8] dark:text-blue-300">Mercado Estável:</strong> Pátio abastecido e preços firmes, sem pressão imediata de compra.
                </span>
              </li>
            </ul>
          </div>
        )}
      </section>

      {/* Resumo do Semáforo (3 cards grandes lado a lado) */}
      <section aria-label="Resumo do semáforo de compras">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[16px] font-bold text-[#0F172A] dark:text-slate-50">
            Decisão de hoje no pátio
          </h2>
          {filterStatus !== 'ALL' && (
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className="text-[14px] font-bold text-[#1D4ED8] dark:text-blue-300 underline underline-offset-2 min-h-[36px] px-2"
            >
              Ver todos ({items.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => toggleFilter('COMPRAR_AGORA')}
            aria-pressed={filterStatus === 'COMPRAR_AGORA'}
            className={`text-left rounded-2xl p-3 border-2 transition-transform active:scale-[0.98] min-h-[112px] flex flex-col justify-between ${
              filterStatus === 'COMPRAR_AGORA'
                ? 'bg-[#FEE2E2] dark:bg-red-950/90 border-[#B91C1C] dark:border-red-400 ring-2 ring-[#B91C1C]/25 dark:ring-red-400/40'
                : 'bg-[#FEE2E2]/75 dark:bg-red-950/60 border-[#FCA5A5] dark:border-red-800'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <AlertTriangle className="w-5 h-5 text-[#B91C1C] dark:text-red-200 shrink-0" aria-hidden="true" />
              <span className="text-[11px] font-bold text-[#B91C1C] dark:text-red-200">VERMELHO</span>
            </div>
            <div className="mt-1">
              <div className="text-[30px] leading-none font-extrabold text-[#B91C1C] dark:text-red-100 font-num">
                {countComprar}
              </div>
              <div className="text-[12px] font-bold text-[#B91C1C] dark:text-red-200 mt-1 leading-tight">
                Atenção ao Estoque
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => toggleFilter('ANTECIPAR_COMPRA')}
            aria-pressed={filterStatus === 'ANTECIPAR_COMPRA'}
            className={`text-left rounded-2xl p-3 border-2 transition-transform active:scale-[0.98] min-h-[112px] flex flex-col justify-between ${
              filterStatus === 'ANTECIPAR_COMPRA'
                ? 'bg-[#FEF3C7] dark:bg-amber-950/90 border-[#B45309] dark:border-amber-400 ring-2 ring-[#B45309]/25 dark:ring-amber-400/40'
                : 'bg-[#FEF3C7]/75 dark:bg-amber-950/60 border-[#FCD34D] dark:border-amber-800'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <TrendingUp className="w-5 h-5 text-[#B45309] dark:text-amber-200 shrink-0" aria-hidden="true" />
              <span className="text-[11px] font-bold text-[#B45309] dark:text-amber-200">AMARELO</span>
            </div>
            <div className="mt-1">
              <div className="text-[30px] leading-none font-extrabold text-[#B45309] dark:text-amber-100 font-num">
                {countAntecipar}
              </div>
              <div className="text-[12px] font-bold text-[#B45309] dark:text-amber-200 mt-1 leading-tight">
                Pressão de Alta
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => toggleFilter('NAO_COMPRAR')}
            aria-pressed={filterStatus === 'NAO_COMPRAR'}
            className={`text-left rounded-2xl p-3 border-2 transition-transform active:scale-[0.98] min-h-[112px] flex flex-col justify-between ${
              filterStatus === 'NAO_COMPRAR'
                ? 'bg-[#DCFCE7] dark:bg-emerald-950/90 border-[#15803D] dark:border-emerald-400 ring-2 ring-[#15803D]/25 dark:ring-emerald-400/40'
                : 'bg-[#DCFCE7]/70 dark:bg-emerald-950/60 border-[#86EFAC] dark:border-emerald-800'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <TrendingDown className="w-5 h-5 text-[#15803D] dark:text-emerald-200 shrink-0" aria-hidden="true" />
              <span className="text-[11px] font-bold text-[#15803D] dark:text-emerald-200">VERDE</span>
            </div>
            <div className="mt-1">
              <div className="text-[30px] leading-none font-extrabold text-[#15803D] dark:text-emerald-100 font-num">
                {countNaoComprar}
              </div>
              <div className="text-[12px] font-bold text-[#15803D] dark:text-emerald-200 mt-1 leading-tight">
                Tendência de Acomodação
              </div>
            </div>
          </button>
        </div>

        {countAguardar > 0 && (
          <button
            type="button"
            onClick={() => toggleFilter('AGUARDAR')}
            aria-pressed={filterStatus === 'AGUARDAR'}
            className={`mt-2.5 w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-[14px] font-semibold transition-colors min-h-[48px] ${
              filterStatus === 'AGUARDAR'
                ? 'bg-[#DBEAFE] dark:bg-blue-950/85 border-[#1D4ED8] dark:border-blue-400 text-[#1D4ED8] dark:text-blue-100'
                : 'bg-[#F8FAFC] dark:bg-slate-800 border-[#CBD5E1] dark:border-slate-700 text-[#334155] dark:text-slate-200'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1D4ED8] dark:text-blue-300" aria-hidden="true" />
              <span>Mercado Estável</span>
            </span>
            <span className="font-extrabold text-[#1D4ED8] dark:text-blue-300 font-num">
              {countAguardar} {countAguardar === 1 ? 'item' : 'itens'}
            </span>
          </button>
        )}
      </section>

      {/* 2 KPIs Financeiros Simples */}
      <section aria-label="Resumo financeiro do pátio" className="grid grid-cols-2 gap-3">
        <div className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-2xl p-3.5">
          <div className="text-[13px] font-semibold text-[#334155] dark:text-slate-300 leading-snug">
            Dinheiro parado no estoque
          </div>
          <div className="text-[24px] leading-tight font-extrabold text-[#0F172A] dark:text-slate-50 mt-1.5 font-num">
            {formatBRLWhole(totalDinheiroParado)}
          </div>
        </div>

        <div className="bg-[#DCFCE7]/50 dark:bg-emerald-950/60 border border-[#86EFAC] dark:border-emerald-700 rounded-2xl p-3.5">
          <div className="text-[13px] font-semibold text-[#15803D] dark:text-emerald-200 leading-snug">
            Economia possível (45 dias)
          </div>
          <div className="text-[24px] leading-tight font-extrabold text-[#15803D] dark:text-emerald-100 mt-1.5 font-num">
            {formatBRLWhole(totalEconomia45d)}
          </div>
        </div>
      </section>

      {/* Lista Priorizada de Materiais */}
      <section aria-label="Lista priorizada de materiais">
        <div className="flex items-baseline justify-between mb-2.5">
          <h2 className="text-[18px] font-extrabold text-[#0F172A] dark:text-slate-50">
            Lista de materiais ({visibleItems.length})
          </h2>
          <span className="text-[13px] font-medium text-[#334155] dark:text-slate-300">
            Toque para abrir
          </span>
        </div>

        <div className="space-y-3">
          {visibleItems.map((item) => {
            const meta = STATUS_META[item.status];
            const isUp = item.tendencia === 'alta';
            const isDown = item.tendencia === 'queda';

            const priceTrendTextColor = isUp
              ? 'text-[#B45309] dark:text-amber-300'
              : isDown
              ? 'text-[#15803D] dark:text-emerald-300'
              : 'text-[#334155] dark:text-slate-300';

            return (
              <button
                key={item.record.id}
                type="button"
                onClick={() => onSelectMaterial(item.record.id)}
                className={`w-full text-left bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 border-l-[6px] ${meta.leftAccentColor} rounded-2xl p-4 transition-transform active:scale-[0.99] hover:border-[#94A3B8] dark:hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[17px] font-extrabold text-[#0F172A] dark:text-slate-50 leading-snug">
                      {item.record.insumo}
                    </h3>
                    <p className="text-[14px] font-medium text-[#334155] dark:text-slate-300 mt-0.5">
                      No pátio: <span className="font-bold text-[#0F172A] dark:text-slate-50 font-num">{formatQty(item.config.estoqueAtual)}</span> {item.record.unidadeComercial}
                    </p>
                  </div>
                  <ChevronRight
                    className="w-5 h-5 text-[#334155] dark:text-slate-300 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <StatusChip status={item.status} />

                  <div className="text-right">
                    <div className="text-[14px] font-bold text-[#0F172A] dark:text-slate-50 font-num">
                      {item.diasQueDura >= 999
                        ? 'Sem giro recente'
                        : `Estoque dura ${item.diasQueDura} ${item.diasQueDura === 1 ? 'dia' : 'dias'}`}
                    </div>
                    <div
                      className={`inline-flex items-center justify-end gap-1 text-[14px] font-bold font-num ${priceTrendTextColor}`}
                    >
                      {isUp && <ArrowUpRight className="w-4 h-4 shrink-0" aria-hidden="true" />}
                      {isDown && <ArrowDownRight className="w-4 h-4 shrink-0" aria-hidden="true" />}
                      {!isUp && !isDown && <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />}
                      <span>
                        {isUp || isDown
                          ? `${formatPercentSigned(item.var45d)} em 45d`
                          : `Estável (${formatPercentSigned(item.var45d)})`}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
