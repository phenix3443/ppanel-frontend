import { useTranslation } from "react-i18next";
import { useServerTotal } from "../hooks/use-dashboard-data";
import { toModuleState } from "../lib/module-state";

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
  const server = toModuleState(useServerTotal());
  const updatedAt = server.status === "ready" ? server.data?.updated_at : 0;

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <h1 className="font-semibold text-[22px] text-ds-text-1 leading-tight">
        {t("home.title", "Overview")}
      </h1>
      {updatedAt && updatedAt > 0 ? <UpdatedAt seconds={updatedAt} /> : null}
    </header>
  );
}
