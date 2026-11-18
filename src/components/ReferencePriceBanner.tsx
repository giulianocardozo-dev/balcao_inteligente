import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { EvaluatedMaterial } from '../types/inventory';

interface ReferencePriceBannerProps {
  items: EvaluatedMaterial[];
  currentMaterialId?: string;
  onJumpToMaterial?: (materialId: string) => void;
}

export function ReferencePriceBanner({
  items,
  currentMaterialId,
  onJumpToMaterial,
}: ReferencePriceBannerProps) {
  if (items.length === 0) return null;

  const missingItems = items.filter((item) => item.config.custoMedio <= 0);
  const missingCount = missingItems.length;
  const totalCount = items.length;

  if (missingCount === 0) {
    return (
      <div
        role="status"
        className="rounded-2xl p-3.5 bg-[#DCFCE7] dark:bg-emerald-950/75 border border-[#86EFAC] dark:border-emerald-700 flex items-start gap-2.5"
      >
        <CheckCircle2
          className="w-5 h-5 text-[#15803D] dark:text-emerald-300 shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-extrabold text-[#14532D] dark:text-emerald-100 leading-snug">
            Tudo certinho no balcão!
          </p>
          <p className="text-[13px] font-semibold text-[#166534] dark:text-emerald-200 mt-0.5 leading-snug">
            Todos os {totalCount} preços de referência estão gravados e prontos para apoiar suas compras.
          </p>
        </div>
      </div>
    );
  }

  const isCurrentMissing = currentMaterialId
    ? missingItems.some((item) => item.record.id === currentMaterialId)
    : false;

  const nextTarget = currentMaterialId
    ? missingItems.find((item) => item.record.id !== currentMaterialId) ?? missingItems[0]
    : missingItems[0];

  const showJumpButton =
    Boolean(onJumpToMaterial && nextTarget) &&
    (!currentMaterialId || !isCurrentMissing || missingCount > 1);

  return (
    <div
      role="alert"
      className="rounded-2xl p-3.5 bg-[#FEF3C7] dark:bg-amber-950/80 border-2 border-[#F59E0B] dark:border-amber-500 flex items-start gap-2.5"
    >
      <AlertTriangle
        className="w-5 h-5 text-[#B45309] dark:text-amber-300 shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="text-[14px] font-extrabold text-[#78350F] dark:text-amber-100 leading-snug font-num">
            {missingCount === 1
              ? `1 de ${totalCount} materiais está sem preço de referência atualizado.`
              : `${missingCount} de ${totalCount} materiais estão sem preço de referência atualizados.`}
          </p>
          <p className="text-[13px] font-semibold text-[#92400E] dark:text-amber-200 mt-0.5 leading-snug">
            {currentMaterialId
              ? isCurrentMissing
                ? 'Preencha o campo "Preço de referência (R$)" abaixo para gravar.'
                : 'Este item já tem preço gravado, mas ainda há outros pendentes.'
              : 'Informe na aba Estoque para calcular o valor do pátio e a economia.'}
          </p>
        </div>

        {showJumpButton && onJumpToMaterial && nextTarget && (
          <button
            type="button"
            onClick={() => onJumpToMaterial(nextTarget.record.id)}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-[#D97706] dark:border-amber-400 text-[#92400E] dark:text-amber-200 text-[13px] font-extrabold inline-flex items-center gap-1.5 hover:bg-[#FFFBEB] dark:hover:bg-slate-800 active:scale-[0.99] transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
          >
            <span>
              {currentMaterialId
                ? `Próximo sem preço: ${nextTarget.record.insumo}`
                : `Informar agora (${nextTarget.record.insumo})`}
            </span>
            <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
