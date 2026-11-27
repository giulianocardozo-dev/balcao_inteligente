import { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  Info,
  Loader2,
  LocateFixed,
  Mail,
  MapPin,
  Moon,
  RefreshCw,
  Settings,
  Store,
  Sun,
  User,
} from 'lucide-react';
import { ForecastSyncSource, SubscriptionPlanId, UserProfile } from '../types/inventory';
import { formatSyncTimestamp } from '../utils/forecastSync';
import { PWAInstallButton } from './PWAInstallButton';

interface PlanOption {
  id: SubscriptionPlanId;
  name: string;
  badge: string;
  priceLabel: string;
  description: string;
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: 'essencial',
    name: 'Balcão Essencial',
    badge: 'Plano atual',
    priceLabel: 'Grátis',
    description: 'Alertas de compra, calculadora de balcão e notícias de mercado para 1 depósito.',
  },
  {
    id: 'pro',
    name: 'Balcão Pro',
    badge: 'Em breve',
    priceLabel: 'Assinatura futura',
    description: 'Alertas por WhatsApp, comparativo de cotações e histórico ampliado de preços.',
  },
  {
    id: 'rede',
    name: 'Rede & Depósitos',
    badge: 'Em breve',
    priceLabel: 'Assinatura futura',
    description: 'Painel unificado para múltiplas filiais, equipe de compras e limites por loja.',
  },
];

interface SettingsScreenProps {
  profile: UserProfile;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  updatedAtIso: string;
  syncSource: ForecastSyncSource;
  forecastSyncing: boolean;
  forecastSyncNotice: { type: 'info' | 'warn'; text: string } | null;
  onRefreshForecast: () => void;
  selectedUf: string;
  availableUfs: string[];
  onSelectUf: (uf: string) => void;
  onDetectUf: () => void;
  geoLoading: boolean;
  geoNotice: { type: 'info' | 'warn'; text: string } | null;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function SettingsScreen({
  profile,
  onUpdateProfile,
  updatedAtIso,
  syncSource,
  forecastSyncing,
  forecastSyncNotice,
  onRefreshForecast,
  selectedUf,
  availableUfs,
  onSelectUf,
  onDetectUf,
  geoLoading,
  geoNotice,
  isDark,
  onToggleTheme,
}: SettingsScreenProps) {
  const [name, setName] = useState(profile.name);
  const [storeName, setStoreName] = useState(profile.storeName);
  const [email, setEmail] = useState(profile.email);
  const [planFeedback, setPlanFeedback] = useState<string | null>(null);
  const [showOrientation, setShowOrientation] = useState(false);

  useEffect(() => {
    setName(profile.name);
    setStoreName(profile.storeName);
    setEmail(profile.email);
  }, [profile.name, profile.storeName, profile.email]);

  const handleSelectPlan = (planId: SubscriptionPlanId) => {
    onUpdateProfile({ selectedPlan: planId });
    const chosen = PLAN_OPTIONS.find((p) => p.id === planId);
    if (planId === 'essencial') {
      setPlanFeedback('Você está utilizando o plano Balcão Essencial gratuito.');
    } else if (chosen) {
      setPlanFeedback(
        `Preferência registrada: ${chosen.name}. A mudança de plano estará disponível em breve.`
      );
    }
  };

  const selectedPlanObj =
    PLAN_OPTIONS.find((p) => p.id === profile.selectedPlan) ?? PLAN_OPTIONS[0];

  return (
    <div className="space-y-5">
      {/* Cabeçalho da Tela */}
      <div className="flex items-center gap-2">
        <Settings
          className="w-5 h-5 text-[#1D4ED8] dark:text-blue-300 shrink-0"
          aria-hidden="true"
        />
        <h2 className="text-[20px] font-extrabold text-[#0F172A] dark:text-slate-50">
          Configurações
        </h2>
      </div>

      {/* Seção 1: Perfil do Usuário e da Loja */}
      <section
        aria-label="Perfil do usuário e da loja"
        className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-2xl p-4 space-y-3.5"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[16px] font-extrabold text-[#0F172A] dark:text-slate-50">
            Perfil da loja
          </h3>
          <span className="text-[12px] font-semibold text-[#15803D] dark:text-emerald-300">
            Salvo automaticamente
          </span>
        </div>

        <div>
          <label
            htmlFor="cfg-user-name"
            className="flex items-center gap-1.5 text-[14px] font-bold text-[#334155] dark:text-slate-200 mb-1.5"
          >
            <User className="w-4 h-4 text-[#1D4ED8] dark:text-blue-300 shrink-0" aria-hidden="true" />
            <span>Seu nome</span>
          </label>
          <input
            id="cfg-user-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              onUpdateProfile({ name: e.target.value });
            }}
            placeholder="Ex.: Marcos Oliveira"
            className="w-full min-h-[48px] px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 text-[15px] font-semibold text-[#0F172A] dark:text-slate-50 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
          />
        </div>

