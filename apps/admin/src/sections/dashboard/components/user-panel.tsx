import { useTranslation } from "react-i18next";
import {
  type Period,
  type Series,
  StatsChart,
  SummaryRow,
} from "./stats-chart";

export default function UserPanel({
  data,
  period,
}: {
  data: API.UserStatisticsResponse;
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
    {
      key: "register",
      label: t("register", "Register"),
      color: "var(--chart-3)",
    },
  ];
  const stats =
    period === "today"
      ? data.today
      : period === "month"
        ? data.monthly
        : data.all;
  const list = period === "today" ? [] : (stats?.list ?? []);

  return (
    <div className="flex flex-col gap-4">
      <StatsChart
        caption={t("userTitle", "User Statistics")}
        format={(v) => String(v)}
        period={period}
        points={list.map((item) => ({
          date: item.date,
          new_purchase: item.new_order_users,
          repurchase: item.renewal_order_users,
          register: item.register,
        }))}
        series={series}
        today={{
          new_purchase: data.today?.new_order_users ?? 0,
          repurchase: data.today?.renewal_order_users ?? 0,
          register: data.today?.register ?? 0,
        }}
      />
      <SummaryRow
        items={[
          { label: t("register", "Register"), value: stats?.register ?? 0 },
          {
            label: t("newPurchase", "New Purchase"),
            value: stats?.new_order_users ?? 0,
          },
          {
            label: t("repurchase", "Repurchase"),
            value: stats?.renewal_order_users ?? 0,
          },
        ]}
      />
    </div>
  );
}
