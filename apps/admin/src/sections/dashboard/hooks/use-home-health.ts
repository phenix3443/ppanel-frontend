import { deriveHealth } from "../lib/health";
import { toModuleState } from "../lib/module-state";
import {
  useRevenue,
  useServerTotal,
  useTicketCount,
  useUserStats,
} from "./use-dashboard-data";

/** Module states and overall health shared by the header and status strip. */
export function useHomeHealth() {
  const serverQuery = useServerTotal();
  const ticketQuery = useTicketCount();
  const revenueQuery = useRevenue();
  const userQuery = useUserStats();

  const server = toModuleState(serverQuery);
  const ticket = toModuleState(ticketQuery);
  const revenue = toModuleState(revenueQuery);
  const user = toModuleState(userQuery);

  return {
    server,
    ticket,
    revenue,
    user,
    health: deriveHealth(server, ticket, revenue, user),
    refetchServer: () => serverQuery.refetch(),
    refetchTicket: () => ticketQuery.refetch(),
  };
}
