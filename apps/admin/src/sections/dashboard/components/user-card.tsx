import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUserStats } from "../hooks/use-dashboard-data";
import { toModuleState } from "../lib/module-state";
import { ModuleError, ModuleLoading } from "./module-states";
import { PeriodCard, usePeriodOptions } from "./period-card";
import type { Period } from "./stats-chart";
import UserPanel from "./user-panel";

export default function UserCard() {
  const { t } = useTranslation("dashboard");
  const periodOptions = usePeriodOptions();
  const [period, setPeriod] = useState<Period>("today");
  const query = useUserStats();
  const user = toModuleState(query);

  return (
    <PeriodCard
      module="user"
      onChange={setPeriod}
      options={periodOptions}
      title={t("userTitle", "User Statistics")}
      value={period}
    >
      {user.status === "loading" ? (
        <ModuleLoading className="h-72" />
      ) : user.status === "error" ? (
        <ModuleError className="h-72" onRetry={() => query.refetch()} />
      ) : (
        <UserPanel data={user.data} period={period} />
      )}
    </PeriodCard>
  );
}
