import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Mock } from "vitest";

export const URLS = {
  server: "/v1/admin/console/server",
  ticket: "/v1/admin/console/ticket",
  revenue: "/v1/admin/console/revenue",
  user: "/v1/admin/console/user",
  version: "/v1/admin/tool/version",
  restart: "/v1/admin/tool/restart",
} as const;

const emptyOrders = {
  amount_total: 0,
  date: "",
  list: [],
  new_order_amount: 0,
  renewal_order_amount: 0,
};
const emptyUsers = {
  date: "",
  list: [],
  new_order_users: 0,
  register: 0,
  renewal_order_users: 0,
};

export function serverData(
  overrides: Partial<API.ServerTotalDataResponse> = {}
): API.ServerTotalDataResponse {
  return {
    monthly_download: 0,
    monthly_upload: 0,
    offline_servers: 0,
    online_servers: 0,
    online_users: 0,
    server_traffic_ranking_today: [],
    server_traffic_ranking_yesterday: [],
    today_download: 0,
    today_upload: 0,
    updated_at: 0,
    user_traffic_ranking_today: [],
    user_traffic_ranking_yesterday: [],
    ...overrides,
  };
}

export const emptyRevenue: API.RevenueStatisticsResponse = {
  all: emptyOrders,
  monthly: emptyOrders,
  today: emptyOrders,
};

export const emptyUserStats: API.UserStatisticsResponse = {
  all: emptyUsers,
  monthly: emptyUsers,
  today: emptyUsers,
};

type Reply = unknown | Error;

/** A request that never settles, so the module stays loading. */
export function pending() {
  return new Promise<never>(() => {
    // intentionally never settles
  });
}

/** recharts' ResponsiveContainer needs ResizeObserver, which jsdom lacks. */
export function stubResizeObserver() {
  globalThis.ResizeObserver ??= class {
    observe() {
      // no layout in jsdom
    }
    unobserve() {
      // no layout in jsdom
    }
    disconnect() {
      // no layout in jsdom
    }
  } as unknown as typeof ResizeObserver;
}

/**
 * Route the mocked request layer by URL. An Error value rejects, anything
 * else resolves as `{ code: 200, data }`.
 */
export function mockApi(
  request: Mock,
  replies: Partial<Record<keyof typeof URLS, Reply>>
) {
  request.mockImplementation((url: string) => {
    const entry = Object.entries(URLS).find(([, path]) => path === url);
    const key = entry?.[0] as keyof typeof URLS | undefined;
    const reply = key ? replies[key] : undefined;
    if (reply instanceof Error) return Promise.reject(reply);
    if (key && key in replies) {
      return Promise.resolve({ data: { code: 200, data: reply } });
    }
    // Unlisted endpoints stay pending (loading).
    return pending();
  });
}

export function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
  return { client, ...result };
}

export const reactI18nextMock = () => ({
  useTranslation: () => ({
    t: (
      _key: string,
      fallback: string,
      vars?: Record<string, string | number>
    ) =>
      (fallback ?? _key).replace(/\{\{(\w+)\}\}/g, (_m, name) =>
        String(vars?.[name] ?? "")
      ),
    i18n: { language: "en-US" },
  }),
});

export const routerMock = () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
});
