import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Minus, Plus } from 'lucide-react';
import { EvaluatedMaterial } from '../types/inventory';
import {
  computeBuyOrWaitSimulation,
  computeReorderSimulation,
  formatBRL,
  formatQty,
} from '../utils/mathEngine';

interface SimulateScreenProps {
  materials: EvaluatedMaterial[];
  selectedMaterialId: string;
  onSelectMaterial: (id: string) => void;
}

type SimMode = 'quando_pedir' | 'compro_ou_espero';

export function SimulateScreen({
  materials,
  selectedMaterialId,
  onSelectMaterial,
}: SimulateScreenProps) {
  const [mode, setMode] = useState<SimMode>('quando_pedir');

  const currentMaterial =
    materials.find((m) => m.record.id === selectedMaterialId) ?? materials[0];

  // Mode 1 states
  const [diasEntrega, setDiasEntrega] = useState<number>(
    currentMaterial?.config.diasEntrega ?? 5
  );
  const [vendas30d, setVendas30d] = useState<number>(
    currentMaterial?.config.vendas30d ?? 300
  );
  const [estoqueAtual, setEstoqueAtual] = useState<number>(
    currentMaterial?.config.estoqueAtual ?? 100
  );

  // Mode 2 states
  const [quantidade, setQuantidade] = useState<number>(
    Math.max(10, currentMaterial?.quantidadeSugerida || currentMaterial?.config.vendas30d || 100)
  );
  const [precoCotado, setPrecoCotado] = useState<number>(
    currentMaterial?.precoAtual ?? 50
  );
  const [diasEsperar, setDiasEsperar] = useState<number>(45);

  useEffect(() => {
    if (!currentMaterial) return;
    setDiasEntrega(currentMaterial.config.diasEntrega);
    setVendas30d(currentMaterial.config.vendas30d);
    setEstoqueAtual(currentMaterial.config.estoqueAtual);
    setQuantidade(
      Math.max(
        1,
        currentMaterial.quantidadeSugerida > 0
          ? currentMaterial.quantidadeSugerida
          : Math.round(currentMaterial.config.vendas30d)
      )
    );
    setPrecoCotado(currentMaterial.precoAtual);
  }, [currentMaterial?.record.id]);

  if (!currentMaterial) return null;

  const { record } = currentMaterial;

  const sim1 = computeReorderSimulation({
    vendas30d,
    diasEntrega,
    estoqueAtual,
    variacaoDemanda: currentMaterial.config.variacaoDemanda,
  });

  const sim2 = computeBuyOrWaitSimulation({
    precoAtual: currentMaterial.precoAtual,
    previsoes: record.previsoes,
    diasEntrega: currentMaterial.config.diasEntrega,
    diasQueDura: currentMaterial.diasQueDura,
    quantidade,
    precoCotado,
    diasEsperar,
  });

  const stepFor = (base: number) => (base >= 500 ? 50 : base >= 100 ? 10 : base >= 20 ? 5 : 1);
  const priceStep = currentMaterial.precoAtual >= 500 ? 10 : currentMaterial.precoAtual >= 100 ? 2 : 0.5;

  const parseNumericInput = (
    raw: string,
    setter: (val: number) => void,
    minVal: number,
    maxVal?: number
  ) => {
    const normalized = raw.replace(',', '.');
    if (normalized.trim() === '') {
      setter(minVal);
      return;
    }
    const parsed = Number(normalized);
    if (!Number.isNaN(parsed)) {
      const clampedMin = Math.max(minVal, parsed);
      setter(maxVal !== undefined ? Math.min(maxVal, clampedMin) : clampedMin);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[20px] font-extrabold text-[#0F172A] dark:text-slate-50">
          Calculadora de Balcão
        </h2>
        <p className="text-[14px] font-medium text-[#334155] dark:text-slate-300">
          Teste cenários com uma mão antes de fechar com o vendedor.
        </p>
      </div>

      {/* 2 Abas no topo */}
      <div
        role="tablist"
        aria-label="Modo de simulação"
        className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'quando_pedir'}
          onClick={() => setMode('quando_pedir')}
          className={`min-h-[48px] px-2 py-2 rounded-xl text-[14px] font-extrabold leading-tight transition-colors ${
            mode === 'quando_pedir'
              ? 'bg-[#0F172A] text-white dark:bg-slate-100 dark:text-slate-950'
              : 'text-[#334155] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-slate-50'
          }`}
        >
          Quando pedir de novo?
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'compro_ou_espero'}
          onClick={() => setMode('compro_ou_espero')}
          className={`min-h-[48px] px-2 py-2 rounded-xl text-[14px] font-extrabold leading-tight transition-colors ${
            mode === 'compro_ou_espero'
              ? 'bg-[#0F172A] text-white dark:bg-slate-100 dark:text-slate-950'
              : 'text-[#334155] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-slate-50'
          }`}
        >
          Compro hoje ou espero?
        </button>
      </div>

      {/* Seletor grande de Material */}
      <div>
        <label
          htmlFor="sim-material-select"
          className="block text-[14px] font-bold text-[#334155] dark:text-slate-200 mb-1.5"
        >
          Material para simular
        </label>
        <select
          id="sim-material-select"
          value={record.id}
          onChange={(e) => onSelectMaterial(e.target.value)}
          className="w-full min-h-[48px] px-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 text-[16px] font-bold text-[#0F172A] dark:text-slate-50"
        >
          {materials.map((m) => (
            <option key={m.record.id} value={m.record.id}>
              {m.record.insumo} ({m.record.unidadeComercial})
            </option>
          ))}
        </select>
      </div>

      {mode === 'quando_pedir' ? (
        <>
          {/* Controles Modo 1 */}
          <div className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-2xl p-4 space-y-3.5">
            {/* Controle 1: Dias pro caminhão entregar */}
            <div>
              <label
                htmlFor="sim-dias-entrega"
                className="block text-[14px] font-bold text-[#334155] dark:text-slate-200 mb-1.5"
              >
                Dias pro caminhão entregar
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Diminuir dias de entrega"
                  onClick={() => setDiasEntrega((v) => Math.max(1, v - 1))}
                  className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  id="sim-dias-entrega"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={diasEntrega}
                  onChange={(e) => parseNumericInput(e.target.value, setDiasEntrega, 1)}
                  className="flex-1 min-w-0 h-12 px-3 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 text-center text-[20px] font-extrabold text-[#0F172A] dark:text-slate-50 font-num"
                />
                <button
                  type="button"
                  aria-label="Aumentar dias de entrega"
                  onClick={() => setDiasEntrega((v) => v + 1)}
                  className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Controle 2: Vendas nos últimos 30 dias */}
            <div>
              <label
                htmlFor="sim-vendas-30d"
                className="block text-[14px] font-bold text-[#334155] dark:text-slate-200 mb-1.5"
              >
                Vendas nos últimos 30 dias ({record.unidadeComercial})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Diminuir vendas simuladas"
                  onClick={() => setVendas30d((v) => Math.max(0, v - stepFor(v)))}
                  className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  id="sim-vendas-30d"
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={vendas30d}
                  onChange={(e) => parseNumericInput(e.target.value, setVendas30d, 0)}
                  className="flex-1 min-w-0 h-12 px-3 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 text-center text-[20px] font-extrabold text-[#0F172A] dark:text-slate-50 font-num"
                />
                <button
                  type="button"
                  aria-label="Aumentar vendas simuladas"
                  onClick={() => setVendas30d((v) => v + stepFor(v))}
                  className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Controle 3: Estoque atual no pátio */}
            <div>
              <label
                htmlFor="sim-estoque-atual"
                className="block text-[14px] font-bold text-[#334155] dark:text-slate-200 mb-1.5"
              >
                Estoque atual no pátio ({record.unidadeComercial})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Diminuir estoque simulado"
                  onClick={() => setEstoqueAtual((v) => Math.max(0, v - stepFor(v)))}
                  className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  id="sim-estoque-atual"
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={estoqueAtual}
                  onChange={(e) => parseNumericInput(e.target.value, setEstoqueAtual, 0)}
                  className="flex-1 min-w-0 h-12 px-3 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 text-center text-[20px] font-extrabold text-[#0F172A] dark:text-slate-50 font-num"
                />
                <button
                  type="button"
                  aria-label="Aumentar estoque simulado"
                  onClick={() => setEstoqueAtual((v) => v + stepFor(v))}
                  className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Card de Resultado Modo 1 */}
          <div
            className={`rounded-2xl p-4 border-2 ${
              sim1.jaPassouDaHora
                ? 'bg-[#FEE2E2] dark:bg-red-950/80 border-[#B91C1C] dark:border-red-500'
                : 'bg-[#DBEAFE] dark:bg-blue-950/80 border-[#1D4ED8] dark:border-blue-500'
            }`}
          >
            <div className="text-[14px] font-bold text-[#334155] dark:text-slate-200">
              Resultado da conta
            </div>
            <div className="text-[26px] leading-tight font-extrabold text-[#0F172A] dark:text-slate-50 mt-1 font-num">
              Pedir de novo quando chegar em {formatQty(sim1.quandoPedirDeNovo)}{' '}
              {record.unidadeComercial}
            </div>

            <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/15 space-y-1.5 text-[15px] font-semibold text-[#0F172A] dark:text-slate-100 font-num">
              <div>
                Estoque dura{' '}
                <strong>
                  {sim1.diasQueDura >= 999
                    ? 'sem giro'
                    : `${sim1.diasQueDura} ${sim1.diasQueDura === 1 ? 'dia' : 'dias'}`}
                </strong>
              </div>
              {sim1.jaPassouDaHora ? (
                <div className="text-[#B91C1C] dark:text-red-200 font-extrabold">
                  Atenção ao Estoque: já chegou na hora de pedir! Sugestão de pedido:{' '}
                  {formatQty(sim1.quantidadeSugerida)} {record.unidadeComercial}.
                </div>
              ) : (
                <div className="text-[#1D4ED8] dark:text-blue-200 font-bold">
                  Você ainda tem cerca de{' '}
                  {sim1.diasAtePedir >= 999 ? 'vários' : sim1.diasAtePedir} dias até
                  atingir esse nível.
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Controles Modo 2 */}
          <div className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-2xl p-4 space-y-3.5">
            {/* Quantidade que quer comprar */}
            <div>
              <label
                htmlFor="sim-quantidade"
                className="block text-[14px] font-bold text-[#334155] dark:text-slate-200 mb-1.5"
              >
                Quantidade que quer comprar ({record.unidadeComercial})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  onClick={() => setQuantidade((v) => Math.max(1, v - stepFor(v)))}
                  className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  id="sim-quantidade"
                  type="number"
                  min={1}
                  inputMode="decimal"
                  value={quantidade}
                  onChange={(e) => parseNumericInput(e.target.value, setQuantidade, 1)}
                  className="flex-1 min-w-0 h-12 px-3 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 text-center text-[20px] font-extrabold text-[#0F172A] dark:text-slate-50 font-num"
                />
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  onClick={() => setQuantidade((v) => v + stepFor(v))}
                  className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preço cotado hoje pelo vendedor */}
            <div>
              <label
                htmlFor="sim-preco-cotado"
                className="block text-[14px] font-bold text-[#334155] dark:text-slate-200 mb-1.5"
              >
                Preço cotado hoje pelo vendedor (R$)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Diminuir preço cotado"
                  onClick={() =>
                    setPrecoCotado((v) => Math.max(0.01, Math.round((v - priceStep) * 100) / 100))
                  }
                  className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  id="sim-preco-cotado"
                  type="number"
                  min={0.01}
                  step="0.10"
                  inputMode="decimal"
                  value={precoCotado}
                  onChange={(e) => parseNumericInput(e.target.value, setPrecoCotado, 0.01)}
                  className="flex-1 min-w-0 h-12 px-3 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 text-center text-[20px] font-extrabold text-[#0F172A] dark:text-slate-50 font-num"
                />
                <button
                  type="button"
                  aria-label="Aumentar preço cotado"
                  onClick={() =>
                    setPrecoCotado((v) => Math.round((v + priceStep) * 100) / 100)
                  }
                  className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quantos dias pode esperar */}
            <div>
              <label
                htmlFor="sim-dias-esperar"
                className="block text-[14px] font-bold text-[#334155] dark:text-slate-200 mb-1.5"
              >
                Quantos dias pode esperar (máx. 90)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Diminuir dias de espera"
                  onClick={() => setDiasEsperar((v) => Math.max(1, v - 5))}
                  className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  id="sim-dias-esperar"
                  type="number"
                  min={1}
                  max={90}
                  inputMode="numeric"
                  value={diasEsperar}
                  onChange={(e) => parseNumericInput(e.target.value, setDiasEsperar, 1, 90)}
                  className="flex-1 min-w-0 h-12 px-3 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 text-center text-[20px] font-extrabold text-[#0F172A] dark:text-slate-50 font-num"
                />
                <button
                  type="button"
                  aria-label="Aumentar dias de espera"
                  onClick={() => setDiasEsperar((v) => Math.min(90, v + 5))}
                  className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 flex items-center justify-center text-[#0F172A] dark:text-slate-50 active:bg-[#E2E8F0] dark:active:bg-slate-700 shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Aviso vermelho se esperar causar falta no pátio */}
          {sim2.riscoFaltaNoPatio && (
            <div
              role="alert"
              className="rounded-2xl p-4 bg-[#FEE2E2] dark:bg-red-950/80 border-2 border-[#B91C1C] dark:border-red-500 flex items-start gap-3"
            >
              <AlertTriangle
                className="w-6 h-6 text-[#B91C1C] dark:text-red-200 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <div className="text-[16px] font-extrabold text-[#B91C1C] dark:text-red-200">
                  Risco de faltar produto no pátio!
                </div>
                <p className="text-[14px] font-semibold text-[#0F172A] dark:text-slate-100 mt-0.5 leading-snug font-num">
                  Seu estoque dura {currentMaterial.diasQueDura} dias e o caminhão leva{' '}
                  {currentMaterial.config.diasEntrega} dias. Se esperar {diasEsperar} dias,
                  você fica cerca de {sim2.diasSemProduto} dias sem mercadoria.
                </p>
              </div>
            </div>
          )}

          {/* Card de Resultado Modo 2 */}
          <div
            className={`rounded-2xl p-4 border-2 ${
              sim2.saldoComprarHoje >= 0
                ? 'bg-[#DCFCE7] dark:bg-emerald-950/80 border-[#15803D] dark:border-emerald-500'
                : 'bg-[#FEF3C7] dark:bg-amber-950/80 border-[#B45309] dark:border-amber-400'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2
                className={`w-6 h-6 shrink-0 mt-0.5 ${
                  sim2.saldoComprarHoje >= 0
                    ? 'text-[#15803D] dark:text-emerald-200'
                    : 'text-[#B45309] dark:text-amber-200'
                }`}
                aria-hidden="true"
              />
              <div>
                <div className="text-[14px] font-bold text-[#334155] dark:text-slate-200">
                  Veredito para {formatQty(quantidade)} {record.unidadeComercial}
                </div>
                <div className="text-[26px] leading-tight font-extrabold text-[#0F172A] dark:text-slate-50 mt-1 font-num">
                  {sim2.saldoComprarHoje >= 0
                    ? `Comprar hoje economiza ${formatBRL(sim2.saldoComprarHoje)}`
                    : `Esperar ${diasEsperar} dias economiza ${formatBRL(Math.abs(sim2.saldoComprarHoje))}`}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/15 grid grid-cols-2 gap-3 font-num">
              <div>
                <div className="text-[13px] font-semibold text-[#334155] dark:text-slate-200">
                  Preço-alvo máximo hoje
                </div>
                <div className="text-[20px] font-extrabold text-[#0F172A] dark:text-slate-50">
                  {formatBRL(sim2.precoAlvoMaximo)}
                </div>
                <div className="text-[12px] font-medium text-[#334155] dark:text-slate-300">
                  Acima disso, espere se tiver estoque
                </div>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#334155] dark:text-slate-200">
                  Preço esperado em {diasEsperar}d
                </div>
                <div className="text-[20px] font-extrabold text-[#0F172A] dark:text-slate-50">
                  {formatBRL(sim2.precoEsperadoNoPrazo)}
                </div>
                <div className="text-[12px] font-medium text-[#334155] dark:text-slate-300">
                  Total hoje: {formatBRL(sim2.custoHoje)}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
