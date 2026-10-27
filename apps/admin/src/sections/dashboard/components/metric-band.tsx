import { Link } from "@tanstack/react-router";
import { formatBytes } from "@workspace/ui/utils/formatting";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Display } from "@/components/display";
import { useRevenue, useServerTotal } from "../hooks/use-dashboard-data";
import { type ModuleState, toModuleState } from "../lib/module-state";
import { MISSING } from "./module-states";

function Metric<T>({
  label,
  state,
  value,
  detail,
  href,
}: {
  label: string;
  state: ModuleState<T>;
  value: (data: T) => ReactNode;
  detail?: (data: T) => ReactNode;
  href?: "/dashboard/servers";
}) {
  const { t } = useTranslation("dashboard");
  const body = (
    <div className="flex min-w-0 flex-col gap-1 p-5" data-metric={label}>
      <span className="text-ds-text-2 text-xs">{label}</span>
      <span
        className="font-semibold text-[28px] text-ds-text-1 tabular-nums leading-tight"
        data-metric-value
      >
        {state.status === "ready" ? value(state.data) : MISSING}
      </span>
      <span className="min-h-4 truncate text-ds-text-3 text-xs tabular-nums">
        {state.status === "error"
          ? t("home.fetchFailed", "Failed to load")
          : state.status === "ready" && detail
            ? detail(state.data)
            : null}
      </span>
    </div>
  );
  if (!href) return body;
  return (
    <Link
      className="block min-w-0 rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
      to={href}
    >
      {body}
    </Link>
  );
}

export default function MetricBand() {
  const { t } = useTranslation("dashboard");
  const server = toModuleState(useServerTotal());
  const revenue = toModuleState(useRevenue());

  return (
    <section
      aria-label={t("home.metrics", "Key metrics")}
      className="grid @3xl/home:grid-cols-2 @5xl/home:grid-cols-4 grid-cols-1 @5xl/home:divide-x divide-y @3xl/home:divide-y-0 divide-ds-border-subtle rounded-2xl border border-ds-border-subtle bg-ds-surface shadow-ds-highlight"
    >
      <Metric
        href="/dashboard/servers"
        label={t("onlineUsersCount", "Online Users")}
        state={server}
        value={(d) => d.online_users}
      />
      <Metric
        detail={(d) => (
          <>
            {t("newPurchase", "New Purchase")}{" "}
            <Display type="currency" value={d.today.new_order_amount} /> ·{" "}
            {t("repurchase", "Repurchase")}{" "}
            <Display type="currency" value={d.today.renewal_order_amount} />
          </>
        )}
        label={t("home.todayRevenue", "Today Revenue")}
        state={revenue}
        value={(d) => <Display type="currency" value={d.today.amount_total} />}
      />
      <Metric
        detail={(d) =>
          `↑${formatBytes(d.today_upload)} ↓${formatBytes(d.today_download)}`
        }
        label={t("todayTraffic", "Today Traffic")}
        state={server}
        value={(d) => formatBytes(d.today_upload + d.today_download)}
      />
      <Metric
        detail={(d) =>
          `↑${formatBytes(d.monthly_upload)} ↓${formatBytes(d.monthly_download)}`
        }
        label={t("monthTraffic", "Month Traffic")}
        state={server}
        value={(d) => formatBytes(d.monthly_upload + d.monthly_download)}
      />
    </section>
  );
}
