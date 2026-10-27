import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@workspace/ui/components/chart";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  XAxis,
} from "recharts";
import { ModuleEmpty } from "./module-states";

export type Period = "today" | "month" | "total";

export type Series = {
  key: string;
  label: string;
  /** CSS color; keep README order signal → info → structure. */
  color: string;
};

export type Point = { date: string } & Record<string, number | string>;

function formatTick(value: string, period: Period, locale: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!(year && month)) return value;
  if (period === "month" && day) {
    return new Date(year, month - 1, day).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
  }
  // Total spans years, so keep the year to avoid repeated month labels.
  return new Date(year, month - 1).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
  });
}

/** Screen-reader copy of the chart data; the SVG itself is aria-hidden. */
export function ChartDataTable({
  caption,
  series,
  rows,
  format,
}: {
  caption: string;
  series: Series[];
  rows: { label: string; values: Record<string, number> }[];
  format: (value: number) => string;
}) {
  const { t } = useTranslation("dashboard");
  return (
    // sr-only sits on a wrapper: Firefox paints a <caption> outside its table's clip, so it leaked on screen.
    <div className="sr-only">
      <table data-chart-table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t("home.date", "Date")}</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.label}-${index}`}>
              <th scope="row">{row.label}</th>
              {series.map((s) => (
                <td key={s.key}>{format(row.values[s.key] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatsChart({
  period,
  series,
  today,
  points,
  caption,
  format,
}: {
  period: Period;
  series: Series[];
  /** Today values keyed by series key (chart units). */
  today: Record<string, number>;
  /** Month/total points in chart units. */
  points: Point[];
  caption: string;
  format: (value: number) => string;
}) {
  const { t, i18n } = useTranslation("dashboard");
  const locale = i18n.language;
  const config: ChartConfig = Object.fromEntries(
    series.map((s) => [s.key, { label: s.label, color: s.color }])
  );

  if (period === "today") {
    const hasData = series.some((s) => (today[s.key] ?? 0) > 0);
    if (!hasData) return <ModuleEmpty className="h-60" />;
    return (
      <>
        <div aria-hidden="true">
          <ChartContainer className="mx-auto h-60 w-full" config={config}>
            <PieChart>
              <ChartLegend content={<ChartLegendContent />} />
              <ChartTooltip
                content={<ChartTooltipContent hideLabel />}
                cursor={false}
              />
              {/* The sr-only table carries the data; keep the donut out of the Tab order (it has no visible focus). */}
              <Pie
                data={series.map((s) => ({
                  type: s.key,
                  value: today[s.key] ?? 0,
                  fill: `var(--color-${s.key})`,
                }))}
                dataKey="value"
                innerRadius={50}
                nameKey="type"
                rootTabIndex={-1}
                stroke="var(--ds-surface)"
                strokeWidth={4}
              />
            </PieChart>
          </ChartContainer>
        </div>
        <ChartDataTable
          caption={caption}
          format={format}
          rows={[{ label: t("today", "Today"), values: today }]}
          series={series}
        />
      </>
    );
  }

  if (points.length === 0) return <ModuleEmpty className="h-60" />;

  const tick = (value: string) => formatTick(value, period, locale);
  let chart: ReactNode;
  if (period === "month") {
    chart = (
      <BarChart data={points}>
        <CartesianGrid stroke="var(--ds-chart-grid)" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="date"
          tick={{ fill: "var(--ds-text-3)" }}
          tickFormatter={tick}
          tickLine={false}
          tickMargin={10}
        />
        {series.map((s, i) => (
          <Bar
            dataKey={s.key}
            fill={`var(--color-${s.key})`}
            key={s.key}
            radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
            stackId="a"
          />
        ))}
        <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    );
  } else {
    chart = (
      <AreaChart data={points} margin={{ left: 12, right: 12 }}>
        <CartesianGrid stroke="var(--ds-chart-grid)" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="date"
          tick={{ fill: "var(--ds-text-3)" }}
          tickFormatter={tick}
          tickLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
        {series.map((s) => (
          <Area
            dataKey={s.key}
            fill={`var(--color-${s.key})`}
            fillOpacity={0.3}
            key={s.key}
            stackId="a"
            stroke={`var(--color-${s.key})`}
            type="natural"
          />
        ))}
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    );
  }

  return (
    <>
      <div aria-hidden="true">
        <ChartContainer className="h-60 w-full" config={config}>
          {chart}
        </ChartContainer>
      </div>
      <ChartDataTable
        caption={caption}
        format={format}
        rows={points.map((p) => ({
          label: tick(p.date),
          values: Object.fromEntries(
            series.map((s) => [s.key, Number(p[s.key]) || 0])
          ),
        }))}
        series={series}
      />
    </>
  );
}

export function SummaryRow({
  items,
}: {
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-3 border-ds-border-subtle border-t pt-4">
      {items.map((item) => (
        <div className="flex min-w-0 flex-col gap-1" key={item.label}>
          <dt className="truncate text-ds-text-3 text-xs">{item.label}</dt>
          <dd
            className="font-semibold text-[18px] text-ds-text-1 tabular-nums leading-none"
            data-summary-value
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
