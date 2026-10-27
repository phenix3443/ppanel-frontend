import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRevenue } from "../hooks/use-dashboard-data";
import { toModuleState } from "../lib/module-state";
import { ModuleError, ModuleLoading } from "./module-states";
import { PeriodCard, usePeriodOptions } from "./period-card";
import RevenuePanel from "./revenue-panel";
import type { Period } from "./stats-chart";

export default function RevenueCard() {
  const { t } = useTranslation("dashboard");
  const periodOptions = usePeriodOptions();
  const [period, setPeriod] = useState<Period>("today");
  const query = useRevenue();
  const revenue = toModuleState(query);

  return (
    <PeriodCard
      module="revenue"
      onChange={setPeriod}
      options={periodOptions}
      title={t("revenueTitle", "Revenue Statistics")}
      value={period}
    >
      {revenue.status === "loading" ? (
        <ModuleLoading className="h-72" />
      ) : revenue.status === "error" ? (
        <ModuleError className="h-72" onRetry={() => query.refetch()} />
      ) : (
        <RevenuePanel data={revenue.data} period={period} />
      )}
    </PeriodCard>
  );
}
