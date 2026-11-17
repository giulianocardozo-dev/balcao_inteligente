import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calculator,
  FileSpreadsheet,
  Home,
  Loader2,
  LocateFixed,
  Moon,
  Package,
  Sun,
} from 'lucide-react';
import {
  buildDefaultSinapiDataset,
  buildDefaultStoreConfigs,
} from './data/defaultDataset';
import { ForecastUploadScreen } from './components/ForecastUploadScreen';
import { MaterialDetailScreen } from './components/MaterialDetailScreen';
import { SimulateScreen } from './components/SimulateScreen';
import { TodayScreen } from './components/TodayScreen';
import {
  AppTab,
  DataSourceMeta,
  EvaluatedMaterial,
  SinapiMaterialRecord,
  StoreInventoryConfig,
} from './types/inventory';
import { evaluateMaterial, statusPriority } from './utils/mathEngine';
import { detectUfFromCoordinates } from './utils/ufGeolocation';

const STORAGE_KEYS = {
  UF: 'balcao_inteligente_uf_v1',
  UF_MANUAL: 'balcao_inteligente_uf_manual_v1',
  RECORDS: 'balcao_inteligente_records_v1',
  META: 'balcao_inteligente_meta_v1',
  CONFIGS: 'balcao_inteligente_configs_v1',
  THEME: 'balcao_inteligente_theme_v1',
};

type ThemeMode = 'light' | 'dark';

