import { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Check,
  CircleDollarSign,
  ExternalLink,
  Minus,
  Newspaper,
  Plus,
  X,
} from 'lucide-react';
import { formatNewsDateLabel, getNewsForMaterial } from '../data/marketNews';
import { EvaluatedMaterial, MarketNewsItem, StoreInventoryConfig } from '../types/inventory';
import {
  formatBRL,
  formatDays,
  formatPercentSigned,
  formatQty,
  formatUnit,
  getMaterialStorageLocation,
  getStoragePreposition,
} from '../utils/mathEngine';
import { PriceHistoryChart } from './PriceHistoryChart';
import { ReferencePriceBanner } from './ReferencePriceBanner';
import { getStatusDescription, STATUS_META, StatusIcon } from './StatusVisuals';

interface MaterialDetailScreenProps {
  material: EvaluatedMaterial;
  allMaterials: EvaluatedMaterial[];
  newsItems?: MarketNewsItem[];
  onSelectMaterial: (id: string) => void;
  onUpdateConfig: (materialId: string, patch: Partial<StoreInventoryConfig>) => void;
  onOpenSimulator: (materialId: string) => void;
  isDark?: boolean;
}

export function MaterialDetailScreen({
  material,
  allMaterials,
  newsItems,
  onSelectMaterial,
  onUpdateConfig,
  onOpenSimulator,
  isDark = false,
}: MaterialDetailScreenProps) {
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppQtyInput, setWhatsAppQtyInput] = useState<string>('1');

  const { record, config } = material;
  const meta = STATUS_META[material.status];
  const storageLocation = getMaterialStorageLocation(record);
  const storagePrep = getStoragePreposition(record);
  const relatedNews = getNewsForMaterial(record.id, record.insumo, 2, newsItems);

  const suggestedOrderQty =
    material.quantidadeSugerida > 0
      ? material.quantidadeSugerida
      : Math.max(1, Math.ceil(config.vendas30d));

  useEffect(() => {
    setShowWhatsAppModal(false);
  }, [record.id]);

  useEffect(() => {
    if (!showWhatsAppModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowWhatsAppModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showWhatsAppModal]);

  const parsedWhatsAppQty = (() => {
    const normalized = whatsAppQtyInput.replace(',', '.').trim();
    if (!normalized) return 0;
    const num = Number(normalized);
    return Number.isFinite(num) && num > 0 ? Math.round(num * 100) / 100 : 0;
  })();

  const buildWhatsAppText = (qty: number) =>
    `Olá! Preciso cotar ${formatQty(qty)} ${formatUnit(record.unidadeComercial, qty)} de ${record.insumo} para entrega aqui na loja. Qual o melhor preço e prazo?`;

  const openWhatsAppModal = () => {
    setWhatsAppQtyInput(String(suggestedOrderQty));
    setShowWhatsAppModal(true);
  };

  const adjustWhatsAppQty = (delta: number) => {
    const base = parsedWhatsAppQty > 0 ? parsedWhatsAppQty : suggestedOrderQty;
    const next = Math.max(1, Math.round(base + delta));
    setWhatsAppQtyInput(String(next));
  };

  const handleConfirmWhatsApp = () => {
    if (parsedWhatsAppQty <= 0) return;
    const qtyToSend = parsedWhatsAppQty;
    const text = buildWhatsAppText(qtyToSend);

    setShowWhatsAppModal(false);
    setCopiedMsg(text);
    window.setTimeout(() => setCopiedMsg(null), 4000);

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    } else {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        // ignore clipboard fallback failure
      }
    }
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

      {/* Quick material switcher */}
      <div>
        <select
          aria-label="Trocar material"
          value={record.id}
          onChange={(e) => onSelectMaterial(e.target.value)}
          className="w-full min-w-0 min-h-[48px] px-3 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 text-[15px] font-bold text-[#0F172A] dark:text-slate-50 truncate"
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
            <div className="text-[12px] font-semibold text-[#334155] dark:text-slate-300">Tendência $ 45 d</div>
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
              {getStatusDescription(material.status, storageLocation, material.tendencia)}
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

        <div className="mt-3 pt-2.5 border-t border-black/10 dark:border-white/15 text-[12.5px] font-bold text-[#334155] dark:text-slate-200 font-num leading-snug text-center">
          Pedir de novo com{' '}
          <span className="font-extrabold text-[#0F172A] dark:text-slate-50">
            {formatQty(material.quandoPedirDeNovo)}{' '}
            {formatUnit(record.unidadeComercial, material.quandoPedirDeNovo)}
          </span>
          <span className="mx-1.5 opacity-60" aria-hidden="true">·</span>
          Duração:{' '}
          <span className="font-extrabold text-[#0F172A] dark:text-slate-50">
            {material.diasQueDura >= 999 ? 'sem giro recente' : `~${formatDays(material.diasQueDura)}`}
          </span>
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
            Estoque atual {storagePrep} ({formatUnit(record.unidadeComercial)})
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
              step="0.01"
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
              className={`text-[12px] mt-1 leading-snug ${
                hasRefPrice
                  ? 'font-medium text-[#334155] dark:text-slate-300'
                  : 'font-bold text-[#B45309] dark:text-amber-300'
              }`}
            >
              {hasRefPrice ? 'Salvo automaticamente.' : 'Obrigatório informar.'}
            </p>
          </div>
        </div>

        <p className="text-[12.5px] font-medium text-[#475569] dark:text-slate-300 leading-snug">
          Fique tranquilo: apenas você tem acesso a este preço.
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
              <div>Pedido pronto! Redirecionando para o WhatsApp:</div>
              <div className="text-[14px] font-medium text-[#0F172A] dark:text-slate-100 mt-1">
                "{copiedMsg}"
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={openWhatsAppModal}
          className="w-full min-h-[52px] px-4 py-3 rounded-2xl bg-[#2AB318] hover:bg-[#249c14] dark:bg-[#2AB318] dark:hover:bg-[#249c14] active:scale-[0.99] text-white font-extrabold text-[17px] flex items-center justify-center gap-2.5 transition-transform shadow-md"
        >
          <img src="/assets/aistudio/WA_801d73ea.png" alt="WhatsApp" className="w-6 h-6 shrink-0 rounded-sm object-contain" />
          <span>Enviar cotação por WhatsApp</span>
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

          <div className="space-y-2.5">
            {relatedNews.map((newsItem) => (
              <a
                key={newsItem.id}
                href={newsItem.articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 hover:border-[#1D4ED8] dark:hover:border-blue-400 p-3.5 space-y-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
              >
                <div className="flex items-center justify-between gap-2 text-[12px] font-bold text-[#475569] dark:text-slate-300">
                  <span className="inline-flex items-center gap-1 text-[#1D4ED8] dark:text-blue-300">
                    <span>{newsItem.fonte}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                  </span>
                  <span>{formatNewsDateLabel(newsItem.publishedAt)}</span>
                </div>
                <div className="text-[14.5px] font-extrabold text-[#0F172A] dark:text-slate-50 leading-snug">
                  {newsItem.titulo}
                </div>
                <div className="text-[12px] font-bold text-[#334155] dark:text-slate-300">
                  {newsItem.sinalLabel}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Pop-up de confirmação de quantidade para WhatsApp */}
      {showWhatsAppModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="whatsapp-qty-modal-title"
          onClick={() => setShowWhatsAppModal(false)}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[400px] rounded-2xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 shadow-2xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3
                  id="whatsapp-qty-modal-title"
                  className="text-[18px] font-extrabold text-[#0F172A] dark:text-slate-50 leading-snug"
                >
                  Confirmar quantidade para cotação
                </h3>
                <p className="text-[13px] font-medium text-[#475569] dark:text-slate-300 mt-0.5">
                  {record.insumo}
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar pop-up"
                onClick={() => setShowWhatsAppModal(false)}
                className="w-9 h-9 rounded-xl bg-[#F1F5F9] dark:bg-slate-800 text-[#334155] dark:text-slate-300 hover:bg-[#E2E8F0] dark:hover:bg-slate-700 flex items-center justify-center shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="whatsapp-qty-input"
                  className="text-[13.5px] font-bold text-[#334155] dark:text-slate-200"
                >
                  Quantidade ({formatUnit(record.unidadeComercial, parsedWhatsAppQty || suggestedOrderQty)})
                </label>
                <button
                  type="button"
                  onClick={() => setWhatsAppQtyInput(String(suggestedOrderQty))}
                  className="text-[12px] font-bold text-[#1D4ED8] dark:text-blue-300 hover:underline font-num"
                >
                  Sugerida: {formatQty(suggestedOrderQty)}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Diminuir quantidade da cotação"
                  onClick={() =>
                    adjustWhatsAppQty(-stepAmount(parsedWhatsAppQty || suggestedOrderQty))
                  }
                  className="w-12 h-12 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
                >
                  <Minus className="w-5 h-5" />
                </button>

                <input
                  id="whatsapp-qty-input"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  autoFocus
                  value={whatsAppQtyInput}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setWhatsAppQtyInput(e.target.value)}
                  className="flex-1 min-w-0 h-12 px-3 rounded-xl bg-white dark:bg-slate-950 border-2 border-[#CBD5E1] dark:border-slate-600 focus:border-[#2AB318] dark:focus:border-[#2AB318] focus:outline-none text-center text-[22px] font-extrabold text-[#0F172A] dark:text-slate-50 font-num"
                />

                <button
                  type="button"
                  aria-label="Aumentar quantidade da cotação"
                  onClick={() =>
                    adjustWhatsAppQty(stepAmount(parsedWhatsAppQty || suggestedOrderQty))
                  }
                  className="w-12 h-12 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {parsedWhatsAppQty <= 0 && (
                <p className="text-[12.5px] font-bold text-[#B91C1C] dark:text-red-300 mt-1.5">
                  Informe uma quantidade maior que zero para enviar a cotação.
                </p>
              )}
            </div>

            {parsedWhatsAppQty > 0 && (
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-slate-700 p-3">
                <div className="text-[11px] font-bold uppercase tracking-wide text-[#475569] dark:text-slate-400 mb-1">
                  Prévia da mensagem
                </div>
                <p className="text-[13px] font-medium text-[#0F172A] dark:text-slate-100 leading-snug">
                  "{buildWhatsAppText(parsedWhatsAppQty)}"
                </p>
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                className="min-h-[48px] px-4 rounded-xl bg-[#F1F5F9] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-600 text-[#0F172A] dark:text-slate-100 font-bold text-[15px] hover:bg-[#E2E8F0] dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={parsedWhatsAppQty <= 0}
                onClick={handleConfirmWhatsApp}
                className="flex-1 min-h-[48px] px-4 rounded-xl bg-[#2AB318] hover:bg-[#249c14] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] text-white font-extrabold text-[15px] flex items-center justify-center gap-2 transition-transform shadow-sm"
              >
                <img
                  src="/assets/aistudio/WA_801d73ea.png"
                  alt=""
                  aria-hidden="true"
                  className="w-5 h-5 shrink-0 rounded-sm object-contain"
                />
                <span>Confirmar e enviar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
