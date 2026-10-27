// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  emptyRevenue,
  emptyUserStats,
  mockApi,
  pending,
  renderWithClient,
  serverData,
  URLS,
} from "../test-utils";
import HealthStrip from "./health-strip";
import HomeHeader from "./home-header";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@workspace/ui/lib/request", () => ({ default: request }));
vi.mock("react-i18next", async () =>
  (await import("../test-utils")).reactI18nextMock()
);
vi.mock("@tanstack/react-router", async () =>
  (await import("../test-utils")).routerMock()
);
vi.mock("@workspace/ui/composed/icon", () => ({ Icon: () => null }));

let client: QueryClient;

beforeEach(() => {
  request.mockReset();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  cleanup();
  client.clear();
});

function renderCard() {
  render(
    <QueryClientProvider client={client}>
      <HealthStrip />
    </QueryClientProvider>
  );
}

const healthy = {
  server: serverData({ online_servers: 3 }),
  ticket: { count: 0 },
  revenue: emptyRevenue,
  user: emptyUserStats,
};

function renderStatus() {
  return renderWithClient(
    <>
      <HomeHeader />
      <HealthStrip />
    </>
  );
}

describe("system version and restart (moved from system-version-card)", () => {
  it("loads the backend version without module credentials or gateway calls", async () => {
    request.mockImplementation((url: string) =>
      url === URLS.version
        ? Promise.resolve({ data: { code: 200, data: { version: "1.20.2" } } })
        : pending()
    );
    renderCard();

    expect(await screen.findByText("V1.20.2")).toBeTruthy();
    const versionCalls = request.mock.calls.filter(([url]) =>
      String(url).startsWith("/v1/admin/tool/")
    );
    expect(versionCalls).toHaveLength(1);
    expect(request).toHaveBeenCalledWith(
      "/v1/admin/tool/version",
      expect.objectContaining({ method: "GET" })
    );
    expect(screen.getByRole("button", { name: "System Reboot" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /update/i })).toBeNull();
  });

  it("does not display an invented server version when the response has no version", async () => {
    request.mockImplementation((url: string) =>
      url === URLS.version
        ? Promise.resolve({ data: { code: 200, data: {} } })
        : pending()
    );
    renderCard();

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith(
        URLS.version,
        expect.objectContaining({ method: "GET" })
      )
    );
    await waitFor(() =>
      expect(
        screen.getByText("Server Version").parentElement?.textContent
      ).toContain("—")
    );
    expect(screen.queryByText("V1.0.0")).toBeNull();
  });

  it("keeps restart available for retry after the backend rejects the request", async () => {
    request.mockImplementation((url: string) => {
      if (url === URLS.version) {
        return Promise.resolve({
          data: { code: 200, data: { version: "1.20.2" } },
        });
      }
      if (url === URLS.restart)
        return Promise.reject(new Error("restart failed"));
      return pending();
    });
    renderCard();
    await screen.findByText("V1.20.2");

    fireEvent.click(screen.getByRole("button", { name: "System Reboot" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Reboot" }));

    await waitFor(() => {
      const confirm = screen.getByRole("button", {
        name: "Confirm Reboot",
      }) as HTMLButtonElement;
      expect(confirm.disabled).toBe(false);
    });
    expect(request).toHaveBeenLastCalledWith(
      "/v1/admin/tool/restart",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("running status", () => {
  it("shows no warning or danger tone on status items when all clear", async () => {
    mockApi(request, healthy);
    renderStatus();

    expect(await screen.findByText("All systems normal")).toBeTruthy();
    expect(screen.getByText("Tickets none pending")).toBeTruthy();
    for (const item of document.querySelectorAll("[data-status-item]")) {
      expect(item.getAttribute("data-tone")).not.toBe("danger");
      expect(item.getAttribute("data-tone")).not.toBe("warning");
    }
  });

  it("marks pending tickets with the warning tone", async () => {
    mockApi(request, { ...healthy, ticket: { count: 3 } });
    renderStatus();

    const badge = await screen.findByText("Tickets 3 pending");
    expect(badge.closest("[data-status-item]")?.getAttribute("data-tone")).toBe(
      "warning"
    );
    expect(screen.getByText("Needs attention")).toBeTruthy();
  });

  it("marks offline servers with the danger tone", async () => {
    mockApi(request, {
      ...healthy,
      server: serverData({ online_servers: 34, offline_servers: 2 }),
    });
    renderStatus();

    const badge = await screen.findByText("Servers 34/36 online · 2 offline");
    expect(badge.closest("[data-status-item]")?.getAttribute("data-tone")).toBe(
      "danger"
    );
  });

  it("does not claim health when the server request fails, and retries", async () => {
    mockApi(request, { ...healthy, server: new Error("down") });
    renderStatus();

    expect(await screen.findByText("Server status unavailable")).toBeTruthy();
    expect(screen.queryByText("All systems normal")).toBeNull();
    expect(screen.getByText("Some status unavailable")).toBeTruthy();

    const before = request.mock.calls.filter(([u]) => u === URLS.server).length;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(request.mock.calls.filter(([u]) => u === URLS.server).length).toBe(
        before + 1
      )
    );
  });

  it("never says no tickets pending when the ticket request fails", async () => {
    mockApi(request, { ...healthy, ticket: new Error("down") });
    renderStatus();

    expect(await screen.findByText("Ticket count unavailable")).toBeTruthy();
    expect(screen.queryByText("Tickets none pending")).toBeNull();
    expect(screen.queryByText("All systems normal")).toBeNull();
  });

  it("links to servers and tickets", async () => {
    mockApi(request, healthy);
    renderStatus();

    await screen.findByText("All systems normal");
    const hrefs = [...document.querySelectorAll("a")].map((a) =>
      a.getAttribute("href")
    );
    expect(hrefs).toContain("/dashboard/servers");
    expect(hrefs).toContain("/dashboard/ticket");
  });

  it("exposes the overall badge as a live status", async () => {
    mockApi(request, healthy);
    renderStatus();

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "All systems normal"
      )
    );
    expect(screen.getByRole("region", { name: "Running status" })).toBeTruthy();
  });
});
