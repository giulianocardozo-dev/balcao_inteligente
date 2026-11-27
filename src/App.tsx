import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calculator,
  Home,
  Newspaper,
  Package,
  Settings,
} from 'lucide-react';
import {
  BRAZIL_UFS,
  buildDefaultSinapiDataset,
  buildDefaultStoreConfigs,
  getInitialConfigForMaterial,
  getSeedConfigByIdOrRecord,
  isLegacyDefaultSales,
  isLegacyDefaultStock,
} from './data/defaultDataset';
import { MarketNewsScreen } from './components/MarketNewsScreen';
import { MaterialDetailScreen } from './components/MaterialDetailScreen';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SettingsScreen } from './components/SettingsScreen';
import { SimulateScreen } from './components/SimulateScreen';
import { TodayScreen } from './components/TodayScreen';
import {
  AppTab,
  EvaluatedMaterial,
  ForecastSyncState,
  MarketNewsItem,
  SinapiMaterialRecord,
  StoreInventoryConfig,
  UserProfile,
} from './types/inventory';
import { evaluateMaterial, statusPriority } from './utils/mathEngine';
import { isExcludedMaterial } from './utils/excelHandler';
import {
  FORECAST_SYNC_INTERVAL_MS,
  fetchGitHubForecast,
  readCachedForecast,
} from './utils/forecastSync';
import {
  NEWS_SYNC_INTERVAL_MS,
  fetchSmartWebNews,
  getInitialNewsItems,
  readCachedNews,
  shouldRefreshNews,
} from './utils/newsSync';
import { detectUfFromCoordinates } from './utils/ufGeolocation';

const STORAGE_KEYS = {
  UF: 'balcao_inteligente_uf_v1',
  UF_MANUAL: 'balcao_inteligente_uf_manual_v1',
  CONFIGS: 'balcao_inteligente_configs_v4',
  LEGACY_CONFIGS_V3: 'balcao_inteligente_configs_v3',
  LEGACY_CONFIGS_V2: 'balcao_inteligente_configs_v2',
  THEME: 'balcao_inteligente_theme_v1',
  PROFILE: 'balcao_inteligente_profile_v1',
};

type ThemeMode = 'light' | 'dark';

const DEFAULT_PROFILE: UserProfile = {
  name: 'Marcos Oliveira',
  storeName: 'Depósito Oliveira',
  email: 'marcos@depositooliveira.com.br',
  selectedPlan: 'essencial',
};

function safeReadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function App() {
  const defaultDataset = useMemo(() => buildDefaultSinapiDataset(), []);
  const defaultConfigs = useMemo(() => buildDefaultStoreConfigs(), []);

  const initialCachedForecast = useMemo(() => readCachedForecast(), []);

  const [remoteRecords, setRemoteRecords] = useState<SinapiMaterialRecord[] | null>(
    () => initialCachedForecast?.records ?? null
  );
  const [syncState, setSyncState] = useState<ForecastSyncState>(
    () =>
      initialCachedForecast?.syncState ?? {
        source: 'fallback',
        updatedAtIso: new Date().toISOString(),
        materialCount: 9,
        ufCount: 27,
      }
  );
  const [userProfile, setUserProfile] = useState<UserProfile>(() => ({
    ...DEFAULT_PROFILE,
    ...(safeReadJson<Partial<UserProfile>>(STORAGE_KEYS.PROFILE) ?? {}),
  }));
  const [storeConfigs, setStoreConfigs] = useState<Record<string, StoreInventoryConfig>>(
    () => {
      const savedV4 = safeReadJson<Record<string, StoreInventoryConfig>>(STORAGE_KEYS.CONFIGS);
      if (savedV4) {
        return {
          ...defaultConfigs,
          ...savedV4,
        };
      }

      const initialRecords = initialCachedForecast?.records ?? defaultDataset;
      const seeded: Record<string, StoreInventoryConfig> = { ...defaultConfigs };
      for (const rec of initialRecords) {
        if (!seeded[rec.id]) {
          seeded[rec.id] = getInitialConfigForMaterial(rec);
        }
      }

      const legacyConfigs =
        safeReadJson<Record<string, StoreInventoryConfig>>(STORAGE_KEYS.LEGACY_CONFIGS_V3) ??
        safeReadJson<Record<string, StoreInventoryConfig>>(STORAGE_KEYS.LEGACY_CONFIGS_V2);

      if (legacyConfigs) {
        for (const [id, legacyCfg] of Object.entries(legacyConfigs)) {
          const rec = initialRecords.find((r) => r.id === id);
          const fallbackCfg = seeded[id] ?? getSeedConfigByIdOrRecord(id, rec);
          const useNewStock =
            fallbackCfg !== undefined && isLegacyDefaultStock(id, legacyCfg.estoqueAtual);
          const useNewSales =
            fallbackCfg !== undefined && isLegacyDefaultSales(id, legacyCfg.vendas30d);

          seeded[id] = {
            ...(fallbackCfg ?? legacyCfg),
            ...legacyCfg,
            estoqueAtual: useNewStock ? fallbackCfg.estoqueAtual : legacyCfg.estoqueAtual,
            vendas30d: useNewSales ? fallbackCfg.vendas30d : legacyCfg.vendas30d,
            custoMedio:
              legacyCfg.custoMedio > 0
                ? legacyCfg.custoMedio
                : fallbackCfg?.custoMedio ?? 0,
          };
        }
      }

      return seeded;
    }
  );
  const [selectedUf, setSelectedUf] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.UF);
    return saved || 'SP';
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.THEME) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<AppTab>('hoje');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('00000033');
  const [iconError, setIconError] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoNotice, setGeoNotice] = useState<{ type: 'info' | 'warn'; text: string } | null>(null);
  const [forecastSyncing, setForecastSyncing] = useState(false);
  const [forecastSyncNotice, setForecastSyncNotice] = useState<{
    type: 'info' | 'warn';
    text: string;
  } | null>(null);

  const manualOverrideRef = useRef<boolean>(
    (() => {
      try {
        return localStorage.getItem(STORAGE_KEYS.UF_MANUAL) === 'true';
      } catch {
        return false;
      }
    })()
  );

  const initialCachedNews = useMemo(() => readCachedNews(), []);
  const [newsItems, setNewsItems] = useState<MarketNewsItem[]>(() => getInitialNewsItems());
  const [newsError, setNewsError] = useState<string | null>(null);
  const newsUpdatedAtRef = useRef<string | null>(initialCachedNews?.updatedAtIso ?? null);
  const newsSyncInFlightRef = useRef(false);
  const lastNewsAttemptMsRef = useRef(0);

  const syncInFlightRef = useRef(false);
  const lastSyncCheckMsRef = useRef(0);

  const allRecords = useMemo(
    () =>
      (remoteRecords ?? defaultDataset).filter(
        (r) => !isExcludedMaterial(r.codigoSinapi || r.id, r.insumo)
      ),
    [remoteRecords, defaultDataset]
  );

  const availableUfs = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => set.add(r.uf));
    return Array.from(set).sort();
  }, [allRecords]);

  const availableUfsRef = useRef<string[]>(availableUfs);
  availableUfsRef.current = availableUfs;

  const detectUserUf = useCallback((isManualTrigger: boolean) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      if (isManualTrigger) {
        setGeoNotice({
          type: 'warn',
          text: 'Seu navegador não possui geolocalização. Escolha o estado ao lado.',
        });
      }
      return;
    }

    if (isManualTrigger) {
      manualOverrideRef.current = false;
      try {
        localStorage.removeItem(STORAGE_KEYS.UF_MANUAL);
      } catch {
        // ignore
      }
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        if (!isManualTrigger && manualOverrideRef.current) return;

        const detectedUf = detectUfFromCoordinates(
          pos.coords.latitude,
          pos.coords.longitude
        );

        if (detectedUf && availableUfsRef.current.includes(detectedUf)) {
          setSelectedUf(detectedUf);
          setGeoNotice({
            type: 'info',
            text: `Estado definido para ${detectedUf} pela sua localização.`,
          });
        } else if (isManualTrigger) {
          setGeoNotice({
            type: 'warn',
            text: 'Localização fora do Brasil ou indisponível na planilha. Selecione o estado ao lado.',
          });
        }
      },
      (err) => {
        setGeoLoading(false);
        if (isManualTrigger) {
          let text = 'Não foi possível obter sua localização. Escolha o estado ao lado.';
          if (err.code === err.PERMISSION_DENIED) {
            text = err.message.toLowerCase().includes('policy')
              ? 'Localização bloqueada nesta janela de prévia. Abra o app em nova aba ou selecione o estado ao lado.'
              : 'Permissão de localização negada no navegador. Libere o acesso ou escolha o estado ao lado.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            text = 'Sinal de localização indisponível no momento. Escolha o estado ao lado.';
          } else if (err.code === err.TIMEOUT) {
            text = 'Tempo esgotado ao buscar sua localização. Tente novamente ou escolha ao lado.';
          }
          setGeoNotice({
            type: 'warn',
            text,
          });
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 7000,
        maximumAge: 300000,
      }
    );
  }, []);

  // Auto-detect state via geolocation on first entry (unless user manually picked a state)
  useEffect(() => {
    if (!manualOverrideRef.current) {
      detectUserUf(false);
    }
  }, [detectUserUf]);

  useEffect(() => {
    if (!geoNotice) return;
    const timer = window.setTimeout(() => setGeoNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [geoNotice]);

  useEffect(() => {
    if (!forecastSyncNotice) return;
    const timer = window.setTimeout(() => setForecastSyncNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [forecastSyncNotice]);

  // Keep selectedUf valid if an imported Excel only contains certain UFs
  useEffect(() => {
    if (availableUfs.length > 0 && !availableUfs.includes(selectedUf)) {
      setSelectedUf(availableUfs.includes('SP') ? 'SP' : availableUfs[0]);
    }
  }, [availableUfs, selectedUf]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.UF, selectedUf);
    } catch {
      // ignore storage quota errors
    }
  }, [selectedUf]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIGS, JSON.stringify(storeConfigs));
    } catch {
      // ignore storage quota errors
    }
  }, [storeConfigs]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {
      // ignore storage quota errors
    }
  }, [isDark, theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(userProfile));
    } catch {
      // ignore storage quota errors
    }
  }, [userProfile]);

  const runForecastSync = useCallback(async (force = false, isManual = false) => {
    if (syncInFlightRef.current) return;
    const nowMs = Date.now();
    if (!force && nowMs - lastSyncCheckMsRef.current < 60_000) {
      return;
    }

    syncInFlightRef.current = true;
    lastSyncCheckMsRef.current = nowMs;
    if (isManual) {
      setForecastSyncing(true);
      setForecastSyncNotice(null);
    }
    const controller = new AbortController();

    try {
      const result = await fetchGitHubForecast(controller.signal, force);
      if (result.ok) {
        setRemoteRecords(result.records);
        setSyncState(result.syncState);
        if (isManual) {
          setForecastSyncNotice({
            type: 'info',
            text:
              result.syncState.source === 'github'
                ? 'Projeções sincronizadas com o GitHub.'
                : 'Projeções atualizadas pela base local do servidor.',
          });
        }
      } else {
        const cached = readCachedForecast();
        if (cached) {
          setRemoteRecords(cached.records);
          setSyncState(cached.syncState);
        }
        if (isManual && result.reason !== 'aborted') {
          const suffix = result.detail ? ` (${result.detail})` : '';
          setForecastSyncNotice({
            type: 'warn',
            text:
              result.reason === 'offline'
                ? 'Sem internet no momento. Mantendo os últimos dados salvos.'
                : `Não foi possível buscar novas projeções agora${suffix}.`,
          });
        }
      }
    } finally {
      syncInFlightRef.current = false;
      if (isManual) {
        setForecastSyncing(false);
      }
    }
  }, []);

  // Sincronização assíncrona inicial + rechecagem a cada 8 horas e ao reabrir a aba
  useEffect(() => {
    void runForecastSync(true);

    const intervalId = window.setInterval(() => {
      void runForecastSync(true);
    }, FORECAST_SYNC_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void runForecastSync(false);
      }
    };

    const handleOnline = () => {
      void runForecastSync(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [runForecastSync]);

  const runNewsSync = useCallback(async () => {
    if (newsSyncInFlightRef.current) return;
    const nowMs = Date.now();

    if (!shouldRefreshNews(newsUpdatedAtRef.current, nowMs)) {
      return;
    }
    if (nowMs - lastNewsAttemptMsRef.current < 5 * 60 * 1000) {
      return;
    }

    newsSyncInFlightRef.current = true;
    lastNewsAttemptMsRef.current = nowMs;

    try {
      const result = await fetchSmartWebNews();
      if (result.ok) {
        setNewsItems(result.items);
        newsUpdatedAtRef.current = result.updatedAtIso;
        setNewsError(null);
      } else if (!result.aborted) {
        setNewsError(result.error);
      }
    } finally {
      newsSyncInFlightRef.current = false;
    }
  }, []);

  // Busca inteligente de notícias na web em segundo plano a cada 4 horas (sem travar navegação)
  useEffect(() => {
    void runNewsSync();

    const intervalId = window.setInterval(() => {
      void runNewsSync();
    }, NEWS_SYNC_INTERVAL_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void runNewsSync();
      }
    };

    const handleOnline = () => {
      void runNewsSync();
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [runNewsSync]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleUpdateProfile = (patch: Partial<UserProfile>) => {
    setUserProfile((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const ufRecords = useMemo(
    () => allRecords.filter((r) => r.uf === selectedUf),
    [allRecords, selectedUf]
  );

  const evaluatedItems: EvaluatedMaterial[] = useMemo(() => {
    return ufRecords
      .map((rec) => {
        const existingCfg = storeConfigs[rec.id];
        const cfg: StoreInventoryConfig = existingCfg ?? getInitialConfigForMaterial(rec);
        return evaluateMaterial(rec, cfg);
      })
      .sort((a, b) => {
        const prio = statusPriority(a.status) - statusPriority(b.status);
        if (prio !== 0) return prio;
        if (a.status === 'COMPRAR_AGORA' || a.status === 'ANTECIPAR_COMPRA') {
          return a.diasQueDura - b.diasQueDura;
        }
        return b.dinheiroParado - a.dinheiroParado;
      });
  }, [ufRecords, storeConfigs]);

  useEffect(() => {
    if (
      evaluatedItems.length > 0 &&
      !evaluatedItems.some((item) => item.record.id === selectedMaterialId)
    ) {
      setSelectedMaterialId(evaluatedItems[0].record.id);
    }
  }, [evaluatedItems, selectedMaterialId]);

  const activeMaterial =
    evaluatedItems.find((item) => item.record.id === selectedMaterialId) ??
    evaluatedItems[0];

  const handleUpdateConfig = (
    materialId: string,
    patch: Partial<StoreInventoryConfig>
  ) => {
    const targetRecord = ufRecords.find((r) => r.id === materialId);
    setStoreConfigs((prev) => {
      const current =
        prev[materialId] ??
        (targetRecord
          ? getInitialConfigForMaterial(targetRecord)
          : {
              estoqueAtual: 60,
              vendas30d: 120,
              diasEntrega: 5,
              custoMedio: 0,
              variacaoDemanda: 0.25,
            });
      return {
        ...prev,
        [materialId]: {
          ...current,
          ...patch,
        },
      };
    });
  };

  const openMaterialDetail = (materialId: string) => {
    setSelectedMaterialId(materialId);
    setActiveTab('detalhe');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openSimulator = (materialId: string) => {
    setSelectedMaterialId(materialId);
    setActiveTab('simular');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchTab = (tab: AppTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedStateName =
    BRAZIL_UFS.find((item) => item.uf === selectedUf)?.nome ?? selectedUf;

  return (
    <div className="min-h-screen w-full md:py-4 flex justify-center bg-white md:bg-[#F1F5F9] dark:bg-slate-950 md:dark:bg-slate-950">
      <div className="w-full max-w-[440px] min-h-screen md:min-h-[calc(100vh-2rem)] bg-white dark:bg-slate-900 md:border md:border-[#CBD5E1] dark:md:border-slate-700 md:rounded-3xl md:overflow-hidden flex flex-col relative">
        {/* Compact Single-Row Sticky Header */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-[#CBD5E1] dark:border-slate-700 px-4 py-2.5">
          <div className="flex items-center gap-2 min-[390px]:gap-2.5">
            {iconError ? (
              <div
                aria-hidden="true"
                className="w-9 h-9 rounded-xl bg-[#0A2B66] text-white flex items-center justify-center font-brand text-[15px] shrink-0"
              >
                BI
              </div>
            ) : (
              <img
                src="/assets/aistudio/icon-512_ff246861.png"
                alt="Balcão Inteligente"
                referrerPolicy="no-referrer"
                onError={() => setIconError(true)}
                className="w-9 h-9 rounded-xl object-contain shrink-0"
              />
            )}

            <h1 className="font-brand font-bold text-[21px] min-[390px]:text-[22px] text-[#0F172A] dark:text-slate-50 leading-none tracking-tight whitespace-nowrap shrink-0">
              Balcão Inteligente
            </h1>

            <div
              className="w-px h-9 bg-[#CBD5E1] dark:bg-slate-700 shrink-0"
              aria-hidden="true"
            />

            <div className="min-w-0 flex-1 text-left leading-tight">
              <div className="text-[12.5px] min-[390px]:text-[13px] font-bold text-[#0F172A] dark:text-slate-100 truncate">
                {userProfile.storeName.trim() || 'Minha Loja'}
              </div>
              <div className="text-[11px] min-[390px]:text-[11.5px] font-medium text-[#475569] dark:text-slate-300 truncate">
                {selectedStateName}
              </div>
            </div>
          </div>
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 px-4 pt-4 pb-24">
          {activeTab === 'hoje' && (
            <>
              <PWAInstallButton variant="banner" />
              <TodayScreen
                items={evaluatedItems}
                onSelectMaterial={openMaterialDetail}
              />
            </>
          )}

          {activeTab === 'detalhe' && activeMaterial && (
            <MaterialDetailScreen
              material={activeMaterial}
              allMaterials={evaluatedItems}
              newsItems={newsItems}
              onSelectMaterial={(id) => setSelectedMaterialId(id)}
              onUpdateConfig={handleUpdateConfig}
              onOpenSimulator={openSimulator}
              isDark={isDark}
            />
          )}

          {activeTab === 'simular' && (
            <SimulateScreen
              materials={evaluatedItems}
              selectedMaterialId={selectedMaterialId}
              onSelectMaterial={(id) => setSelectedMaterialId(id)}
            />
          )}

          {activeTab === 'noticias' && (
            <MarketNewsScreen
              items={newsItems}
              onOpenCalculator={openSimulator}
              syncError={newsError}
            />
          )}

          {activeTab === 'config' && (
            <SettingsScreen
              profile={userProfile}
              onUpdateProfile={handleUpdateProfile}
              updatedAtIso={syncState.updatedAtIso}
              syncSource={syncState.source}
              syncReason={syncState.reason}
              forecastSyncing={forecastSyncing}
              forecastSyncNotice={forecastSyncNotice}
              onRefreshForecast={() => {
                void runForecastSync(true, true);
              }}
              selectedUf={selectedUf}
              availableUfs={availableUfs}
              onSelectUf={(nextUf) => {
                manualOverrideRef.current = true;
                try {
                  localStorage.setItem(STORAGE_KEYS.UF_MANUAL, 'true');
                } catch {
                  // ignore
                }
                setGeoNotice(null);
                setSelectedUf(nextUf);
              }}
              onDetectUf={() => detectUserUf(true)}
              geoLoading={geoLoading}
              geoNotice={geoNotice}
              isDark={isDark}
              onToggleTheme={toggleTheme}
            />
          )}
        </main>

        <OfflineIndicator />

        {/* Fixed Bottom Navigation */}
        <nav
          aria-label="Navegação principal"
          className="fixed md:sticky bottom-0 left-0 right-0 md:left-auto md:right-auto z-40 w-full max-w-[440px] mx-auto bg-white dark:bg-slate-900 border-t border-[#CBD5E1] dark:border-slate-700 pb-safe"
        >
          <div className="grid grid-cols-5 h-[64px]">
            <button
              type="button"
              onClick={() => switchTab('hoje')}
              aria-current={activeTab === 'hoje' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] px-0.5 transition-colors ${
                activeTab === 'hoje'
                  ? 'text-[#15803D] dark:text-emerald-300 font-extrabold bg-[#DCFCE7]/40 dark:bg-emerald-950/60'
                  : 'text-[#334155] dark:text-slate-300 font-semibold hover:text-[#0F172A] dark:hover:text-slate-50'
              }`}
            >
              <Home className="w-[21px] h-[21px] shrink-0" aria-hidden="true" />
              <span className="text-[11px] min-[390px]:text-[11.5px] leading-none whitespace-nowrap">
                Hoje
              </span>
            </button>

            <button
              type="button"
              onClick={() => switchTab('detalhe')}
              aria-current={activeTab === 'detalhe' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] px-0.5 transition-colors ${
                activeTab === 'detalhe'
                  ? 'text-[#15803D] dark:text-emerald-300 font-extrabold bg-[#DCFCE7]/40 dark:bg-emerald-950/60'
                  : 'text-[#334155] dark:text-slate-300 font-semibold hover:text-[#0F172A] dark:hover:text-slate-50'
              }`}
            >
              <Package className="w-[21px] h-[21px] shrink-0" aria-hidden="true" />
              <span className="text-[11px] min-[390px]:text-[11.5px] leading-none whitespace-nowrap">
                Estoque
              </span>
            </button>

            <button
              type="button"
              onClick={() => switchTab('simular')}
              aria-current={activeTab === 'simular' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] px-0.5 transition-colors ${
                activeTab === 'simular'
                  ? 'text-[#15803D] dark:text-emerald-300 font-extrabold bg-[#DCFCE7]/40 dark:bg-emerald-950/60'
                  : 'text-[#334155] dark:text-slate-300 font-semibold hover:text-[#0F172A] dark:hover:text-slate-50'
              }`}
            >
              <Calculator className="w-[21px] h-[21px] shrink-0" aria-hidden="true" />
              <span className="text-[11px] min-[390px]:text-[11.5px] leading-none whitespace-nowrap">
                Calculadora
              </span>
            </button>

            <button
              type="button"
              onClick={() => switchTab('noticias')}
              aria-current={activeTab === 'noticias' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] px-0.5 transition-colors ${
                activeTab === 'noticias'
                  ? 'text-[#15803D] dark:text-emerald-300 font-extrabold bg-[#DCFCE7]/40 dark:bg-emerald-950/60'
                  : 'text-[#334155] dark:text-slate-300 font-semibold hover:text-[#0F172A] dark:hover:text-slate-50'
              }`}
            >
              <Newspaper className="w-[21px] h-[21px] shrink-0" aria-hidden="true" />
              <span className="text-[11px] min-[390px]:text-[11.5px] leading-none whitespace-nowrap">
                Notícias
              </span>
            </button>

            <button
              type="button"
              onClick={() => switchTab('config')}
              aria-label="Configurações"
              aria-current={activeTab === 'config' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] px-0.5 transition-colors ${
                activeTab === 'config'
                  ? 'text-[#15803D] dark:text-emerald-300 font-extrabold bg-[#DCFCE7]/40 dark:bg-emerald-950/60'
                  : 'text-[#334155] dark:text-slate-300 font-semibold hover:text-[#0F172A] dark:hover:text-slate-50'
              }`}
            >
              <Settings className="w-[21px] h-[21px] shrink-0" aria-hidden="true" />
              <span className="text-[11px] min-[390px]:text-[11.5px] leading-none whitespace-nowrap">
                Config.
              </span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
