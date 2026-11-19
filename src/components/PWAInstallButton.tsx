import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Monitor,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import { InstallPlatform, usePWAInstall } from '../hooks/usePWAInstall';

const DISMISS_SESSION_KEY = 'balcao_inteligente_install_dismissed_v1';

interface PWAInstallButtonProps {
  variant?: 'banner' | 'settings';
}

export function PWAInstallButton({ variant = 'banner' }: PWAInstallButtonProps) {
  const {
    isInstallable,
    isInstalled,
    platform,
    isInAppBrowser,
    install,
  } = usePWAInstall();

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (variant === 'settings') return false;
    try {
      return sessionStorage.getItem(DISMISS_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideTab, setGuideTab] = useState<Exclude<InstallPlatform, 'other'>>(() =>
    platform === 'ios' ? 'ios' : platform === 'windows' ? 'windows' : 'android'
  );

  useEffect(() => {
    if (platform === 'ios' || platform === 'android' || platform === 'windows') {
      setGuideTab(platform);
    }
  }, [platform]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_SESSION_KEY, '1');
    } catch {
      // ignore
    }
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowGuideModal(true);
  };

  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="bg-[#DCFCE7] dark:bg-emerald-950/75 border border-[#86EFAC] dark:border-emerald-700 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2
            className="w-5 h-5 text-[#15803D] dark:text-emerald-300 shrink-0"
            aria-hidden="true"
          />
          <div>
            <div className="text-[15px] font-extrabold text-[#14532D] dark:text-emerald-100">
              Aplicativo instalado neste aparelho
            </div>
            <p className="text-[13px] font-medium text-[#166534] dark:text-emerald-200 mt-0.5 leading-snug">
              Você já está usando o Balcão Inteligente em modo aplicativo.
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  if (variant === 'banner' && dismissed) {
    return null;
  }

  const platformSubtitle =
    platform === 'ios'
      ? 'Adicionar na Tela de Início (iPhone / iPad)'
      : platform === 'android'
        ? 'Instalar na tela inicial (Android)'
        : platform === 'windows'
          ? 'Instalar como aplicativo no Windows'
          : 'Instalar no Android, iOS ou Windows';

  const modalContent = showGuideModal && (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-guide-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-[2px] p-3 sm:p-4"
    >
      <div className="w-full max-w-[420px] rounded-2xl bg-white dark:bg-slate-900 border border-[#CBD5E1] dark:border-slate-700 shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/pwa-192x192.png"
              alt="Balcão Inteligente"
              className="w-10 h-10 rounded-xl object-contain shrink-0"
            />
            <div>
              <h3
                id="pwa-install-guide-title"
                className="text-[17px] font-extrabold text-[#0F172A] dark:text-slate-50 leading-tight"
              >
                Instalar Balcão Inteligente
              </h3>
              <p className="text-[12.5px] font-medium text-[#475569] dark:text-slate-300 mt-0.5">
                Escolha o seu sistema para criar o atalho de app
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowGuideModal(false)}
            aria-label="Fechar orientações de instalação"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#475569] dark:text-slate-300 hover:bg-[#F1F5F9] dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Seletor de Sistema: Android / iOS / Windows */}
        <div
          role="tablist"
          aria-label="Sistema operacional para instalação"
          className="grid grid-cols-3 gap-1.5 bg-[#F1F5F9] dark:bg-slate-800 p-1 rounded-xl"
        >
          {(
            [
              { id: 'android', label: 'Android' },
              { id: 'ios', label: 'iPhone / iOS' },
              { id: 'windows', label: 'Windows' },
            ] as const
          ).map((tab) => {
            const active = guideTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setGuideTab(tab.id)}
                className={`min-h-[38px] px-2 rounded-lg text-[13px] font-extrabold transition-colors ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-[#0F172A] dark:text-slate-50 shadow-sm'
                    : 'text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {isInAppBrowser && (
          <div className="rounded-xl bg-[#FEF3C7] dark:bg-amber-950/75 border border-[#FCD34D] dark:border-amber-700 px-3.5 py-2.5 text-[13px] font-semibold text-[#92400E] dark:text-amber-200 leading-snug">
            Você abriu o link dentro de outro aplicativo (como WhatsApp). Para instalar no celular, toque no menu e escolha <strong>Abrir no {guideTab === 'ios' ? 'Safari' : 'Chrome'}</strong>.
          </div>
        )}

        {guideTab === 'android' && (
          <div className="space-y-3">
            {isInstallable && (
              <button
                type="button"
                onClick={install}
                className="w-full min-h-[46px] px-4 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-[15px] font-extrabold flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Instalar agora no Android</span>
              </button>
            )}
            <ol className="space-y-2.5 text-[14px] text-[#334155] dark:text-slate-200 leading-snug list-decimal list-inside">
              <li>
                Abra este link no navegador <strong>Chrome</strong> (ou Edge/Samsung Internet).
              </li>
              <li>
                Toque no menu <strong>⋮</strong> (três pontinhos) no canto superior direito.
              </li>
              <li>
                Toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.
              </li>
            </ol>
          </div>
        )}

        {guideTab === 'ios' && (
          <ol className="space-y-2.5 text-[14px] text-[#334155] dark:text-slate-200 leading-snug list-decimal list-inside">
            <li>
              Abra este link no navegador <strong>Safari</strong> do iPhone ou iPad.
            </li>
            <li>
              Toque no ícone de <strong>Compartilhar</strong>{' '}
              <Share className="w-4 h-4 inline-block text-[#1D4ED8] dark:text-blue-300 align-text-bottom" aria-hidden="true" />{' '}
              na barra inferior (ou superior no iPad).
            </li>
            <li>
              Role as opções e toque em <strong>Adicionar à Tela de Início</strong>.
            </li>
            <li>
              Confirme tocando em <strong>Adicionar</strong> no canto superior direito.
            </li>
          </ol>
        )}

        {guideTab === 'windows' && (
          <div className="space-y-3">
            {isInstallable && (
              <button
                type="button"
                onClick={install}
                className="w-full min-h-[46px] px-4 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-[15px] font-extrabold flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Instalar agora no Windows</span>
              </button>
            )}
            <ol className="space-y-2.5 text-[14px] text-[#334155] dark:text-slate-200 leading-snug list-decimal list-inside">
              <li>
                Abra no <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>.
              </li>
              <li>
                Clique no ícone de instalação (<strong>⊕</strong> ou tela com seta) no lado direito da barra de endereços.
              </li>
              <li>
                Ou abra o menu (<strong>⋮</strong> no Chrome / <strong>⋯</strong> no Edge) → <strong>Aplicativos</strong> → <strong>Instalar Balcão Inteligente</strong>.
              </li>
            </ol>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowGuideModal(false)}
          className="w-full min-h-[46px] rounded-xl bg-[#0F172A] dark:bg-slate-100 text-white dark:text-slate-950 text-[15px] font-extrabold"
        >
          Entendi
        </button>
      </div>
    </div>
  );

  if (variant === 'settings') {
    return (
      <>
        <section
          aria-label="Instalar aplicativo"
          className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-start gap-2.5">
            {platform === 'windows' ? (
              <Monitor
                className="w-5 h-5 text-[#1D4ED8] dark:text-blue-300 shrink-0 mt-0.5"
                aria-hidden="true"
              />
            ) : (
              <Smartphone
                className="w-5 h-5 text-[#1D4ED8] dark:text-blue-300 shrink-0 mt-0.5"
                aria-hidden="true"
              />
            )}
            <div>
              <h3 className="text-[16px] font-extrabold text-[#0F172A] dark:text-slate-50">
                Instalar aplicativo
              </h3>
              <p className="text-[13px] font-medium text-[#475569] dark:text-slate-300 mt-0.5 leading-snug">
                Coloque o Balcão Inteligente na tela inicial do Android, iPhone (iOS) ou na área de trabalho do Windows.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-extrabold text-[15px] flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{isInstallable ? 'Instalar App agora' : 'Como instalar no meu aparelho'}</span>
          </button>
        </section>
        {modalContent}
      </>
    );
  }

  return (
    <>
      <div className="mb-3 rounded-2xl bg-[#EFF6FF] dark:bg-blue-950/75 border border-[#93C5FD] dark:border-blue-800 px-3.5 py-2.5 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/pwa-192x192.png"
            alt=""
            aria-hidden="true"
            className="w-9 h-9 rounded-xl object-contain shrink-0"
          />
          <div className="min-w-0">
            <div className="text-[13.5px] font-extrabold text-[#0F172A] dark:text-slate-50 leading-tight truncate">
              Instalar Balcão Inteligente
            </div>
            <div className="text-[11.5px] font-semibold text-[#1E40AF] dark:text-blue-200 leading-tight truncate mt-0.5">
              {platformSubtitle}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="min-h-[38px] px-3 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-[13px] font-extrabold inline-flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Instalar</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Ocultar aviso de instalação"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#475569] dark:text-slate-300 hover:bg-[#DBEAFE] dark:hover:bg-blue-900/60"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {modalContent}
    </>
  );
}
