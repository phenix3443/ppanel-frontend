import type { ModuleState } from "./module-state";

export type ServerStatus = {
  online_servers: number;
  offline_servers: number;
};

export type Tone = "muted" | "success" | "warning" | "danger";

/**
 * Tone of the server KPI card (docs/plans/admin-home-a.md). Only a ready
 * result can raise danger; loading and failed requests stay muted.
 */
export function serverTone(server: ModuleState<ServerStatus>): Tone {
  if (server.status !== "ready") return "muted";
  return server.data.offline_servers > 0 ? "danger" : "muted";
}

/** Tone of the pending-ticket KPI card; warning only for a ready count > 0. */
export function ticketTone(ticket: ModuleState<number>): Tone {
  if (ticket.status !== "ready") return "muted";
  return ticket.data > 0 ? "warning" : "muted";
}
