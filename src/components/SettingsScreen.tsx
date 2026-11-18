import { useEffect, useState } from 'react';
import { Check, Crown, Mail, Settings, Store, User } from 'lucide-react';
import { SubscriptionPlanId, UserProfile } from '../types/inventory';
import { formatSyncTimestamp } from '../utils/forecastSync';

interface SettingsScreenProps {
  profile: UserProfile;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  updatedAtIso: string;
}

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

export function SettingsScreen({
  profile,
  onUpdateProfile,
  updatedAtIso,
}: SettingsScreenProps) {
  const [name, setName] = useState(profile.name);
  const [storeName, setStoreName] = useState(profile.storeName);
  const [email, setEmail] = useState(profile.email);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [planFeedback, setPlanFeedback] = useState<string | null>(null);

  useEffect(() => {
    setName(profile.name);
    setStoreName(profile.storeName);
    setEmail(profile.email);
  }, [profile.name, profile.storeName, profile.email]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedStore = storeName.trim() || 'Minha Loja';
    const cleanedName = name.trim();
    const cleanedEmail = email.trim();

    onUpdateProfile({
      name: cleanedName,
      storeName: cleanedStore,
      email: cleanedEmail,
    });
    setStoreName(cleanedStore);
    setSaveFeedback('Dados do perfil e da loja salvos.');
    window.setTimeout(() => setSaveFeedback(null), 3500);
  };

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
        className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-2xl p-4 space-y-4"
      >
        <div>
          <h3 className="text-[16px] font-extrabold text-[#0F172A] dark:text-slate-50">
            Perfil da loja
          </h3>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3.5">
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

          <p className="text-[12.5px] font-medium text-[#475569] dark:text-slate-300 font-num pt-0.5">
            Base de dados de projeção de preços: Atualizado em:{' '}
            {formatSyncTimestamp(updatedAtIso)}
          </p>

          <button
            type="submit"
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#0F172A] dark:bg-slate-100 text-white dark:text-slate-950 font-extrabold text-[15px] hover:opacity-95 active:scale-[0.99] transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
          >
            Salvar perfil
          </button>

          {saveFeedback && (
            <div
              role="status"
              className="px-3.5 py-2.5 rounded-xl bg-[#DCFCE7] dark:bg-emerald-950/80 border border-[#86EFAC] dark:border-emerald-700 text-[#15803D] dark:text-emerald-200 text-[13.5px] font-bold flex items-center gap-2"
            >
              <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{saveFeedback}</span>
            </div>
          )}
        </form>
      </section>

      {/* Seção 2: Plano de Assinatura (Futuro) */}
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
    </div>
  );
}
