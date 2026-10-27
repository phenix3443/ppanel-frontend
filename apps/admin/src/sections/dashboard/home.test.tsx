// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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

function overall() {
  // Last child is the label; the leading icon is aria-hidden.
  return document.querySelector("[data-health] > span:last-child")?.textContent;
}

describe("Home layout B", () => {
  it("orders header → status → metrics → statistics/ranking → sponsors", async () => {
    mockApi(request, {
      server: healthyServer,
      ticket: { count: 0 },
      revenue: emptyRevenue,
      user: emptyUserStats,
    });
    renderWithClient(<Dashboard />);
    await waitFor(() => expect(overall()).toBe("All systems normal"));

    const order = [
      document.querySelector("header"),
      document.querySelector("[data-health-strip]"),
      screen.getByRole("region", { name: "Key metrics" }),
      document.querySelector('[data-module="statistics"]'),
      document.querySelector('[data-module="traffic-rank"]'),
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
  });

  it("does not claim health when only revenue fails", async () => {
    mockApi(request, {
      server: healthyServer,
      ticket: { count: 0 },
      revenue: new Error("revenue down"),
      user: emptyUserStats,
    });
    renderWithClient(<Dashboard />);

    await waitFor(() => expect(overall()).toBe("Some statistics unavailable"));
    expect(screen.queryByText("All systems normal")).toBeNull();
    expect(screen.getByText("Servers 3/3 online")).toBeTruthy();
    expect(screen.getByText("Tickets none pending")).toBeTruthy();
    expect(screen.getByText("Failed to load data")).toBeTruthy();
    expect(screen.getByText("Failed to load")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Retry" }).length).toBe(1);
  });

  it("does not claim health when only user statistics fail", async () => {
    mockApi(request, {
      server: healthyServer,
      ticket: { count: 0 },
      revenue: emptyRevenue,
      user: new Error("user down"),
    });
    renderWithClient(<Dashboard />);

    await waitFor(() => expect(overall()).toBe("Some statistics unavailable"));
    expect(screen.queryByText("All systems normal")).toBeNull();
    expect(screen.getByText("Servers 3/3 online")).toBeTruthy();
    expect(screen.getByText("Tickets none pending")).toBeTruthy();
    const statsTypes = screen.getByRole("tablist", { name: "Statistics type" });
    fireEvent.mouseDown(
      within(statsTypes).getByRole("tab", { name: "Users" }),
      {
        button: 0,
      }
    );
    expect(await screen.findByText("Failed to load data")).toBeTruthy();
  });

  it("keeps the real server result visible when revenue fails and servers are offline", async () => {
    mockApi(request, {
      server: offlineTwo,
      ticket: { count: 0 },
      revenue: new Error("revenue down"),
      user: emptyUserStats,
    });
    renderWithClient(<Dashboard />);

    await waitFor(() => expect(overall()).toBe("Needs attention"));
    expect(
      screen
        .getByText("Servers 34/36 online · 2 offline")
        .closest("[data-status-item]")
        ?.getAttribute("data-tone")
    ).toBe("danger");
  });

  it("shows no pending/normal text when every console request fails", async () => {
    mockApi(request, {
      server: new Error("x"),
      ticket: new Error("x"),
      revenue: new Error("x"),
      user: new Error("x"),
    });
    renderWithClient(<Dashboard />);

    await waitFor(() => expect(overall()).toBe("Some status unavailable"));
    expect(screen.queryByText("All systems normal")).toBeNull();
    expect(screen.queryByText("Tickets none pending")).toBeNull();
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
    await waitFor(() => expect(overall()).toBe("All systems normal"));

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
