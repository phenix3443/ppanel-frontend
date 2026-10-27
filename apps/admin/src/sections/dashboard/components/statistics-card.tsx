import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRevenue, useUserStats } from "../hooks/use-dashboard-data";
import { toModuleState } from "../lib/module-state";
import { ModuleError, ModuleLoading } from "./module-states";
import RevenuePanel from "./revenue-panel";
import type { Period } from "./stats-chart";
import UserPanel from "./user-panel";

type Kind = "revenue" | "user";

export const segmentListClass =
  "h-8 rounded-[10px] border border-ds-border-subtle bg-ds-canvas p-0.5";
export const segmentTriggerClass =
  "rounded-[8px] px-2.5 text-xs text-ds-text-2 focus-visible:ring-[3px] focus-visible:ring-ring data-[state=active]:bg-ds-surface-raised data-[state=active]:text-ds-text-1 data-[state=active]:shadow-none";

export default function StatisticsCard() {
  const { t } = useTranslation("dashboard");
  const titleId = useId();
  const [kind, setKind] = useState<Kind>("revenue");
  const [period, setPeriod] = useState<Period>("today");
  const revenueQuery = useRevenue();
  const userQuery = useUserStats();
  const query = kind === "revenue" ? revenueQuery : userQuery;
  const revenue = toModuleState(revenueQuery);
  const user = toModuleState(userQuery);

  let body: React.ReactNode;
  if (kind === "revenue") {
    if (revenue.status === "loading") body = <ModuleLoading className="h-72" />;
    else if (revenue.status === "error")
      body = <ModuleError className="h-72" onRetry={() => query.refetch()} />;
    else body = <RevenuePanel data={revenue.data} period={period} />;
  } else if (user.status === "loading") {
    body = <ModuleLoading className="h-72" />;
  } else if (user.status === "error") {
    body = <ModuleError className="h-72" onRetry={() => query.refetch()} />;
  } else {
    body = <UserPanel data={user.data} period={period} />;
  }

  return (
    <section
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-ds-border-subtle bg-ds-surface p-5 shadow-ds-highlight"
      data-module="statistics"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-[15px] text-ds-text-1" id={titleId}>
          {kind === "revenue"
            ? t("revenueTitle", "Revenue Statistics")
            : t("userTitle", "User Statistics")}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs onValueChange={(v) => setKind(v as Kind)} value={kind}>
            <TabsList
              aria-label={t("home.statType", "Statistics type")}
              className={segmentListClass}
            >
              <TabsTrigger className={segmentTriggerClass} value="revenue">
                {t("home.revenue", "Revenue")}
              </TabsTrigger>
              <TabsTrigger className={segmentTriggerClass} value="user">
                {t("users", "Users")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs onValueChange={(v) => setPeriod(v as Period)} value={period}>
            <TabsList
              aria-label={t("home.timeRange", "Time range")}
              className={segmentListClass}
            >
              <TabsTrigger className={segmentTriggerClass} value="today">
                {t("today", "Today")}
              </TabsTrigger>
              <TabsTrigger className={segmentTriggerClass} value="month">
                {t("month", "Month")}
              </TabsTrigger>
              <TabsTrigger className={segmentTriggerClass} value="total">
                {t("total", "Total")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      {body}
    </section>
  );
}