        <div>
          <label
            htmlFor="cfg-store-name"
            className="flex items-center gap-1.5 text-[14px] font-bold text-[#334155] dark:text-slate-200 mb-1.5"
          >
            <Store className="w-4 h-4 text-[#1D4ED8] dark:text-blue-300 shrink-0" aria-hidden="true" />
            <span>Nome da loja</span>
          </label>
          <input
            id="cfg-store-name"
            type="text"
            value={storeName}
            onChange={(e) => {
              const next = e.target.value;
              setStoreName(next);
              onUpdateProfile({ storeName: next });
            }}
            placeholder="Ex.: Depósito Oliveira"
            className="w-full min-h-[48px] px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 text-[15px] font-semibold text-[#0F172A] dark:text-slate-50 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
          />
        </div>

        <div>
          <label
            htmlFor="cfg-user-email"
            className="flex items-center gap-1.5 text-[14px] font-bold text-[#334155] dark:text-slate-200 mb-1.5"
          >
            <Mail className="w-4 h-4 text-[#1D4ED8] dark:text-blue-300 shrink-0" aria-hidden="true" />
            <span>E-mail</span>
          </label>
          <input
            id="cfg-user-email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              onUpdateProfile({ email: e.target.value });
            }}
            placeholder="contato@sualoja.com.br"
            className="w-full min-h-[48px] px-3.5 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 text-[15px] font-semibold text-[#0F172A] dark:text-slate-50 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
          />
        </div>

        <div className="pt-1 border-t border-[#E2E8F0] dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[12.5px] font-bold text-[#334155] dark:text-slate-200 leading-snug">
                Projeções de preços:{' '}
                <span className="text-[#15803D] dark:text-emerald-300">
                  {syncSource === 'github'
                    ? 'GitHub (automático)'
                    : syncSource === 'cache'
                      ? 'Servidor local'
                      : 'Base padrão'}
                </span>
              </p>
              <p className="text-[12px] font-medium text-[#475569] dark:text-slate-300 font-num">
                Atualizado em: {formatSyncTimestamp(updatedAtIso)}
              </p>
            </div>

            <button
              type="button"
              onClick={onRefreshForecast}
              disabled={forecastSyncing}
              aria-label="Atualizar projeções de preços agora"
              className="min-h-[40px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#0F172A] dark:text-slate-100 hover:border-[#94A3B8] dark:hover:border-slate-400 active:bg-[#E2E8F0] dark:active:bg-slate-700 disabled:opacity-60 shrink-0 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#1D4ED8] dark:text-blue-300 shrink-0 ${
                  forecastSyncing ? 'animate-spin' : ''
                }`}
                aria-hidden="true"
              />
              <span>{forecastSyncing ? 'Buscando...' : 'Atualizar'}</span>
            </button>
          </div>

          {forecastSyncNotice && (
            <div
              role="status"
              className={`px-3 py-2 rounded-xl text-[12.5px] font-bold border ${
                forecastSyncNotice.type === 'info'
                  ? 'bg-[#DCFCE7] dark:bg-emerald-950/80 border-[#86EFAC] dark:border-emerald-700 text-[#15803D] dark:text-emerald-200'
                  : 'bg-[#FEF3C7] dark:bg-amber-950/80 border-[#FCD34D] dark:border-amber-600 text-[#B45309] dark:text-amber-200'
              }`}
            >
              {forecastSyncNotice.text}
            </div>
          )}
        </div>
      </section>

      {/* Seção 2: Região e Aparência */}
      <section
        aria-label="Região e aparência"
        className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-2xl p-4 space-y-3"
      >
        <h3 className="text-[16px] font-extrabold text-[#0F172A] dark:text-slate-50">
          Região e aparência
        </h3>

        <div className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-[#1D4ED8] dark:text-blue-300 shrink-0" aria-hidden="true" />
          <label htmlFor="cfg-uf-selector" className="text-[14px] font-bold text-[#334155] dark:text-slate-200">
            UF:
          </label>
          <select
            id="cfg-uf-selector"
            value={selectedUf}
            onChange={(e) => onSelectUf(e.target.value)}
            className="min-h-[44px] px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 text-[14px] font-extrabold text-[#0F172A] dark:text-slate-50 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
          >
            {availableUfs.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onDetectUf}
            aria-label="Detectar estado pela minha localização"
            className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#0F172A] dark:text-slate-100 hover:border-[#94A3B8] dark:hover:border-slate-400 active:bg-[#E2E8F0] dark:active:bg-slate-700 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
          >
            {geoLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#1D4ED8] dark:text-blue-300 shrink-0" aria-hidden="true" />
            ) : (
              <LocateFixed className="w-4 h-4 text-[#1D4ED8] dark:text-blue-300 shrink-0" aria-hidden="true" />
            )}
            <span>Localizar</span>
          </button>
        </div>

        {geoNotice && (
          <div
            role="status"
            className={`px-3 py-2 rounded-xl text-[13px] font-bold border ${
              geoNotice.type === 'info'
                ? 'bg-[#DBEAFE] dark:bg-blue-950/80 border-[#93C5FD] dark:border-blue-700 text-[#1D4ED8] dark:text-blue-200'
                : 'bg-[#FEF3C7] dark:bg-amber-950/80 border-[#FCD34D] dark:border-amber-600 text-[#B45309] dark:text-amber-200'
            }`}
          >
            {geoNotice.text}
          </div>
        )}

        <div className="flex justify-start">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-pressed={isDark}
            aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            className="min-h-[44px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-600 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#0F172A] dark:text-slate-100 hover:border-[#94A3B8] dark:hover:border-slate-400 active:bg-[#E2E8F0] dark:active:bg-slate-700 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
                <span>Modo claro</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#1D4ED8] shrink-0" aria-hidden="true" />
                <span>Modo escuro</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Instalar aplicativo (Android, iOS e Windows) */}
      <PWAInstallButton variant="settings" />

      {/* Seção 3: Plano de Assinatura (Futuro) */}
      <section
        aria-label="Plano de assinatura"
        className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-2xl p-4 space-y-3.5"
      >
        <div className="flex items-start gap-2">
          <Crown
            className="w-5 h-5 text-[#B45309] dark:text-amber-300 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <h3 className="text-[16px] font-extrabold text-[#0F172A] dark:text-slate-50">
              Plano de assinatura
            </h3>
            <p className="text-[13px] font-medium text-[#475569] dark:text-slate-300 mt-0.5 leading-snug">
              Escolha o plano que pretende utilizar quando a assinatura for liberada no aplicativo.
            </p>
          </div>
        </div>

        <div
          role="radiogroup"
          aria-label="Opções de plano de assinatura"
          className="space-y-2.5"
        >
          {PLAN_OPTIONS.map((plan) => {
            const isSelected = profile.selectedPlan === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelectPlan(plan.id)}
                className={`w-full text-left rounded-xl p-3.5 border-2 transition-colors min-h-[48px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400 ${
                  isSelected
                    ? 'bg-[#DBEAFE]/65 dark:bg-blue-950/75 border-[#1D4ED8] dark:border-blue-400'
                    : 'bg-white dark:bg-slate-900 border-[#CBD5E1] dark:border-slate-700 hover:border-[#94A3B8] dark:hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-extrabold text-[#0F172A] dark:text-slate-50 inline-flex items-center gap-2">
                    {isSelected && (
                      <Check
                        className="w-4 h-4 text-[#1D4ED8] dark:text-blue-300 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <span>{plan.name}</span>
                  </span>
                  <span
                    className={`text-[12px] font-extrabold px-2 py-0.5 rounded-md border ${
                      plan.id === 'essencial'
                        ? 'bg-[#DCFCE7] dark:bg-emerald-950/80 text-[#15803D] dark:text-emerald-200 border-[#86EFAC] dark:border-emerald-700'
                        : 'bg-[#FEF3C7] dark:bg-amber-950/80 text-[#B45309] dark:text-amber-200 border-[#FCD34D] dark:border-amber-700'
                    }`}
                  >
                    {plan.priceLabel}
                  </span>
                </div>
                <p className="text-[13px] font-medium text-[#334155] dark:text-slate-300 mt-1 leading-snug">
                  {plan.description}
                </p>
              </button>
            );
          })}
        </div>

        {planFeedback && (
          <div
            role="status"
            className="px-3.5 py-2.5 rounded-xl bg-[#DBEAFE]/80 dark:bg-blue-950/80 border border-[#93C5FD] dark:border-blue-700 text-[#1E40AF] dark:text-blue-200 text-[13px] font-bold leading-snug"
          >
            {planFeedback}
          </div>
        )}

        <div className="text-[12px] font-medium text-[#475569] dark:text-slate-400">
          Seleção atual: <strong className="text-[#0F172A] dark:text-slate-200">{selectedPlanObj.name}</strong> ({selectedPlanObj.badge})
        </div>
      </section>

      {/* Seção 4: Orientação de uso (Recolhida por padrão) */}
      <section
        aria-label="Orientação: como ler o painel"
        className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-2xl overflow-hidden"
      >
        <button
          type="button"
          onClick={() => setShowOrientation((prev) => !prev)}
          aria-expanded={showOrientation}
          className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-[#F1F5F9]/60 dark:hover:bg-slate-700/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <Info
              className="w-5 h-5 text-[#1D4ED8] dark:text-blue-300 shrink-0"
              aria-hidden="true"
            />
            <span className="text-[15px] font-extrabold text-[#0F172A] dark:text-slate-50">
              Orientação: como ler o painel
            </span>
          </span>
          {showOrientation ? (
            <ChevronUp className="w-4 h-4 text-[#334155] dark:text-slate-300 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#334155] dark:text-slate-300 shrink-0" aria-hidden="true" />
          )}
        </button>

        {showOrientation && (
          <div className="px-4 pb-4 pt-2 border-t border-[#E2E8F0] dark:border-slate-700 space-y-3">
            <ul className="space-y-2.5 text-[13.5px] text-[#334155] dark:text-slate-300 leading-snug">
              <li className="flex items-start gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#B91C1C] dark:bg-red-400 shrink-0 mt-1" aria-hidden="true" />
                <span>
                  <strong className="text-[#B91C1C] dark:text-red-300">Atenção ao Estoque:</strong> Estoque baixo no pátio ou na prateleira. Avalie repor logo para não faltar ao cliente, considerando a tendência de preço nos próximos 30 dias.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#B45309] dark:bg-amber-400 shrink-0 mt-1" aria-hidden="true" />
                <span>
                  <strong className="text-[#B45309] dark:text-amber-300">Sinal de Alta:</strong> Estoque em dia, mas os dados apontam tendência de aumento de preço nos próximos 30 dias.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#15803D] dark:bg-emerald-400 shrink-0 mt-1" aria-hidden="true" />
                <span>
                  <strong className="text-[#15803D] dark:text-emerald-300">Sinal de Queda:</strong> Estoque confortável e os dados apontam tendência de redução de preço nos próximos 30 dias.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#1D4ED8] dark:bg-blue-400 shrink-0 mt-1" aria-hidden="true" />
                <span>
                  <strong className="text-[#1D4ED8] dark:text-blue-300">Mercado Estável:</strong> Estoque abastecido no pátio ou na prateleira e os dados apontam tendência de estabilidade de preço nos próximos 30 dias.
                </span>
              </li>
            </ul>

            <p className="text-[12px] italic text-[#475569] dark:text-slate-300 pt-2 border-t border-[#E2E8F0] dark:border-slate-700 leading-snug">
              *Indicador estatístico de apoio baseado em índices públicos. Não representa garantia de preço futuro ou recomendação financeira.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
