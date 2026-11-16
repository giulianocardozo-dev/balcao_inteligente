import { AlertTriangle, Clock, TrendingDown, TrendingUp } from 'lucide-react';
import { TrafficLightStatus } from '../types/inventory';

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
    description: 'Volume baixo no pátio — avalie a reposição para evitar falta ao cliente.',
    textColor: 'text-[#B91C1C]',
    bgColor: 'bg-[#FEE2E2]',
    borderColor: 'border-[#FCA5A5]',
    leftAccentColor: 'border-l-[#B91C1C]',
    solidColor: 'bg-[#B91C1C]',
  },
  ANTECIPAR_COMPRA: {
    status: 'ANTECIPAR_COMPRA',
    label: 'PRESSÃO DE ALTA',
    shortLabel: 'Pressão de Alta',
    description: 'Estoque suficiente, mas a tendência estatística aponta alta nos próximos 30 dias.',
    textColor: 'text-[#B45309]',
    bgColor: 'bg-[#FEF3C7]',
    borderColor: 'border-[#FCD34D]',
    leftAccentColor: 'border-l-[#B45309]',
    solidColor: 'bg-[#B45309]',
  },
  NAO_COMPRAR: {
    status: 'NAO_COMPRAR',
    label: 'TENDÊNCIA DE ACOMODAÇÃO',
    shortLabel: 'Tendência de Acomodação',
    description: 'Estoque confortável e mercado com viés de queda ou estabilidade.',
    textColor: 'text-[#15803D]',
    bgColor: 'bg-[#DCFCE7]',
    borderColor: 'border-[#86EFAC]',
    leftAccentColor: 'border-l-[#15803D]',
    solidColor: 'bg-[#15803D]',
  },
  AGUARDAR: {
    status: 'AGUARDAR',
    label: 'MERCADO ESTÁVEL',
    shortLabel: 'Mercado Estável',
    description: 'Pátio abastecido e preços firmes, sem pressão imediata de compra.',
    textColor: 'text-[#1D4ED8]',
    bgColor: 'bg-[#DBEAFE]',
    borderColor: 'border-[#93C5FD]',
    leftAccentColor: 'border-l-[#1D4ED8]',
    solidColor: 'bg-[#1D4ED8]',
  },
};

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
