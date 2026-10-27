import { useTranslation } from "react-i18next";
import { useServerVersion } from "../hooks/use-dashboard-data";
import { cardClass } from "./kpi-card";
import { MISSING } from "./module-states";
import SystemRestart from "./system-restart";

function VersionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-ds-text-2 text-xs">{label}</span>
      <span className="min-w-0 truncate rounded-full border border-ds-border bg-ds-surface-raised px-2.5 py-0.5 font-ds-mono text-ds-text-2 text-xs">
        {value}
      </span>
    </div>
  );
}

export default function SystemServiceCard() {
  const { t } = useTranslation("dashboard");
  const { t: tTool } = useTranslation("tool");
  const { data: serverVersion } = useServerVersion();

  return (
    <div className={cardClass} data-kpi="system">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-ds-text-2 text-xs">
          {t("home.systemService", "System service")}
        </span>
        <SystemRestart />
      </div>
      <VersionRow
        label={tTool("webVersion", "Web Version")}
        // package.json 的 version 是上游的 tag，不随我们的提交变；CI 注入 sha-<commit>
        value={import.meta.env.VITE_APP_VERSION ?? "dev"}
      />
      <VersionRow
        label={tTool("serverVersion", "Server Version")}
        value={serverVersion ? `V${serverVersion}` : MISSING}
      />
    </div>
  );
}
