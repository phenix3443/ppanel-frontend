import { formatBytes } from "@workspace/ui/utils/formatting";
import { useTranslation } from "react-i18next";
import { useServerTotal, useTicketCount } from "../hooks/use-dashboard-data";
import { serverTone, ticketTone } from "../lib/health";
import { toModuleState } from "../lib/module-state";
import { KpiCard } from "./kpi-card";
import SystemServiceCard from "./system-service-card";

function ServerCard() {
  const { t } = useTranslation("dashboard");
  const query = useServerTotal();
  const server = toModuleState(query);
  const tone = serverTone(server);

  let value: number | null = null;
  let detail: React.ReactNode = null;
  if (server.status === "ready") {
    const { online_servers: online, offline_servers: offline } = server.data;
    value = online + offline;
    detail =
      value === 0 ? (
        t("home.noServers", "No servers connected")
      ) : (
        <span className="inline-flex gap-2.5">
          <span className="text-ds-success">
            {t("online", "Online")} {online}
          </span>
          <span
            className={offline > 0 ? "text-ds-danger" : "text-ds-text-3"}
            data-offline
          >
            {t("offline", "Offline")} {offline}
          </span>
        </span>
      );
  }

  return (
    <KpiCard
      detail={detail}
      href="/dashboard/servers"
      icon="server"
      id="server"
      label={t("totalServers", "Total Servers")}
      onRetry={() => query.refetch()}
      status={server.status}
      tone={tone}
      value={value}
    />
  );
}

function TicketCard() {
  const { t } = useTranslation("dashboard");
  const query = useTicketCount();
  const ticket = toModuleState(query);
  const tone = ticketTone(ticket);

  return (
    <KpiCard
      detail={t("pending", "Pending")}
      href="/dashboard/ticket"
      icon="ticket"
      id="ticket"
      label={t("pendingTickets", "Pending Tickets")}
      onRetry={() => query.refetch()}
      status={ticket.status}
      tone={tone}
      value={ticket.status === "ready" ? ticket.data : null}
      valueTone={tone === "warning" ? "warning" : undefined}
    />
  );
}

/**
 * Board-selected layout A: six equal-weight cards, 3 × 2 when wide and a
 * single column on narrow screens (docs/plans/admin-home-a.md).
 */
export default function KpiGrid() {
  const { t } = useTranslation("dashboard");
  const query = useServerTotal();
  const server = toModuleState(query);
  const data = server.status === "ready" ? server.data : null;
  const retry = () => query.refetch();

  return (
    <section
      aria-label={t("home.metrics", "Key metrics")}
      className="grid @3xl/home:grid-cols-2 @5xl/home:grid-cols-3 grid-cols-1 gap-4"
    >
      <KpiCard
        detail={t("currentlyOnline", "Currently online")}
        href="/dashboard/servers"
        icon="users"
        id="online-users"
        label={t("onlineUsersCount", "Online Users")}
        onRetry={retry}
        status={server.status}
        value={data?.online_users}
      />
      <KpiCard
        detail={
          data
            ? `↑ ${formatBytes(data.today_upload)}  ↓ ${formatBytes(data.today_download)}`
            : null
        }
        icon="swap"
        id="today-traffic"
        label={t("todayTraffic", "Today Traffic")}
        onRetry={retry}
        status={server.status}
        value={
          data ? formatBytes(data.today_upload + data.today_download) : null
        }
      />
      <KpiCard
        detail={
          data
            ? `↑ ${formatBytes(data.monthly_upload)}  ↓ ${formatBytes(data.monthly_download)}`
            : null
        }
        icon="cloud"
        id="month-traffic"
        label={t("monthTraffic", "Month Traffic")}
        onRetry={retry}
        status={server.status}
        value={
          data ? formatBytes(data.monthly_upload + data.monthly_download) : null
        }
      />
      <ServerCard />
      <TicketCard />
      <SystemServiceCard />
    </section>
  );
}
