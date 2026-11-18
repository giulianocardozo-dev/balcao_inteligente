import { useEffect, useRef, useState } from 'react';
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
  const missingItems = items.filter((item) => item.config.custoMedio <= 0);
  const missingCount = missingItems.length;
  const totalCount = items.length;

  const prevMissingRef = useRef<number>(missingCount);
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    if (prevMissingRef.current > 0 && missingCount === 0 && totalCount > 0) {
      setShowSavedToast(true);
      const timer = window.setTimeout(() => setShowSavedToast(false), 6000);
      prevMissingRef.current = missingCount;
      return () => window.clearTimeout(timer);
    }
    if (missingCount > 0 && showSavedToast) {
      setShowSavedToast(false);
    }
    prevMissingRef.current = missingCount;
  }, [missingCount, totalCount, showSavedToast]);

  if (totalCount === 0) return null;

  if (missingCount === 0) {
    if (!showSavedToast) return null;

    return (
      <div
        role="status"
        className="rounded-xl px-3.5 py-2.5 bg-[#DCFCE7] dark:bg-emerald-950/75 border border-[#86EFAC] dark:border-emerald-700 flex items-center gap-2"
      >
        <CheckCircle2
          className="w-4 h-4 text-[#15803D] dark:text-emerald-300 shrink-0"
          aria-hidden="true"
        />
        <p className="text-[13px] font-bold text-[#14532D] dark:text-emerald-100 leading-snug">
          Tudo certinho no balcão! Todos os {totalCount} preços de referência estão gravados.
        </p>
      </div>
    );
  }

  const isCurrentMissing = currentMaterialId
    ? missingItems.some((item) => item.record.id === currentMaterialId)
    : false;

  const nextTarget = currentMaterialId
    ? missingItems.find((item) => item.record.id !== currentMaterialId) ?? missingItems[0]
    : missingItems[0];

  const canJump =
    Boolean(onJumpToMaterial && nextTarget) &&
    (!currentMaterialId || !isCurrentMissing || missingCount > 1);

  const labelText =
    currentMaterialId && isCurrentMissing && missingCount === 1
      ? 'Informe o preço de referência abaixo para gravar.'
      : missingCount === 1
      ? `1 de ${totalCount} material sem preço de referência.`
      : `${missingCount} de ${totalCount} materiais sem preço de referência.`;

  if (canJump && onJumpToMaterial && nextTarget) {
    return (
      <button
        type="button"
        onClick={() => onJumpToMaterial(nextTarget.record.id)}
        className="w-full min-h-[44px] text-left rounded-xl px-3.5 py-2.5 bg-[#FEF3C7] dark:bg-amber-950/80 border border-[#F59E0B] dark:border-amber-500 flex items-center justify-between gap-2.5 hover:bg-[#FDE68A]/70 dark:hover:bg-amber-900/70 active:scale-[0.99] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <AlertTriangle
            className="w-4 h-4 text-[#B45309] dark:text-amber-300 shrink-0"
            aria-hidden="true"
          />
          <span className="text-[13px] font-extrabold text-[#78350F] dark:text-amber-100 leading-snug font-num">
            {labelText}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-[12.5px] font-extrabold text-[#92400E] dark:text-amber-200 whitespace-nowrap shrink-0">
          <span>{currentMaterialId ? 'Próximo' : 'Preencher'}</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </span>
      </button>
    );
  }

  return (
    <div
      role="alert"
      className="rounded-xl px-3.5 py-2.5 bg-[#FEF3C7] dark:bg-amber-950/80 border border-[#F59E0B] dark:border-amber-500 flex items-center gap-2"
    >
      <AlertTriangle
        className="w-4 h-4 text-[#B45309] dark:text-amber-300 shrink-0"
        aria-hidden="true"
      />
      <p className="text-[13px] font-extrabold text-[#78350F] dark:text-amber-100 leading-snug font-num">
        {labelText}
      </p>
    </div>
  );
}
