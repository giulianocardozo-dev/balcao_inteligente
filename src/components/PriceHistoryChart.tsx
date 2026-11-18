import { ForecastPoint, MonthlyPoint, PriceTrend } from '../types/inventory';
import { formatMonthShort, formatPercentSigned } from '../utils/mathEngine';

interface PriceHistoryChartProps {
  historico: MonthlyPoint[];
  previsoes: ForecastPoint[];
  tendencia: PriceTrend;
  isDark?: boolean;
}

export function PriceHistoryChart({
  historico,
  previsoes,
  tendencia,
  isDark = false,
}: PriceHistoryChartProps) {
  const last12 = historico.slice(-12);
  if (last12.length === 0) return null;

  const baseHistPrice = last12[last12.length - 1]?.price || 1;
  const toPct = (val: number) => (baseHistPrice > 0 ? val / baseHistPrice - 1 : 0);

  const histPcts = last12.map((h) => ({
    month: h.month,
    pct: toPct(h.price),
  }));

  const prevPcts = previsoes.map((p) => ({
    month: p.month,
    pctPrev: toPct(p.prev),
    pctMin: toPct(p.min),
    pctMax: toPct(p.max),
  }));

  const allValues: number[] = [];
  histPcts.forEach((h) => allValues.push(h.pct));
  prevPcts.forEach((p) => {
    allValues.push(p.pctPrev, p.pctMin, p.pctMax);
  });

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const span = Math.max(rawMax - rawMin, 0.02);
  const pad = span * 0.18;
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;
  const ySpan = yMax - yMin || 0.01;

  const width = 380;
  const height = 180;
  const padLeft = 10;
  const padRight = 10;
  const padTop = 10;
  const padBottom = 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const totalPoints = histPcts.length + prevPcts.length;
  const xForIndex = (idx: number) =>
    padLeft + (idx / Math.max(1, totalPoints - 1)) * plotW;
  const yForPct = (pct: number) =>
    padTop + plotH - ((pct - yMin) / ySpan) * plotH;

  const histCoords = histPcts.map((pt, i) => ({
    x: xForIndex(i),
    y: yForPct(pt.pct),
    month: pt.month,
    pct: pt.pct,
  }));

  const lastHist = histCoords[histCoords.length - 1];

  const prevCoords = prevPcts.map((pt, i) => {
    const idx = histPcts.length + i;
    return {
      x: xForIndex(idx),
      yPrev: yForPct(pt.pctPrev),
      yMin: yForPct(pt.pctMax), // higher % -> smaller Y
      yMax: yForPct(pt.pctMin), // lower % -> larger Y
      month: pt.month,
      pctPrev: pt.pctPrev,
    };
  });

  const histPath = histCoords
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const prevPath = [
    `M ${lastHist.x.toFixed(1)} ${lastHist.y.toFixed(1)}`,
    ...prevCoords.map((p) => `L ${p.x.toFixed(1)} ${p.yPrev.toFixed(1)}`),
  ].join(' ');

  // Confidence band polygon starting from lastHist
  const bandTop = [
    `${lastHist.x.toFixed(1)},${lastHist.y.toFixed(1)}`,
    ...prevCoords.map((p) => `${p.x.toFixed(1)},${p.yMin.toFixed(1)}`),
  ];
  const bandBottom = [
    ...prevCoords
      .slice()
      .reverse()
      .map((p) => `${p.x.toFixed(1)},${p.yMax.toFixed(1)}`),
  ];
  const bandPoints = [...bandTop, ...bandBottom].join(' ');

  const trendStroke = isDark
    ? tendencia === 'alta'
      ? '#FBBF24'
      : tendencia === 'queda'
      ? '#4ADE80'
      : '#60A5FA'
    : tendencia === 'alta'
    ? '#B45309'
    : tendencia === 'queda'
    ? '#15803D'
    : '#1D4ED8';

  const bandFill = isDark
    ? tendencia === 'alta'
      ? 'rgba(251, 191, 36, 0.22)'
      : tendencia === 'queda'
      ? 'rgba(74, 222, 128, 0.20)'
      : 'rgba(96, 165, 250, 0.20)'
    : tendencia === 'alta'
    ? 'rgba(180, 83, 9, 0.16)'
    : tendencia === 'queda'
    ? 'rgba(21, 128, 61, 0.14)'
    : 'rgba(29, 78, 216, 0.14)';

  const gridStroke = isDark ? '#334155' : '#E2E8F0';
  const baselineStroke = isDark ? '#475569' : '#CBD5E1';
  const todayLineStroke = isDark ? '#64748B' : '#94A3B8';
  const histStroke = isDark ? '#F8FAFC' : '#0F172A';
  const dotOutline = isDark ? '#1E293B' : '#FFFFFF';
  const axisLabelSecondary = isDark ? '#CBD5E1' : '#334155';
  const axisLabelPrimary = isDark ? '#F8FAFC' : '#0F172A';

  const lastForecast = prevCoords[prevCoords.length - 1];

  return (
    <div className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className="text-[16px] font-bold text-[#0F172A] dark:text-slate-50">
          Índice de projeção de preços
        </h3>
      </div>

      {/* Min, Max & 3-month forecast summary row (%) */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2 text-[13px] font-bold font-num">
        <div className="text-[#334155] dark:text-slate-300">
          Mín: <span className="text-[#0F172A] dark:text-slate-50">{formatPercentSigned(rawMin)}</span>
          <span className="mx-1.5 text-[#94A3B8] dark:text-slate-500" aria-hidden="true">·</span>
          Máx: <span className="text-[#0F172A] dark:text-slate-50">{formatPercentSigned(rawMax)}</span>
        </div>
        <div style={{ color: trendStroke }}>
          Em 3 meses: {formatPercentSigned(lastForecast ? lastForecast.pctPrev : 0)}
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
          role="img"
          aria-label="Gráfico percentual de variação dos últimos 12 meses e projeção para os próximos 3 meses"
        >
          {/* Horizontal guides */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={width - padRight}
            y2={padTop}
            stroke={gridStroke}
            strokeWidth="1"
          />
          <line
            x1={padLeft}
            y1={padTop + plotH / 2}
            x2={width - padRight}
            y2={padTop + plotH / 2}
            stroke={gridStroke}
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <line
            x1={padLeft}
            y1={padTop + plotH}
            x2={width - padRight}
            y2={padTop + plotH}
            stroke={baselineStroke}
            strokeWidth="1"
          />

          {/* "Hoje" vertical separator */}
          <line
            x1={lastHist.x}
            y1={padTop}
            x2={lastHist.x}
            y2={padTop + plotH}
            stroke={todayLineStroke}
            strokeWidth="1"
            strokeDasharray="4 3"
          />

          {/* Uncertainty band */}
          {prevCoords.length > 0 && (
            <polygon points={bandPoints} fill={bandFill} />
          )}

          {/* Historical solid line */}
          <path
            d={histPath}
            fill="none"
            stroke={histStroke}
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Forecast dashed line */}
          {prevCoords.length > 0 && (
            <path
              d={prevPath}
              fill="none"
              stroke={trendStroke}
              strokeWidth="2.75"
              strokeDasharray="6 5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Current point */}
          <circle
            cx={lastHist.x}
            cy={lastHist.y}
            r="5"
            fill={histStroke}
            stroke={dotOutline}
            strokeWidth="2"
          />

          {/* Forecast points */}
          {prevCoords.map((p, idx) => (
            <circle
              key={p.month || idx}
              cx={p.x}
              cy={p.yPrev}
              r="4.5"
              fill={trendStroke}
              stroke={dotOutline}
              strokeWidth="1.5"
            />
          ))}

          {/* X-axis labels */}
          <text
            x={histCoords[0].x}
            y={height - 8}
            textAnchor="start"
            fontSize="11"
            fontWeight="600"
            fill={axisLabelSecondary}
          >
            {formatMonthShort(histCoords[0].month)}
          </text>
          <text
            x={lastHist.x}
            y={height - 8}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill={axisLabelPrimary}
          >
            Hoje ({formatMonthShort(lastHist.month)})
          </text>
          {lastForecast && (
            <text
              x={lastForecast.x}
              y={height - 8}
              textAnchor="end"
              fontSize="11"
              fontWeight="700"
              fill={trendStroke}
            >
              {formatMonthShort(lastForecast.month)}
            </text>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-700 text-[13px] font-medium text-[#334155] dark:text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[#0F172A] dark:bg-slate-50 inline-block" />
          <span>Últimos 12 meses</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-4 h-0 border-t-2 border-dashed inline-block"
            style={{ borderColor: trendStroke }}
          />
          <span>Próximos 3 meses</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-3.5 h-3 rounded-sm inline-block"
            style={{ backgroundColor: bandFill }}
          />
          <span>Faixa de variação</span>
        </span>
      </div>
    </div>
  );
}
