// @vitest-environment jsdom

import { cleanup, screen, waitFor, within } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import Dashboard from "./index";
import {
  emptyRevenue,
  emptyUserStats,
  mockApi,
  renderWithClient,
  serverData,
  stubResizeObserver,
  URLS,
} from "./test-utils";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@workspace/ui/lib/request", () => ({ default: request }));
vi.mock("react-i18next", async () =>
  (await import("./test-utils")).reactI18nextMock()
);
vi.mock("@tanstack/react-router", async () =>
  (await import("./test-utils")).routerMock()
);
vi.mock("@workspace/ui/composed/icon", () => ({ Icon: () => null }));
vi.mock("./components/billing", () => ({
  default: () => <div data-testid="billing" />,
}));
vi.mock("@/sections/user/user-detail", () => ({
  UserDetail: () => null,
  UserSubscribeDetail: () => null,
}));

beforeAll(stubResizeObserver);
beforeEach(() => {
  request.mockReset();
});
afterEach(() => {
  cleanup();
});

const offlineTwo = serverData({ online_servers: 34, offline_servers: 2 });
const healthyServer = serverData({ online_servers: 3 });

function card(id: string) {
  return document.querySelector(`[data-kpi="${id}"]`) as HTMLElement;
}

describe("Home layout A", () => {
  it("orders header → KPI cards → revenue|users → node|user traffic → sponsors", async () => {
    mockApi(request, {
      server: healthyServer,
      ticket: { count: 0 },
      revenue: emptyRevenue,
      user: emptyUserStats,
    });
    renderWithClient(<Dashboard />);
    await waitFor(() =>
      expect(card("server").textContent).toContain("Online 3")
    );

    const order = [
      document.querySelector("header"),
      screen.getByRole("region", { name: "Key metrics" }),
      document.querySelector('[data-module="revenue"]'),
      document.querySelector('[data-module="user"]'),
      document.querySelector('[data-module="traffic-rank-nodes"]'),
      document.querySelector('[data-module="traffic-rank-users"]'),
      screen.getByTestId("billing"),
    ];
    for (let i = 1; i < order.length; i++) {
      const prev = order[i - 1] as Node;
      const next = order[i] as Node;
      expect(prev.compareDocumentPosition(next)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
    }
    expect(document.querySelector("[data-admin-home]")?.className).toContain(
      "admin-home"
    );
    // A has no status strip and no overall health badge.
    expect(document.querySelector("[data-health-strip]")).toBeNull();
    expect(document.querySelector("[data-health]")).toBeNull();
  });

  it("keeps server and ticket results when only revenue fails", async () => {
    mockApi(request, {
      server: healthyServer,
      ticket: { count: 0 },
      revenue: new Error("revenue down"),
      user: emptyUserStats,
    });
    renderWithClient(<Dashboard />);

    await waitFor(() =>
      expect(
        within(
          document.querySelector('[data-module="revenue"]') as HTMLElement
        ).getByText("Failed to load data")
      ).toBeTruthy()
    );
    expect(card("server").textContent).toContain("Online 3");
    expect(card("ticket").querySelector("[data-kpi-value]")?.textContent).toBe(
      "0"
    );
    expect(screen.queryByText("Failed to load")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Retry" }).length).toBe(1);
  });

  it("keeps the real server result visible when revenue fails and servers are offline", async () => {
    mockApi(request, {
      server: offlineTwo,
      ticket: { count: 0 },
      revenue: new Error("revenue down"),
      user: emptyUserStats,
    });
    renderWithClient(<Dashboard />);

    await waitFor(() =>
      expect(card("server").getAttribute("data-tone")).toBe("danger")
    );
    expect(card("server").textContent).toContain("Offline 2");
  });

  it("shows no zero or normal text when every console request fails", async () => {
    mockApi(request, {
      server: new Error("x"),
      ticket: new Error("x"),
      revenue: new Error("x"),
      user: new Error("x"),
    });
    renderWithClient(<Dashboard />);

    await waitFor(() =>
      expect(screen.getAllByText("Failed to load data")).toHaveLength(4)
    );
    expect(screen.getAllByText("Failed to load")).toHaveLength(5);
    for (const el of document.querySelectorAll("[data-kpi-value]")) {
      expect(el.textContent).toBe("—");
    }
    expect(screen.queryByText("No servers connected")).toBeNull();
    expect(document.body.textContent).not.toContain("NaN");
  });

  it("only calls the existing console and tool endpoints", async () => {
    mockApi(request, {
      server: healthyServer,
      ticket: { count: 0 },
      revenue: emptyRevenue,
      user: emptyUserStats,
      version: { version: "1.0.0" },
    });
    renderWithClient(<Dashboard />);
    await screen.findByText("V1.0.0");

    const allowed = new Set<string>(Object.values(URLS));
    const urls = new Set(request.mock.calls.map(([url]) => String(url)));
    for (const url of urls) expect(allowed.has(url)).toBe(true);
    for (const url of [
      URLS.server,
      URLS.ticket,
      URLS.revenue,
      URLS.user,
      URLS.version,
    ]) {
      expect(request.mock.calls.filter(([u]) => u === url).length, url).toBe(1);
    }
    expect(urls.has(URLS.restart)).toBe(false);
  });
});