const DEFAULT_META: DataSourceMeta = {
  type: 'demo',
  ufCount: 27,
  materialCount: 12,
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

  const [importedRecords, setImportedRecords] = useState<SinapiMaterialRecord[] | null>(
    () => safeReadJson<SinapiMaterialRecord[]>(STORAGE_KEYS.RECORDS)
  );
  const [sourceMeta, setSourceMeta] = useState<DataSourceMeta>(
    () => safeReadJson<DataSourceMeta>(STORAGE_KEYS.META) ?? DEFAULT_META
  );
  const [storeConfigs, setStoreConfigs] = useState<Record<string, StoreInventoryConfig>>(
    () => ({
      ...defaultConfigs,
      ...(safeReadJson<Record<string, StoreInventoryConfig>>(STORAGE_KEYS.CONFIGS) ?? {}),
    })
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

  const manualOverrideRef = useRef<boolean>(
    (() => {
      try {
        return localStorage.getItem(STORAGE_KEYS.UF_MANUAL) === 'true';
      } catch {
        return false;
      }
    })()
  );

  const allRecords = importedRecords ?? defaultDataset;

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

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const ufRecords = useMemo(
    () => allRecords.filter((r) => r.uf === selectedUf),
    [allRecords, selectedUf]
  );

  const evaluatedItems: EvaluatedMaterial[] = useMemo(() => {
    return ufRecords
      .map((rec) => {
        const existingCfg = storeConfigs[rec.id];
        const lastHist = rec.historico[rec.historico.length - 1];
        const fallbackPrice = lastHist ? lastHist.price : 50;
        const cfg: StoreInventoryConfig = existingCfg ?? {
          estoqueAtual: 60,
          vendas30d: 120,
          diasEntrega: 5,
          custoMedio: fallbackPrice,
          variacaoDemanda: 0.25,
        };
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
    setStoreConfigs((prev) => {
      const current = prev[materialId] ?? {
        estoqueAtual: 60,
        vendas30d: 120,
        diasEntrega: 5,
        custoMedio: activeMaterial?.precoAtual ?? 50,
        variacaoDemanda: 0.25,
      };
      return {
        ...prev,
        [materialId]: {
          ...current,
          ...patch,
        },
      };
    });
  };

  const handleImportSuccess = (
    records: SinapiMaterialRecord[],
    meta: DataSourceMeta
  ) => {
    setImportedRecords(records);
    setSourceMeta(meta);
    try {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
      localStorage.setItem(STORAGE_KEYS.META, JSON.stringify(meta));
    } catch {
      // If a huge file exceeds localStorage 5MB quota, keep it in memory cleanly
    }
  };

  const handleResetToDemo = () => {
    setImportedRecords(null);
    setSourceMeta(DEFAULT_META);
    try {
      localStorage.removeItem(STORAGE_KEYS.RECORDS);
      localStorage.removeItem(STORAGE_KEYS.META);
    } catch {
      // ignore
    }
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

  return (
    <div className="min-h-screen w-full md:py-4 flex justify-center bg-white md:bg-[#F1F5F9] dark:bg-slate-950 md:dark:bg-slate-950">
      <div className="w-full max-w-[440px] min-h-screen md:min-h-[calc(100vh-2rem)] bg-white dark:bg-slate-900 md:border md:border-[#CBD5E1] dark:md:border-slate-700 md:rounded-3xl md:overflow-hidden flex flex-col relative">
        {/* Compact Sticky Header */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-[#CBD5E1] dark:border-slate-700 px-4 py-2">
          {/* Row 1: Brand Identity (unobstructed, zero truncation) */}
          <div className="flex items-center gap-2.5">
            {iconError ? (
              <div
                aria-hidden="true"
                className="w-10 h-10 rounded-xl bg-[#0A2B66] text-white flex items-center justify-center font-brand text-[16px] shrink-0"
              >
                BI
              </div>
            ) : (
              <img
                src="/assets/aistudio/_cone_BI_em_Bloco_de_Bet_o_6a6c26ff.png"
                alt="Balcão Inteligente"
                referrerPolicy="no-referrer"
                onError={() => setIconError(true)}
                className="w-10 h-10 rounded-xl object-contain shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-brand font-bold text-[21px] text-[#0F172A] dark:text-slate-50 leading-none tracking-tight">
                Balcão Inteligente
              </h1>
              <div className="text-[13px] font-semibold text-[#334155] dark:text-slate-300 leading-tight mt-1">
                Depósito Oliveira
              </div>
            </div>
          </div>

          {/* Row 2: Region & Theme Utility Bar (44px accessible touch targets) */}
          <div className="mt-1.5 pt-1.5 border-t border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => detectUserUf(true)}
                aria-label="Detectar estado pela minha localização"
                title="Usar minha localização"
                className="min-h-[44px] px-2.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-600 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#0F172A] dark:text-slate-100 hover:border-[#94A3B8] dark:hover:border-slate-400 active:bg-[#E2E8F0] dark:active:bg-slate-700 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
              >
                {geoLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#1D4ED8] dark:text-blue-300 shrink-0" aria-hidden="true" />
                ) : (
                  <LocateFixed className="w-4 h-4 text-[#1D4ED8] dark:text-blue-300 shrink-0" aria-hidden="true" />
                )}
                <span>Localizar</span>
              </button>

              <label htmlFor="uf-selector" className="sr-only">
                Estado (UF)
              </label>
              <select
                id="uf-selector"
                value={selectedUf}
                onChange={(e) => {
                  const nextUf = e.target.value;
                  manualOverrideRef.current = true;
                  try {
                    localStorage.setItem(STORAGE_KEYS.UF_MANUAL, 'true');
                  } catch {
                    // ignore
                  }
                  setGeoNotice(null);
                  setSelectedUf(nextUf);
                }}
                className="min-h-[44px] px-2.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-600 text-[14px] font-extrabold text-[#0F172A] dark:text-slate-50 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400"
              >
                {availableUfs.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-pressed={isDark}
              aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={isDark ? 'Modo claro' : 'Modo escuro'}
              className="min-h-[44px] px-2.5 rounded-xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-600 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#0F172A] dark:text-slate-100 hover:border-[#94A3B8] dark:hover:border-slate-400 active:bg-[#E2E8F0] dark:active:bg-slate-700 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] dark:focus-visible:outline-blue-400 shrink-0"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
                  <span>Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-[#1D4ED8] shrink-0" aria-hidden="true" />
                  <span>Escuro</span>
                </>
              )}
            </button>
          </div>

          {geoNotice && (
            <div
              role="status"
              className={`mt-2 px-3 py-1.5 rounded-xl text-[13px] font-bold border ${
                geoNotice.type === 'info'
                  ? 'bg-[#DBEAFE] dark:bg-blue-950/80 border-[#93C5FD] dark:border-blue-700 text-[#1D4ED8] dark:text-blue-200'
                  : 'bg-[#FEF3C7] dark:bg-amber-950/80 border-[#FCD34D] dark:border-amber-600 text-[#B45309] dark:text-amber-200'
              }`}
            >
              {geoNotice.text}
            </div>
          )}
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 px-4 pt-4 pb-24">
          {activeTab === 'hoje' && (
            <TodayScreen
              items={evaluatedItems}
              onSelectMaterial={openMaterialDetail}
            />
          )}

          {activeTab === 'detalhe' && activeMaterial && (
            <MaterialDetailScreen
              material={activeMaterial}
              allMaterials={evaluatedItems}
              onSelectMaterial={(id) => setSelectedMaterialId(id)}
              onUpdateConfig={handleUpdateConfig}
              onBackToToday={() => switchTab('hoje')}
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

          {activeTab === 'previsao' && (
            <ForecastUploadScreen
              selectedUf={selectedUf}
              evaluatedItems={evaluatedItems}
              allRecords={allRecords}
              sourceMeta={sourceMeta}
              onImportSuccess={handleImportSuccess}
              onResetToDemo={handleResetToDemo}
              onSelectMaterial={openMaterialDetail}
            />
          )}
        </main>

        {/* Fixed Bottom Navigation */}
        <nav
          aria-label="Navegação principal"
          className="fixed md:sticky bottom-0 left-0 right-0 md:left-auto md:right-auto z-40 w-full max-w-[440px] mx-auto bg-white dark:bg-slate-900 border-t border-[#CBD5E1] dark:border-slate-700 pb-safe"
        >
          <div className="grid grid-cols-4 h-[64px]">
            <button
              type="button"
              onClick={() => switchTab('hoje')}
              aria-current={activeTab === 'hoje' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] transition-colors ${
                activeTab === 'hoje'
                  ? 'text-[#15803D] dark:text-emerald-300 font-extrabold bg-[#DCFCE7]/40 dark:bg-emerald-950/60'
                  : 'text-[#334155] dark:text-slate-300 font-semibold hover:text-[#0F172A] dark:hover:text-slate-50'
              }`}
            >
              <Home className="w-[22px] h-[22px]" aria-hidden="true" />
              <span className="text-[12px] leading-none">Hoje</span>
            </button>

            <button
              type="button"
              onClick={() => switchTab('detalhe')}
              aria-current={activeTab === 'detalhe' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] transition-colors ${
                activeTab === 'detalhe'
                  ? 'text-[#15803D] dark:text-emerald-300 font-extrabold bg-[#DCFCE7]/40 dark:bg-emerald-950/60'
                  : 'text-[#334155] dark:text-slate-300 font-semibold hover:text-[#0F172A] dark:hover:text-slate-50'
              }`}
            >
              <Package className="w-[22px] h-[22px]" aria-hidden="true" />
              <span className="text-[12px] leading-none">Material</span>
            </button>

            <button
              type="button"
              onClick={() => switchTab('simular')}
              aria-current={activeTab === 'simular' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] transition-colors ${
                activeTab === 'simular'
                  ? 'text-[#15803D] dark:text-emerald-300 font-extrabold bg-[#DCFCE7]/40 dark:bg-emerald-950/60'
                  : 'text-[#334155] dark:text-slate-300 font-semibold hover:text-[#0F172A] dark:hover:text-slate-50'
              }`}
            >
              <Calculator className="w-[22px] h-[22px]" aria-hidden="true" />
              <span className="text-[12px] leading-none">Simular</span>
            </button>

            <button
              type="button"
              onClick={() => switchTab('previsao')}
              aria-current={activeTab === 'previsao' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] transition-colors ${
                activeTab === 'previsao'
                  ? 'text-[#15803D] dark:text-emerald-300 font-extrabold bg-[#DCFCE7]/40 dark:bg-emerald-950/60'
                  : 'text-[#334155] dark:text-slate-300 font-semibold hover:text-[#0F172A] dark:hover:text-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-[22px] h-[22px]" aria-hidden="true" />
              <span className="text-[12px] leading-none">Previsão</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
