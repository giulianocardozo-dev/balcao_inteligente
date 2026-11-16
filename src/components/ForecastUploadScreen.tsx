import { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Upload,
} from 'lucide-react';
import {
  DataSourceMeta,
  EvaluatedMaterial,
  SinapiMaterialRecord,
} from '../types/inventory';
import { downloadTemplateWorkbook, parseSinapiWorkbook } from '../utils/excelHandler';
import { formatBRL, formatPercentSigned } from '../utils/mathEngine';
import { STATUS_META, StatusIcon } from './StatusVisuals';

interface ForecastUploadScreenProps {
  selectedUf: string;
  evaluatedItems: EvaluatedMaterial[];
  allRecords: SinapiMaterialRecord[];
  sourceMeta: DataSourceMeta;
  onImportSuccess: (
    records: SinapiMaterialRecord[],
    meta: DataSourceMeta
  ) => void;
  onResetToDemo: () => void;
  onSelectMaterial: (materialId: string) => void;
}

export function ForecastUploadScreen({
  selectedUf,
  evaluatedItems,
  allRecords,
  sourceMeta,
  onImportSuccess,
  onResetToDemo,
  onSelectMaterial,
}: ForecastUploadScreenProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; message: string }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  const processFile = async (file: File) => {
    setUploadState({ status: 'loading' });
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseSinapiWorkbook(buffer);

      const now = new Date();
      const importedAt = now.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const meta: DataSourceMeta = {
        type: 'excel',
        fileName: file.name,
        importedAt,
        ufCount: parsed.ufs.length,
        materialCount: parsed.materialCount,
      };

      onImportSuccess(parsed.records, meta);
      setUploadState({
        status: 'success',
        message: `Base atualizada com sucesso! ${file.name} carregado com ${parsed.ufs.length} ${
          parsed.ufs.length === 1 ? 'estado' : 'estados'
        } e ${parsed.materialCount} ${
          parsed.materialCount === 1 ? 'material' : 'materiais'
        }.`,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao ler a planilha. Verifique o arquivo e tente novamente.';
      setUploadState({ status: 'error', message: msg });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-extrabold text-[#0F172A]">
          Atualizar preços via Excel
        </h2>
        <p className="text-[14px] font-medium text-[#334155]">
          Suba a planilha (.xlsx) para atualizar todos os preços e alertas da loja na hora. Tudo roda direto no seu aparelho.
        </p>
      </div>

      {/* Zona de Upload Grande */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center transition-colors min-h-[152px] flex flex-col items-center justify-center gap-2.5 ${
          isDragging
            ? 'border-[#1D4ED8] bg-[#DBEAFE]/60'
            : 'border-[#94A3B8] bg-[#F8FAFC] hover:border-[#0F172A]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Selecionar planilha Excel .xlsx"
        />

        <div className="w-12 h-12 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center">
          {uploadState.status === 'loading' ? (
            <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="w-6 h-6" aria-hidden="true" />
          )}
        </div>

        <div>
          <div className="text-[16px] font-extrabold text-[#0F172A]">
            {uploadState.status === 'loading'
              ? 'Lendo planilha de preços...'
              : 'Toque para escolher o arquivo .xlsx'}
          </div>
          <div className="text-[13px] font-medium text-[#334155] mt-0.5">
            Ou arraste o arquivo (ex.: Projecao_SINAPI_UF_Insumo_3M.xlsx)
          </div>
        </div>
      </div>

      {/* Feedback Imediato */}
      {uploadState.status === 'loading' && (
        <div
          role="status"
          className="rounded-2xl p-4 bg-[#DBEAFE] border border-[#93C5FD] text-[#1D4ED8] font-bold text-[15px] flex items-center gap-3"
        >
          <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden="true" />
          <span>Lendo planilha de preços...</span>
        </div>
      )}

      {uploadState.status === 'success' && (
        <div
          role="status"
          className="rounded-2xl p-4 bg-[#DCFCE7] border border-[#86EFAC] text-[#15803D] font-bold text-[15px] flex items-start gap-3"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{uploadState.message}</span>
        </div>
      )}

      {uploadState.status === 'error' && (
        <div
          role="alert"
          className="rounded-2xl p-4 bg-[#FEE2E2] border border-[#FCA5A5] text-[#B91C1C] font-bold text-[15px] flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{uploadState.message}</span>
        </div>
      )}

      {/* Informação da base ativa + Controles */}
      <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <FileSpreadsheet
            className="w-5 h-5 text-[#0F172A] shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-[#0F172A] truncate">
              {sourceMeta.type === 'excel'
                ? `Planilha ativa: ${sourceMeta.fileName}`
                : 'Base ativa: Dados de demonstração'}
            </div>
            <div className="text-[13px] font-medium text-[#334155]">
              {sourceMeta.ufCount} estados · {sourceMeta.materialCount} materiais
              {sourceMeta.importedAt ? ` · Atualizado em ${sourceMeta.importedAt}` : ''}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => downloadTemplateWorkbook(allRecords)}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-white border border-[#CBD5E1] hover:border-[#0F172A] text-[#0F172A] font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Download className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>Baixar planilha modelo (.xlsx)</span>
          </button>

          {sourceMeta.type === 'excel' && (
            <button
              type="button"
              onClick={() => {
                onResetToDemo();
                setUploadState({ status: 'idle' });
              }}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-white border border-[#CBD5E1] hover:border-[#0F172A] text-[#334155] font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Voltar aos dados de demonstração</span>
            </button>
          )}
        </div>
      </div>

      {/* Resumo da Base Carregada (UF selecionada) */}
      <section aria-label={`Resumo de preços em ${selectedUf}`}>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-[17px] font-extrabold text-[#0F172A]">
            Resumo em {selectedUf} ({evaluatedItems.length} materiais)
          </h3>
          <span className="text-[13px] font-medium text-[#334155]">
            Toque na linha
          </span>
        </div>

        <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1.45fr_0.85fr_0.85fr_0.85fr] gap-1.5 px-3 py-2.5 bg-[#E2E8F0]/70 border-b border-[#CBD5E1] text-[12px] font-extrabold text-[#334155]">
            <div>Material</div>
            <div className="text-right">Atual</div>
            <div className="text-right">45d</div>
            <div className="text-right">90d</div>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {evaluatedItems.map((item) => {
              const meta = STATUS_META[item.status];
              return (
                <button
                  key={item.record.id}
                  type="button"
                  onClick={() => onSelectMaterial(item.record.id)}
                  className="w-full text-left px-3 py-3 hover:bg-white transition-colors focus-visible:outline-2 focus-visible:outline-[#1D4ED8]"
                >
                  <div className="grid grid-cols-[1.45fr_0.85fr_0.85fr_0.85fr] gap-1.5 items-center">
                    <div className="min-w-0 pr-1">
                      <div className="text-[14px] font-bold text-[#0F172A] leading-tight truncate">
                        {item.record.insumo}
                      </div>
                      <div
                        className={`inline-flex items-center gap-1 text-[12px] font-bold mt-1 ${meta.textColor}`}
                      >
                        <StatusIcon status={item.status} className="w-3.5 h-3.5 shrink-0" />
                        <span>{meta.shortLabel}</span>
                      </div>
                    </div>

                    <div className="text-right text-[13px] font-bold text-[#0F172A] font-num">
                      {formatBRL(item.precoAtual)}
                    </div>

                    <div className="text-right font-num">
                      <div className="text-[13px] font-bold text-[#0F172A]">
                        {formatBRL(item.preco45d)}
                      </div>
                      <div
                        className={`text-[11px] font-bold ${
                          item.tendencia === 'alta'
                            ? 'text-[#B45309]'
                            : item.tendencia === 'queda'
                            ? 'text-[#B91C1C]'
                            : 'text-[#334155]'
                        }`}
                      >
                        {formatPercentSigned(item.var45d)}
                      </div>
                    </div>

                    <div className="text-right font-num">
                      <div className="text-[13px] font-bold text-[#0F172A]">
                        {formatBRL(item.preco90d)}
                      </div>
                      <div className="text-[11px] font-semibold text-[#334155]">
                        {formatPercentSigned(item.var90d)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
