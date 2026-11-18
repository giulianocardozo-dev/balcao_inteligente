import { useState } from 'react';
import {
  ArrowLeft,
  Calculator,
  Check,
  Copy,
  Minus,
  Newspaper,
  Plus,
} from 'lucide-react';
import { getNewsForMaterial } from '../data/marketNews';
import { EvaluatedMaterial, MarketNewsItem, StoreInventoryConfig } from '../types/inventory';
import {
  formatBRL,
  formatDays,
  formatPercentSigned,
  formatQty,
  formatUnit,
} from '../utils/mathEngine';
import { NewsCard } from './NewsCard';
import { PriceHistoryChart } from './PriceHistoryChart';
import { ReferencePriceBanner } from './ReferencePriceBanner';
import { STATUS_META, StatusIcon } from './StatusVisuals';

interface MaterialDetailScreenProps {
  material: EvaluatedMaterial;
  allMaterials: EvaluatedMaterial[];
  newsItems?: MarketNewsItem[];
  onSelectMaterial: (id: string) => void;
  onUpdateConfig: (materialId: string, patch: Partial<StoreInventoryConfig>) => void;
  onBackToToday: () => void;
  onOpenSimulator: (materialId: string) => void;
  isDark?: boolean;
}

export function MaterialDetailScreen({
  material,
  allMaterials,
  newsItems,
  onSelectMaterial,
  onUpdateConfig,
  onBackToToday,
  onOpenSimulator,
  isDark = false,
}: MaterialDetailScreenProps) {
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  const { record, config } = material;
  const meta = STATUS_META[material.status];
  const relatedNews = getNewsForMaterial(record.id, record.insumo, 2, newsItems);

  const orderQty =
    material.quantidadeSugerida > 0
      ? material.quantidadeSugerida
      : Math.max(1, Math.ceil(config.vendas30d));

  const handleCopyWhatsApp = async () => {
    const text = `Olá! Preciso cotar ${formatQty(orderQty)} ${formatUnit(record.unidadeComercial, orderQty)} de ${record.insumo} para entrega aqui na loja. Qual o melhor preço e prazo?`;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopiedMsg(text);
    window.setTimeout(() => setCopiedMsg(null), 4000);
  };

  const stepAmount = (val: number) => (val >= 500 ? 50 : val >= 100 ? 10 : val >= 20 ? 5 : 1);

  const adjustField = (
    field: 'estoqueAtual' | 'vendas30d' | 'diasEntrega',
    delta: number,
    minVal = 0
  ) => {
    const next = Math.max(minVal, Math.round((config[field] + delta) * 100) / 100);
    onUpdateConfig(record.id, { [field]: next });
  };

  const handleNumberInput = (
    field: 'estoqueAtual' | 'vendas30d' | 'diasEntrega' | 'custoMedio',
    raw: string,
    minVal = 0
  ) => {
    const normalized = raw.replace(',', '.');
    const parsed = Number(normalized);
    if (!Number.isNaN(parsed)) {
      onUpdateConfig(record.id, { [field]: Math.max(minVal, parsed) });
    }
  };

  const custoTotalEstoque = config.estoqueAtual * config.custoMedio;
  const hasRefPrice = config.custoMedio > 0;

  const costStatusText = !hasRefPrice
    ? 'Informe o preço de referência acima para calcular o total em estoque e a economia estimada.'
    : `Preço de referência salvo: ${formatBRL(config.custoMedio)} por ${record.unidadeComercial}. Total em estoque: ${formatBRL(custoTotalEstoque)}.`;

  const trendLabel =
    material.tendencia === 'alta'
      ? 'Tendência de Alta'
      : material.tendencia === 'queda'
      ? 'Tendência de Queda'
      : 'Tendência Estável';

  const trendTextColor =
    material.tendencia === 'alta'
      ? 'text-[#B45309] dark:text-amber-300'
      : material.tendencia === 'queda'
      ? 'text-[#15803D] dark:text-emerald-300'
      : 'text-[#334155] dark:text-slate-300';

  return (
    <div className="space-y-4">
      {/* Alerta de Preços de Referência */}
      <ReferencePriceBanner
        items={allMaterials}
        currentMaterialId={record.id}
        onJumpToMaterial={onSelectMaterial}
      />

      {/* Top navigation & quick material switcher */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBackToToday}
          className="inline-flex items-center gap-1.5 min-h-[48px] px-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 text-[15px] font-bold text-[#0F172A] dark:text-slate-50 shrink-0 active:scale-[0.98]"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          <span>Voltar</span>
        </button>

        <select
          aria-label="Trocar material"
          value={record.id}
          onChange={(e) => onSelectMaterial(e.target.value)}
          className="flex-1 min-w-0 min-h-[48px] px-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 text-[15px] font-bold text-[#0F172A] dark:text-slate-50 truncate"
        >
          {allMaterials.map((item) => (
            <option key={item.record.id} value={item.record.id}>
              {item.record.insumo}
            </option>
          ))}
        </select>
      </div>

      {/* Material title & cost summary row */}
      <div>
        <h2 className="text-[22px] font-extrabold text-[#0F172A] dark:text-slate-50 leading-tight">
          {record.insumo}
        </h2>
        <p className="text-[14px] font-medium text-[#334155] dark:text-slate-300 mt-0.5">
          Unidade: <span className="font-bold text-[#0F172A] dark:text-slate-50">{record.unidadeComercial}</span>
        </p>

        <div className="mt-2.5 grid grid-cols-3 gap-2 pt-2.5 border-t border-[#E2E8F0] dark:border-slate-700">
          <div>
            <div className="text-[12px] font-semibold text-[#334155] dark:text-slate-300">Preço de ref.</div>
            <div
              className={`text-[15px] font-extrabold font-num ${
                hasRefPrice
                  ? 'text-[#0F172A] dark:text-slate-50'
                  : 'text-[#B45309] dark:text-amber-300'
              }`}
            >
              {hasRefPrice ? formatBRL(config.custoMedio) : 'R$ 0,00'}
            </div>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-[#334155] dark:text-slate-300">Total estoque</div>
            <div className="text-[15px] font-extrabold text-[#0F172A] dark:text-slate-50 font-num">
              {formatBRL(custoTotalEstoque)}
            </div>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-[#334155] dark:text-slate-300">Projeção 45d</div>
            <div className={`text-[15px] font-extrabold font-num ${trendTextColor}`}>
              {formatPercentSigned(material.var45d)}
            </div>
          </div>
        </div>
      </div>

      {/* Banner Grande do Semáforo */}
      <section
        aria-label="Recomendação de compra"
        className={`rounded-2xl p-4 border-2 ${meta.bgColor} ${meta.borderColor}`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${meta.solidColor}`}
          >
            <StatusIcon status={material.status} className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-[18px] font-extrabold tracking-tight ${meta.textColor}`}>
              {meta.label}
            </div>
            <p className="text-[15px] font-semibold text-[#0F172A] dark:text-slate-100 mt-0.5 leading-snug">
              {meta.description}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/15 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[13px] font-semibold text-[#334155] dark:text-slate-200">
              Quantidade sugerida
            </div>
            <div className="text-[24px] leading-tight font-extrabold text-[#0F172A] dark:text-slate-50 font-num mt-0.5">
              {material.quantidadeSugerida > 0
                ? `${formatQty(material.quantidadeSugerida)}`
                : '0'}
            </div>
            <div className="text-[13px] font-semibold text-[#334155] dark:text-slate-200">
              {material.quantidadeSugerida > 0
                ? formatUnit(record.unidadeComercial, material.quantidadeSugerida)
                : 'Não precisa pedir agora'}
            </div>
          </div>

          <div>
            <div className="text-[13px] font-semibold text-[#334155] dark:text-slate-200">
              Economia estimada
            </div>
            <div className={`text-[24px] leading-tight font-extrabold font-num mt-0.5 ${material.economiaEstimada > 0 ? 'text-[#15803D] dark:text-emerald-300' : 'text-[#0F172A] dark:text-slate-50'}`}>
              {material.economiaEstimada > 0
                ? formatBRL(material.economiaEstimada)
                : '—'}
            </div>
            <div className="text-[13px] font-semibold text-[#334155] dark:text-slate-200">
              {material.economiaEstimada > 0
                ? 'Comprando antes da alta'
                : material.tendencia === 'queda'
                ? 'Preço previsto em queda'
                : 'Preço estável no período'}
            </div>
          </div>
        </div>
      </section>

      {/* Edição Rápida do Estoque da Loja (Inline) */}
      <section className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-2xl p-4 space-y-3.5">
        <h3 className="text-[17px] font-extrabold text-[#0F172A] dark:text-slate-50">
          Ajustar números da sua loja
        </h3>

        {/* Estoque Atual */}
        <div>
          <label
            htmlFor="edit-estoque-atual"
            className="block text-[14px] font-bold text-[#334155] dark:text-slate-200 mb-1.5"
          >
            Estoque atual no pátio ({formatUnit(record.unidadeComercial)})
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Diminuir estoque atual"
              onClick={() => adjustField('estoqueAtual', -stepAmount(config.estoqueAtual), 0)}
              className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
            >
              <Minus className="w-5 h-5" />
            </button>
            <input
              id="edit-estoque-atual"
              type="number"
              min={0}
              inputMode="decimal"
              value={config.estoqueAtual}
              onChange={(e) => handleNumberInput('estoqueAtual', e.target.value, 0)}
              className="flex-1 min-w-0 h-12 px-3 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 text-center text-[20px] font-extrabold text-[#0F172A] dark:text-slate-50 font-num"
            />
            <button
              type="button"
              aria-label="Aumentar estoque atual"
              onClick={() => adjustField('estoqueAtual', stepAmount(config.estoqueAtual), 0)}
              className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Vendas no mês */}
        <div>
          <label
            htmlFor="edit-vendas-mes"
            className="block text-[14px] font-bold text-[#334155] dark:text-slate-200 mb-1.5"
          >
            Vendas no mês ({formatUnit(record.unidadeComercial)} nos últimos 30 dias)
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Diminuir vendas no mês"
              onClick={() => adjustField('vendas30d', -stepAmount(config.vendas30d), 0)}
              className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
            >
              <Minus className="w-5 h-5" />
            </button>
            <input
              id="edit-vendas-mes"
              type="number"
              min={0}
              inputMode="decimal"
              value={config.vendas30d}
              onChange={(e) => handleNumberInput('vendas30d', e.target.value, 0)}
              className="flex-1 min-w-0 h-12 px-3 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 text-center text-[20px] font-extrabold text-[#0F172A] dark:text-slate-50 font-num"
            />
            <button
              type="button"
              aria-label="Aumentar vendas no mês"
              onClick={() => adjustField('vendas30d', stepAmount(config.vendas30d), 0)}
              className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dias pro caminhão entregar + Custo médio */}
        <div className="grid grid-cols-2 gap-3 items-start">
          <div>
            <label
              htmlFor="edit-dias-entrega"
              className="block text-[11px] min-[410px]:text-[12.5px] font-bold text-[#334155] dark:text-slate-200 tracking-tight leading-tight whitespace-nowrap mb-1.5"
            >
              Dias pro caminhão entregar
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Diminuir dias de entrega"
                onClick={() => adjustField('diasEntrega', -1, 1)}
                className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                id="edit-dias-entrega"
                type="number"
                min={1}
                inputMode="numeric"
                value={config.diasEntrega}
                onChange={(e) => handleNumberInput('diasEntrega', e.target.value, 1)}
                className="w-full min-w-0 h-12 px-1 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 text-center text-[18px] font-extrabold text-[#0F172A] dark:text-slate-50 font-num"
              />
              <button
                type="button"
                aria-label="Aumentar dias de entrega"
                onClick={() => adjustField('diasEntrega', 1, 1)}
                className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-custo-medio"
              className="block text-[11px] min-[410px]:text-[12.5px] font-bold text-[#334155] dark:text-slate-200 tracking-tight leading-tight whitespace-nowrap mb-1.5"
            >
              Preço de referência (R$)
            </label>
            <input
              id="edit-custo-medio"
              aria-describedby="edit-custo-medio-help"
              type="number"
              min={0}
              step="0.10"
              inputMode="decimal"
              value={config.custoMedio}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleNumberInput('custoMedio', e.target.value, 0)}
              className={`w-full h-12 px-3 rounded-xl border text-center text-[18px] font-extrabold text-[#0F172A] dark:text-slate-50 font-num ${
                hasRefPrice
                  ? 'bg-white dark:bg-slate-900 border-[#CBD5E1] dark:border-slate-600'
                  : 'bg-[#FEF3C7]/45 dark:bg-amber-950/35 border-[#B45309] dark:border-amber-400'
              }`}
            />
            <p
              id="edit-custo-medio-help"
              className={`text-[12px] mt-1.5 leading-snug ${
                hasRefPrice
                  ? 'font-medium text-[#334155] dark:text-slate-300'
                  : 'font-bold text-[#B45309] dark:text-amber-300'
              }`}
            >
              {hasRefPrice
                ? 'Salvo automaticamente. Base para calcular variação e estoque.'
                : 'Obrigatório: informe seu preço de referência atual por unidade.'}
            </p>
          </div>
        </div>
      </section>

      {/* 3 Cartões Empilhados (Por que fazer isso?) */}
      <section className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-2xl p-4 space-y-3">
        <h3 className="text-[17px] font-extrabold text-[#0F172A] dark:text-slate-50">
          Por que fazer isso?
        </h3>

        <div className="space-y-2.5">
          {/* Card 1 — Seu Estoque (Simulação) */}
          <div className="rounded-xl bg-white dark:bg-slate-900/90 border border-[#CBD5E1] dark:border-slate-700 p-3.5 space-y-1.5">
            <div className="text-[13px] font-extrabold uppercase tracking-wide text-[#334155] dark:text-slate-300">
              Seu Estoque (Simulação)
            </div>
            <div className="text-[14px] font-medium text-[#334155] dark:text-slate-300 leading-snug">
              Pedir de novo com:{' '}
              <strong className="block sm:inline text-[20px] font-extrabold text-[#0F172A] dark:text-slate-50 font-num">
                {formatQty(material.quandoPedirDeNovo)}{' '}
                {formatUnit(record.unidadeComercial, material.quandoPedirDeNovo)}
              </strong>
            </div>
            <div className="text-[14px] font-semibold text-[#334155] dark:text-slate-300 font-num">
              Duração:{' '}
              <span className="font-bold text-[#0F172A] dark:text-slate-100">
                {material.diasQueDura >= 999
                  ? 'sem giro recente'
                  : `~${formatDays(material.diasQueDura)}`}
              </span>{' '}
              <span className="mx-1 text-[#94A3B8] dark:text-slate-500" aria-hidden="true">
                |
              </span>{' '}
              Entrega:{' '}
              <span className="font-bold text-[#0F172A] dark:text-slate-100">
                ~{formatDays(config.diasEntrega)}
              </span>
            </div>
          </div>

          {/* Card 2 — Termômetro de Mercado (Tendência) */}
          <div className="rounded-xl bg-white dark:bg-slate-900/90 border border-[#CBD5E1] dark:border-slate-700 p-3.5 space-y-1.5">
            <div className="text-[13px] font-extrabold uppercase tracking-wide text-[#334155] dark:text-slate-300">
              Termômetro de Mercado (Tendência)
            </div>
            <div className="space-y-1 text-[14px] text-[#334155] dark:text-slate-300 font-num">
              <div>
                Preço de referência:{' '}
                <strong
                  className={`font-extrabold ${
                    hasRefPrice
                      ? 'text-[#0F172A] dark:text-slate-50'
                      : 'text-[#B45309] dark:text-amber-300'
                  }`}
                >
                  {hasRefPrice ? formatBRL(config.custoMedio) : 'Não informado (R$ 0,00)'}
                </strong>
              </div>
              <div>
                Projeção em 45 dias:{' '}
                <strong className={`font-extrabold ${trendTextColor}`}>
                  {formatPercentSigned(material.var45d)}
                </strong>{' '}
                <span className={`font-bold ${trendTextColor}`}>
                  ({trendLabel})
                </span>
              </div>
              <div>
                Projeção em 3 meses:{' '}
                <strong className="font-extrabold text-[#0F172A] dark:text-slate-50">
                  {formatPercentSigned(material.var90d)}
                </strong>
              </div>
            </div>
          </div>

          {/* Card 3 — Referência da Loja */}
          <div className="rounded-xl bg-white dark:bg-slate-900/90 border border-[#CBD5E1] dark:border-slate-700 p-3.5 space-y-1">
            <div className="text-[13px] font-extrabold uppercase tracking-wide text-[#334155] dark:text-slate-300">
              Referência da Loja
            </div>
            <p className="text-[14px] font-medium text-[#0F172A] dark:text-slate-100 leading-snug font-num">
              {costStatusText}
            </p>
          </div>
        </div>

        {/* Rodapé do Card (Disclaimer) */}
        <p className="text-[12.5px] italic text-[#475569] dark:text-slate-300 pt-1 leading-snug">
          Estimativa baseada em índices públicos.
          <br />
          Não garante preço futuro.
        </p>
      </section>

      {/* Gráfico Simples (SVG leve) */}
      <PriceHistoryChart
        historico={record.historico}
        previsoes={record.previsoes}
        tendencia={material.tendencia}
        isDark={isDark}
      />

      {/* Ações Principais */}
      <section className="space-y-2.5 pt-1">
        {copiedMsg && (
          <div
            role="status"
            className="bg-[#DCFCE7] dark:bg-emerald-950/80 border border-[#86EFAC] dark:border-emerald-700 text-[#15803D] dark:text-emerald-200 rounded-2xl p-3.5 text-[15px] font-bold flex items-start gap-2.5"
          >
            <Check className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div>Pedido copiado! Cole no WhatsApp do fornecedor:</div>
              <div className="text-[14px] font-medium text-[#0F172A] dark:text-slate-100 mt-1">
                "{copiedMsg}"
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleCopyWhatsApp}
          className="w-full min-h-[52px] px-4 py-3 rounded-2xl bg-[#15803D] hover:bg-[#166534] dark:bg-emerald-600 dark:hover:bg-emerald-500 active:scale-[0.99] text-white font-extrabold text-[17px] flex items-center justify-center gap-2.5 transition-transform"
        >
          <Copy className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>Copiar pedido pro WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenSimulator(record.id)}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800 border-2 border-[#CBD5E1] dark:border-slate-700 hover:border-[#94A3B8] dark:hover:border-slate-500 active:scale-[0.99] text-[#0F172A] dark:text-slate-50 font-bold text-[16px] flex items-center justify-center gap-2 transition-transform"
        >
          <Calculator className="w-5 h-5 shrink-0 text-[#1D4ED8] dark:text-blue-300" aria-hidden="true" />
          <span>Simular outro cenário</span>
        </button>
      </section>

      {/* Notícias Recentes vinculadas ao NCM deste material */}
      {relatedNews.length > 0 && (
        <section aria-label="Notícias recentes que impactam este material" className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Newspaper
              className="w-5 h-5 text-[#1D4ED8] dark:text-blue-300 shrink-0"
              aria-hidden="true"
            />
            <h3 className="text-[17px] font-extrabold text-[#0F172A] dark:text-slate-50 leading-snug">
              Notícias Recentes que Impactam este Material
            </h3>
          </div>

          <div className="space-y-3">
            {relatedNews.map((newsItem) => (
              <NewsCard
                key={newsItem.id}
                item={newsItem}
                compact
                onOpenCalculator={() => onOpenSimulator(record.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
