import type { ModuleState } from "./module-state";

export type ServerStatus = {
  online_servers: number;
  offline_servers: number;
};

export type Health =
  | "unknown"
  | "checking"
  | "attention"
  | "partial"
  | "no-servers"
  | "ok";

export type Tone = "muted" | "success" | "warning" | "danger";

/**
 * Overall Home status. Rules are evaluated in order; the first match wins
 * (docs/plans/admin-home-b.md, "整体健康状态"). Only when all four modules are
 * ready can the result be "ok".
 */
export function deriveHealth(
  server: ModuleState<ServerStatus>,
  ticket: ModuleState<number>,
  revenue: ModuleState<unknown>,
  user: ModuleState<unknown>
): Health {
  if (server.status === "error" || ticket.status === "error") return "unknown";
  if (server.status !== "ready" || ticket.status !== "ready") return "checking";
  if (server.data.offline_servers > 0 || ticket.data > 0) return "attention";
  if (revenue.status === "error" || user.status === "error") return "partial";
  if (revenue.status !== "ready" || user.status !== "ready") return "checking";
  if (server.data.online_servers + server.data.offline_servers === 0) {
    return "no-servers";
  }
  return "ok";
}

export function healthTone(health: Health): Tone {
  if (health === "ok") return "success";
  if (health === "attention") return "warning";
  return "muted";
}

/** Whether the overall badge should carry a warning icon. */
export function healthHasAlertIcon(health: Health) {
  return health === "unknown" || health === "partial";
}
