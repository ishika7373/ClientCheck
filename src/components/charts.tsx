import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChurnRatePoint, HealthPoint } from "../lib/types";
import { fmtCurrencyCompact, fmtMonthKey } from "../lib/format";

/* Charts reference design tokens through var(). No default Recharts palette, no
   gradients, no rounded bars, no dot clutter. */
const AXIS = "var(--dm)";
const GRID = "var(--de)";
const SERIES_HEALTH = "var(--st-info)";
const SERIES_CHURN = "var(--st-error)";
const BENCHMARK = "var(--st-success)";

const axisTick = { fill: AXIS, fontSize: 10, fontFamily: "Geist Mono, ui-monospace, monospace", letterSpacing: "0.06em" };

const tooltipStyles = {
  contentStyle: {
    backgroundColor: "var(--ds)",
    border: "1px solid var(--db)",
    borderRadius: 0,
    padding: "8px 10px",
  },
  labelStyle: { color: "var(--dsc)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, fontFamily: "Geist Mono, ui-monospace, monospace" },
  itemStyle: { color: "var(--dh)", fontSize: 12, fontFamily: "Geist Mono, ui-monospace, monospace" },
};

export function HealthTrendChart({ data, height = 168 }: { data: HealthPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="month" tick={axisTick} stroke={GRID} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis domain={[40, 100]} ticks={[40, 60, 80, 100]} tick={axisTick} stroke={GRID} tickLine={false} axisLine={false} width={30} />
        <ReferenceLine y={75} stroke={BENCHMARK} strokeDasharray="3 3" />
        <Tooltip
          {...tooltipStyles}
          formatter={(value) => [String(value), "Health score"]}
          cursor={{ stroke: "var(--db)", strokeWidth: 1 }}
        />
        <Line
          type="linear"
          dataKey="score"
          stroke={SERIES_HEALTH}
          strokeWidth={1.5}
          dot={{ r: 2, fill: SERIES_HEALTH, stroke: SERIES_HEALTH }}
          activeDot={{ r: 3, fill: SERIES_HEALTH, stroke: "var(--dh)", strokeWidth: 1 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ChurnRateChart({ data, height = 220 }: { data: ChurnRatePoint[]; height?: number }) {
  const shaped = data.map((d) => ({ ...d, label: fmtMonthKey(d.month) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={shaped} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="34%">
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} stroke={GRID} tickLine={false} axisLine={{ stroke: GRID }} interval={0} />
        <YAxis
          tick={axisTick}
          stroke={GRID}
          tickLine={false}
          axisLine={false}
          width={30}
          domain={[0, 5]}
          ticks={[0, 1, 2, 3, 4, 5]}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          {...tooltipStyles}
          cursor={{ fill: "var(--de)" }}
          formatter={(value, _name, entry) => {
            const p = entry?.payload as ChurnRatePoint | undefined;
            return [
              `${Number(value).toFixed(1)}%  ${p?.accountsLost ?? 0} lost  ${fmtCurrencyCompact(p?.arrLost ?? 0)}`,
              "Churn rate",
            ];
          }}
        />
        <Bar dataKey="churnRatePct" fill={SERIES_CHURN} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
