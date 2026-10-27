import { unitConversion } from "@workspace/ui/utils/unit-conversions";
import { useTranslation } from "react-i18next";
import { Display } from "@/components/display";
import {
  type Period,
  type Series,
  StatsChart,
  SummaryRow,
} from "./stats-chart";

const toDollars = (cents: number) =>
  unitConversion("centsToDollars", cents) ?? 0;

export default function RevenuePanel({
  data,
  period,
}: {
  data: API.RevenueStatisticsResponse;
  period: Period;
}) {
  const { t } = useTranslation("dashboard");
  const series: Series[] = [
    {
      key: "new_purchase",
      label: t("newPurchase", "New Purchase"),
      color: "var(--chart-1)",
    },
    {
      key: "repurchase",
      label: t("repurchase", "Repurchase"),
      color: "var(--chart-2)",
    },
  ];
  const stats =
    period === "today"
      ? data.today
      : period === "month"
        ? data.monthly
        : data.all;
  const list = period === "today" ? [] : (stats?.list ?? []);

  const summary = [
    {
      label: t("totalIncome", "Total Income"),
      value: <Display type="currency" value={stats?.amount_total ?? 0} />,
    },
  ];
  if (period !== "total") {
    summary.push(
      {
        label: t("newPurchase", "New Purchase"),
        value: <Display type="currency" value={stats?.new_order_amount ?? 0} />,
      },
      {
        label: t("repurchase", "Repurchase"),
        value: (
          <Display type="currency" value={stats?.renewal_order_amount ?? 0} />
        ),
      }
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <StatsChart
        caption={t("revenueTitle", "Revenue Statistics")}
        format={(v) => v.toFixed(2)}
        period={period}
        points={list.map((item) => ({
          date: item.date,
          new_purchase: toDollars(item.new_order_amount),
          repurchase: toDollars(item.renewal_order_amount),
        }))}
        series={series}
        today={{
          new_purchase: toDollars(data.today?.new_order_amount ?? 0),
          repurchase: toDollars(data.today?.renewal_order_amount ?? 0),
        }}
      />
      <SummaryRow items={summary} />
    </div>
  );
}
