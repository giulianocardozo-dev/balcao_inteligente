import { AlertTriangle, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { StorageLocation, TrafficLightStatus } from '../types/inventory';

export interface StatusMeta {
  status: TrafficLightStatus;
  label: string;
  shortLabel: string;
  description: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  leftAccentColor: string;
  solidColor: string;
}

export const STATUS_META: Record<TrafficLightStatus, StatusMeta> = {
  COMPRAR_AGORA: {
    status: 'COMPRAR_AGORA',
    label: 'ATENÇÃO AO ESTOQUE',
    shortLabel: 'Atenção ao Estoque',
    description: 'Pátio baixo. Avalie repor logo para não faltar ao cliente.',
    textColor: 'text-[#B91C1C] dark:text-red-200',
    bgColor: 'bg-[#FEE2E2] dark:bg-red-950/75',
    borderColor: 'border-[#FCA5A5] dark:border-red-700',
    leftAccentColor: 'border-l-[#B91C1C] dark:border-l-red-500',
    solidColor: 'bg-[#B91C1C] dark:bg-red-600 text-white',
  },
  ANTECIPAR_COMPRA: {
    status: 'ANTECIPAR_COMPRA',
    label: 'SINAL DE ALTA',
    shortLabel: 'Sinal de Alta',
    description: 'Estoque em dia, mas os dados apontam subida nos próximos 30 dias.',
    textColor: 'text-[#B45309] dark:text-amber-200',
    bgColor: 'bg-[#FEF3C7] dark:bg-amber-950/75',
    borderColor: 'border-[#FCD34D] dark:border-amber-600',
    leftAccentColor: 'border-l-[#B45309] dark:border-l-amber-400',
    solidColor: 'bg-[#B45309] dark:bg-amber-400 text-white dark:text-slate-950',
  },
  NAO_COMPRAR: {
    status: 'NAO_COMPRAR',
    label: 'SINAL DE QUEDA',
    shortLabel: 'Sinal de Queda',
    description: 'Estoque confortável e preços dando sinal de baixa.',
    textColor: 'text-[#15803D] dark:text-emerald-200',
    bgColor: 'bg-[#DCFCE7] dark:bg-emerald-950/75',
    borderColor: 'border-[#86EFAC] dark:border-emerald-700',
    leftAccentColor: 'border-l-[#15803D] dark:border-l-emerald-500',
    solidColor: 'bg-[#15803D] dark:bg-emerald-500 text-white dark:text-slate-950',
  },
  AGUARDAR: {
    status: 'AGUARDAR',
    label: 'MERCADO ESTÁVEL',
    shortLabel: 'Mercado Estável',
    description: 'Pátio abastecido e preços sem grandes mudanças recentes.',
    textColor: 'text-[#1D4ED8] dark:text-blue-200',
    bgColor: 'bg-[#DBEAFE] dark:bg-blue-950/75',
    borderColor: 'border-[#93C5FD] dark:border-blue-700',
    leftAccentColor: 'border-l-[#1D4ED8] dark:border-l-blue-500',
    solidColor: 'bg-[#1D4ED8] dark:bg-blue-600 text-white',
  },
};

export function getStatusDescription(
  status: TrafficLightStatus,
  storage: StorageLocation = 'patio'
): string {
  if (storage === 'prateleira') {
    if (status === 'COMPRAR_AGORA') {
      return 'Prateleira baixa. Avalie repor logo para não faltar ao cliente.';
    }
    if (status === 'AGUARDAR') {
      return 'Prateleira abastecida e preços sem grandes mudanças recentes.';
    }
  }
  return STATUS_META[status].description;
}

export function StatusIcon({
  status,
  className = 'w-4 h-4',
}: {
  status: TrafficLightStatus;
  className?: string;
}) {
  switch (status) {
    case 'COMPRAR_AGORA':
      return <AlertTriangle className={className} aria-hidden="true" />;
    case 'ANTECIPAR_COMPRA':
      return <TrendingUp className={className} aria-hidden="true" />;
    case 'NAO_COMPRAR':
      return <TrendingDown className={className} aria-hidden="true" />;
    case 'AGUARDAR':
      return <Clock className={className} aria-hidden="true" />;
  }
}

export function StatusChip({ status }: { status: TrafficLightStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[13px] font-bold tracking-tight whitespace-nowrap shrink-0 border ${meta.bgColor} ${meta.textColor} ${meta.borderColor}`}
    >
      <StatusIcon status={status} className="w-4 h-4 shrink-0" />
      <span>{meta.label}</span>
    </span>
  );
}
