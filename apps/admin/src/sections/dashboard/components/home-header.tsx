import { useTranslation } from "react-i18next";
import { useHomeHealth } from "../hooks/use-home-health";
import { type Health, healthHasAlertIcon, healthTone } from "../lib/health";
import { StatusBadge } from "./status-badge";

const HEALTH_TEXT: Record<Health, [key: string, fallback: string]> = {
  unknown: ["home.health.unknown", "Some status unavailable"],
  checking: ["home.health.checking", "Checking status"],
  loading: ["home.health.loading", "Loading data"],
  attention: ["home.health.attention", "Needs attention"],
  partial: ["home.health.partial", "Some statistics unavailable"],
  "no-servers": ["home.health.noServers", "No servers connected"],
  ok: ["home.health.ok", "All systems normal"],
};

function useRelativeTime(seconds: number) {
  const { i18n } = useTranslation();
  const diff = Math.round(seconds - Date.now() / 1000);
  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(diff, "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86_400), "day");
}

function UpdatedAt({ seconds }: { seconds: number }) {
  const { t } = useTranslation("dashboard");
  const relative = useRelativeTime(seconds);
  return (
    <p className="text-ds-text-3 text-xs">
      {t("home.updatedAt", "Data updated {{time}}", { time: relative })}
    </p>
  );
}

export default function HomeHeader() {
  const { t } = useTranslation("dashboard");
  const { server, health } = useHomeHealth();
  const [key, fallback] = HEALTH_TEXT[health];
  const updatedAt = server.status === "ready" ? server.data?.updated_at : 0;

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <h1 className="font-semibold text-[22px] text-ds-text-1 leading-tight">
          {t("home.title", "Overview")}
        </h1>
        <StatusBadge
          alert={healthHasAlertIcon(health)}
          data-health={health}
          role="status"
          tone={healthTone(health)}
        >
          {t(key, fallback)}
        </StatusBadge>
      </div>
      {updatedAt && updatedAt > 0 ? <UpdatedAt seconds={updatedAt} /> : null}
    </header>
  );
}
