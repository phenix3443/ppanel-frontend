import { Link } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useServerVersion } from "../hooks/use-dashboard-data";
import { useHomeHealth } from "../hooks/use-home-health";
import type { Tone } from "../lib/health";
import { MISSING } from "./module-states";
import { StatusBadge } from "./status-badge";
import SystemRestart from "./system-restart";

const linkClass =
  "rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring";

function RetryButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation("dashboard");
  return (
    <Button
      className="h-7 px-2 text-xs"
      onClick={onClick}
      size="sm"
      variant="ghost"
    >
      {t("home.retry", "Retry")}
    </Button>
  );
}

function ServerItem() {
  const { t } = useTranslation("dashboard");
  const { server, refetchServer } = useHomeHealth();

  if (server.status === "error") {
    return (
      <span className="inline-flex items-center gap-1">
        <StatusBadge alert tone="muted">
          {t("home.serverFailed", "Server status unavailable")}
        </StatusBadge>
        <RetryButton onClick={refetchServer} />
      </span>
    );
  }

  let tone: Tone = "muted";
  let text = `${t("home.servers", "Servers")} ${MISSING}`;
  if (server.status === "ready") {
    const online = server.data.online_servers;
    const offline = server.data.offline_servers;
    const total = online + offline;
    if (total === 0) {
      text = t("home.noServers", "No servers connected");
    } else if (offline > 0) {
      tone = "danger";
      text = t(
        "home.serversOffline",
        "Servers {{online}}/{{total}} online · {{offline}} offline",
        { online, total, offline }
      );
    } else {
      text = t("home.serversOnline", "Servers {{online}}/{{total}} online", {
        online,
        total,
      });
    }
  }

  return (
    <Link className={linkClass} to="/dashboard/servers">
      <StatusBadge data-item="server" tone={tone}>
        {text}
      </StatusBadge>
    </Link>
  );
}

function TicketItem() {
  const { t } = useTranslation("dashboard");
  const { ticket, refetchTicket } = useHomeHealth();

  if (ticket.status === "error") {
    return (
      <span className="inline-flex items-center gap-1">
        <StatusBadge alert tone="muted">
          {t("home.ticketFailed", "Ticket count unavailable")}
        </StatusBadge>
        <RetryButton onClick={refetchTicket} />
      </span>
    );
  }

  let tone: Tone = "muted";
  let text = `${t("home.tickets", "Tickets")} ${MISSING}`;
  if (ticket.status === "ready") {
    if (ticket.data > 0) {
      tone = "warning";
      text = t("home.ticketsPending", "Tickets {{n}} pending", {
        n: ticket.data,
      });
    } else {
      text = t("home.ticketsNone", "Tickets none pending");
    }
  }

  return (
    <Link className={linkClass} to="/dashboard/ticket">
      <StatusBadge data-item="ticket" tone={tone}>
        {text}
      </StatusBadge>
    </Link>
  );
}

function Versions() {
  const { t } = useTranslation("tool");
  const { data: serverVersion } = useServerVersion();
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-ds-text-3 text-xs">
      <span>
        {t("webVersion", "Web Version")}{" "}
        {/* package.json 的 version 是上游的 tag，不随我们的提交变；CI 注入 sha-<commit> */}
        <span className="font-ds-mono text-ds-text-2">
          {import.meta.env.VITE_APP_VERSION ?? "dev"}
        </span>
      </span>
      <span>
        {t("serverVersion", "Server Version")}{" "}
        <span className="font-ds-mono text-ds-text-2">
          {serverVersion ? `V${serverVersion}` : MISSING}
        </span>
      </span>
    </span>
  );
}

export default function HealthStrip() {
  const { t } = useTranslation("dashboard");
  const { health } = useHomeHealth();
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "grid @3xl/home:grid-cols-[auto_minmax(0,1fr)_auto] grid-cols-1 items-center gap-3 rounded-2xl border bg-ds-surface p-4 shadow-ds-highlight",
        health === "attention"
          ? "border-ds-warning/60"
          : "border-ds-border-subtle"
      )}
      data-health-strip
    >
      <h2 className="font-semibold text-[15px] text-ds-text-1" id={titleId}>
        {t("home.status", "Running status")}
      </h2>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <ServerItem />
        <TicketItem />
        <Versions />
      </div>
      <SystemRestart />
    </section>
  );
}
