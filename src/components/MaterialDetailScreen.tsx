import { useState } from 'react';
import {
  ArrowLeft,
  Calculator,
  Check,
  Copy,
  Minus,
  Plus,
} from 'lucide-react';
import { EvaluatedMaterial, StoreInventoryConfig } from '../types/inventory';
import {
  formatBRL,
  formatPercentSigned,
  formatQty,
} from '../utils/mathEngine';
import { PriceHistoryChart } from './PriceHistoryChart';
import { STATUS_META, StatusIcon } from './StatusVisuals';

interface MaterialDetailScreenProps {
  material: EvaluatedMaterial;
  allMaterials: EvaluatedMaterial[];
  onSelectMaterial: (id: string) => void;
  onUpdateConfig: (materialId: string, patch: Partial<StoreInventoryConfig>) => void;
  onBackToToday: () => void;
  onOpenSimulator: (materialId: string) => void;
}

export function MaterialDetailScreen({
  material,
  allMaterials,
  onSelectMaterial,
  onUpdateConfig,
  onBackToToday,
  onOpenSimulator,
}: MaterialDetailScreenProps) {
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  const { record, config } = material;
  const meta = STATUS_META[material.status];

  const orderQty =
    material.quantidadeSugerida > 0
      ? material.quantidadeSugerida
      : Math.max(1, Math.ceil(config.vendas30d));

  const handleCopyWhatsApp = async () => {
    const text = `Olá! Preciso cotar ${formatQty(orderQty)} ${record.unidadeComercial} de ${record.insumo} para entrega aqui na loja. Qual o melhor preço e prazo?`;

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

  const costDiffAbs = Math.abs(material.diferencaCustoReais);
  const costStatusText =
    Math.abs(material.diferencaCustoPct) < 0.005
      ? `Seu custo médio (${formatBRL(config.custoMedio)}) está igual ao preço de referência atual (${formatBRL(material.precoAtual)}).`
      : material.diferencaCustoReais < 0
      ? `Seu custo médio (${formatBRL(config.custoMedio)}) está ${formatBRL(costDiffAbs)} (${Math.abs(material.diferencaCustoPct * 100).toFixed(1).replace('.', ',')}%) mais barato que a referência atual (${formatBRL(material.precoAtual)}).`
      : `Seu custo médio (${formatBRL(config.custoMedio)}) está ${formatBRL(costDiffAbs)} (${Math.abs(material.diferencaCustoPct * 100).toFixed(1).replace('.', ',')}%) acima da referência atual (${formatBRL(material.precoAtual)}). Vale negociar desconto.`;

  return (
    <div className="space-y-4">
      {/* Top navigation & quick material switcher */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBackToToday}
          className="inline-flex items-center gap-1.5 min-h-[48px] px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[15px] font-bold text-[#0F172A] shrink-0 active:scale-[0.98]"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          <span>Voltar</span>
        </button>

        <select
          aria-label="Trocar material"
          value={record.id}
          onChange={(e) => onSelectMaterial(e.target.value)}
          className="flex-1 min-w-0 min-h-[48px] px-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-[15px] font-bold text-[#0F172A] truncate"
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
        <h2 className="text-[22px] font-extrabold text-[#0F172A] leading-tight">
          {record.insumo}
        </h2>
        <p className="text-[14px] font-medium text-[#334155] mt-0.5">
          Unidade: <span className="font-bold text-[#0F172A]">{record.unidadeComercial}</span>
        </p>

        <div className="mt-2.5 grid grid-cols-3 gap-2 pt-2.5 border-t border-[#E2E8F0]">
          <div>
            <div className="text-[12px] font-semibold text-[#334155]">Ref. hoje</div>
            <div className="text-[15px] font-extrabold text-[#0F172A] font-num">
              {formatBRL(material.precoAtual)}
            </div>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-[#334155]">Custo médio</div>
            <div className="text-[15px] font-extrabold text-[#0F172A] font-num">
              {formatBRL(config.custoMedio)}
            </div>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-[#334155]">Total estoque</div>
            <div className="text-[15px] font-extrabold text-[#0F172A] font-num">
              {formatBRL(custoTotalEstoque)}
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
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white ${meta.solidColor}`}
          >
            <StatusIcon status={material.status} className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-[18px] font-extrabold tracking-tight ${meta.textColor}`}>
              {meta.label}
            </div>
            <p className="text-[15px] font-semibold text-[#0F172A] mt-0.5 leading-snug">
              {meta.description}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-black/10 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[13px] font-semibold text-[#334155]">
              Quantidade sugerida
            </div>
            <div className="text-[24px] leading-tight font-extrabold text-[#0F172A] font-num mt-0.5">
              {material.quantidadeSugerida > 0
                ? `${formatQty(material.quantidadeSugerida)}`
                : '0'}
            </div>
            <div className="text-[13px] font-semibold text-[#334155]">
              {material.quantidadeSugerida > 0
                ? record.unidadeComercial
                : 'Não precisa pedir agora'}
            </div>
          </div>

          <div>
            <div className="text-[13px] font-semibold text-[#334155]">
              Economia estimada
            </div>
            <div className={`text-[24px] leading-tight font-extrabold font-num mt-0.5 ${material.economiaEstimada > 0 ? 'text-[#15803D]' : 'text-[#0F172A]'}`}>
              {material.economiaEstimada > 0
                ? formatBRL(material.economiaEstimada)
                : '—'}
            </div>
            <div className="text-[13px] font-semibold text-[#334155]">
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
      <section className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-4 space-y-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[17px] font-extrabold text-[#0F172A]">
            Ajustar números da sua loja
          </h3>
          <span className="text-[13px] font-semibold text-[#15803D]">
            Salva na hora
          </span>
        </div>

        {/* Estoque Atual */}
        <div>
          <label
            htmlFor="edit-estoque-atual"
            className="block text-[14px] font-bold text-[#334155] mb-1.5"
          >
            Estoque atual no pátio ({record.unidadeComercial})
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Diminuir estoque atual"
              onClick={() => adjustField('estoqueAtual', -stepAmount(config.estoqueAtual), 0)}
              className="w-12 h-12 rounded-xl bg-white border border-[#CBD5E1] flex items-center justify-center text-[#0F172A] active:bg-[#E2E8F0] shrink-0"
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
              className="flex-1 min-w-0 h-12 px-3 rounded-xl bg-white border border-[#CBD5E1] text-center text-[20px] font-extrabold text-[#0F172A] font-num"
            />
            <button
              type="button"
              aria-label="Aumentar estoque atual"
              onClick={() => adjustField('estoqueAtual', stepAmount(config.estoqueAtual), 0)}
              className="w-12 h-12 rounded-xl bg-white border border-[#CBD5E1] flex items-center justify-center text-[#0F172A] active:bg-[#E2E8F0] shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Vendas no mês */}
        <div>
          <label
            htmlFor="edit-vendas-mes"
            className="block text-[14px] font-bold text-[#334155] mb-1.5"
          >
            Vendas no mês ({record.unidadeComercial} nos últimos 30 dias)
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Diminuir vendas no mês"
              onClick={() => adjustField('vendas30d', -stepAmount(config.vendas30d), 0)}
              className="w-12 h-12 rounded-xl bg-white border border-[#CBD5E1] flex items-center justify-center text-[#0F172A] active:bg-[#E2E8F0] shrink-0"
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
              className="flex-1 min-w-0 h-12 px-3 rounded-xl bg-white border border-[#CBD5E1] text-center text-[20px] font-extrabold text-[#0F172A] font-num"
            />
            <button
              type="button"
              aria-label="Aumentar vendas no mês"
              onClick={() => adjustField('vendas30d', stepAmount(config.vendas30d), 0)}
              className="w-12 h-12 rounded-xl bg-white border border-[#CBD5E1] flex items-center justify-center text-[#0F172A] active:bg-[#E2E8F0] shrink-0"
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
              className="block text-[11px] min-[410px]:text-[12.5px] font-bold text-[#334155] tracking-tight leading-tight whitespace-nowrap mb-1.5"
            >
              Dias pro caminhão entregar
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Diminuir dias de entrega"
                onClick={() => adjustField('diasEntrega', -1, 1)}
                className="w-12 h-12 rounded-xl bg-white border border-[#CBD5E1] flex items-center justify-center text-[#0F172A] active:bg-[#E2E8F0] shrink-0"
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
                className="w-full min-w-0 h-12 px-1 rounded-xl bg-white border border-[#CBD5E1] text-center text-[18px] font-extrabold text-[#0F172A] font-num"
              />
              <button
                type="button"
                aria-label="Aumentar dias de entrega"
                onClick={() => adjustField('diasEntrega', 1, 1)}
                className="w-12 h-12 rounded-xl bg-white border border-[#CBD5E1] flex items-center justify-center text-[#0F172A] active:bg-[#E2E8F0] shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-custo-medio"
              className="block text-[11px] min-[410px]:text-[12.5px] font-bold text-[#334155] tracking-tight leading-tight whitespace-nowrap mb-1.5"
            >
              Seu custo médio (R$)
            </label>
            <input
              id="edit-custo-medio"
              aria-describedby="edit-custo-medio-help"
              type="number"
              min={0}
              step="0.10"
              inputMode="decimal"
              value={config.custoMedio}
              onChange={(e) => handleNumberInput('custoMedio', e.target.value, 0)}
              className="w-full h-12 px-3 rounded-xl bg-white border border-[#CBD5E1] text-center text-[18px] font-extrabold text-[#0F172A] font-num"
            />
            <p
              id="edit-custo-medio-help"
              className="text-[12px] font-medium text-[#334155] mt-1.5 leading-snug"
            >
              Quanto pagou por unidade para comparar com a média regional
            </p>
          </div>
        </div>
      </section>

      {/* 3 Explicações Diretas (Por que fazer isso?) */}
      <section className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-4 space-y-3">
        <h3 className="text-[17px] font-extrabold text-[#0F172A]">
          Por que fazer isso?
        </h3>

        <div className="pt-1 border-t border-[#E2E8F0]">
          <div className="text-[14px] font-bold text-[#0F172A]">
            1. Seu Estoque
          </div>
          <p className="text-[15px] text-[#334155] mt-0.5 leading-snug font-num">
            {material.diasQueDura >= 999
              ? 'Sem vendas registradas no mês'
              : `Dura ${material.diasQueDura} ${material.diasQueDura === 1 ? 'dia' : 'dias'}`}{' '}
            · Caminhão leva {config.diasEntrega}{' '}
            {config.diasEntrega === 1 ? 'dia' : 'dias'} · Pedir de novo quando chegar em{' '}
            <strong className="text-[#0F172A]">
              {formatQty(material.quandoPedirDeNovo)} {record.unidadeComercial}
            </strong>
            .
          </p>
        </div>

        <div className="pt-2.5 border-t border-[#E2E8F0]">
          <div className="text-[14px] font-bold text-[#0F172A]">
            2. O que vai acontecer com o preço
          </div>
          <p className="text-[15px] text-[#334155] mt-0.5 leading-snug font-num">
            Hoje <strong className="text-[#0F172A]">{formatBRL(material.precoAtual)}</strong> → Em 45 dias{' '}
            <strong className="text-[#0F172A]">{formatBRL(material.preco45d)}</strong> (
            <span
              className={
                material.tendencia === 'alta'
                  ? 'font-bold text-[#B45309]'
                  : material.tendencia === 'queda'
                  ? 'font-bold text-[#15803D]'
                  : 'font-bold text-[#334155]'
              }
            >
              {formatPercentSigned(material.var45d)}
            </span>
            ) · Em 3 meses{' '}
            <strong className="text-[#0F172A]">{formatBRL(material.preco90d)}</strong> (
            {formatPercentSigned(material.var90d)}).
          </p>
        </div>

        <div className="pt-2.5 border-t border-[#E2E8F0]">
          <div className="text-[14px] font-bold text-[#0F172A]">
            3. Seu Custo
          </div>
          <p className="text-[15px] text-[#334155] mt-0.5 leading-snug font-num">
            {costStatusText}
          </p>
        </div>
      </section>

      {/* Gráfico Simples (SVG leve) */}
      <PriceHistoryChart
        historico={record.historico}
        previsoes={record.previsoes}
        tendencia={material.tendencia}
      />

      {/* Ações Principais */}
      <section className="space-y-2.5 pt-1">
        {copiedMsg && (
          <div
            role="status"
            className="bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] rounded-2xl p-3.5 text-[15px] font-bold flex items-start gap-2.5"
          >
            <Check className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div>Pedido copiado! Cole no WhatsApp do fornecedor:</div>
              <div className="text-[14px] font-medium text-[#0F172A] mt-1">
                "{copiedMsg}"
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleCopyWhatsApp}
          className="w-full min-h-[52px] px-4 py-3 rounded-2xl bg-[#15803D] hover:bg-[#166534] active:scale-[0.99] text-white font-extrabold text-[17px] flex items-center justify-center gap-2.5 transition-transform"
        >
          <Copy className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>Copiar pedido pro WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenSimulator(record.id)}
          className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-[#F8FAFC] border-2 border-[#CBD5E1] hover:border-[#94A3B8] active:scale-[0.99] text-[#0F172A] font-bold text-[16px] flex items-center justify-center gap-2 transition-transform"
        >
          <Calculator className="w-5 h-5 shrink-0 text-[#1D4ED8]" aria-hidden="true" />
          <span>Simular outro cenário</span>
        </button>
      </section>
    </div>
  );
}
