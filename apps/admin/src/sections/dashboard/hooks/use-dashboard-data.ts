import { useQuery } from "@tanstack/react-query";
import {
  getConsoleRevenue,
  getConsoleServer,
  getConsoleTicket,
  getConsoleUser,
  getToolVersion,
} from "@workspace/ui/services/admin/admin";

// The only place Home fetches data. Query keys and options are unchanged from
// the previous dashboard so cache entries and request counts stay the same.

export function useServerTotal() {
  return useQuery({
    queryKey: ["queryServerTotalData"],
    queryFn: async () => {
      const { data } = await getConsoleServer();
      return data.data;
    },
  });
}

export function useTicketCount() {
  return useQuery({
    queryKey: ["queryTicketWaitReply"],
    queryFn: async () => {
      const { data } = await getConsoleTicket();
      return data.data?.count;
    },
  });
}

export function useRevenue() {
  return useQuery({
    queryKey: ["queryRevenueStatistics"],
    queryFn: async () => {
      const { data } = await getConsoleRevenue();
      return data.data;
    },
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: ["queryUserStatistics"],
    queryFn: async () => {
      const { data } = await getConsoleUser();
      return data.data;
    },
  });
}

export function useServerVersion() {
  return useQuery({
    queryKey: ["getServerVersion"],
    queryFn: async () => {
      const { data } = await getToolVersion({ skipErrorHandler: true });
      return data.data?.version ?? null;
    },
    retry: 1,
  });
}
