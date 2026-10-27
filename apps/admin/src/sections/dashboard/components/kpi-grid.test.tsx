// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mockApi,
  pending,
  renderWithClient,
  serverData,
  URLS,
} from "../test-utils";
import KpiGrid from "./kpi-grid";
import SystemServiceCard from "./system-service-card";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@workspace/ui/lib/request", () => ({ default: request }));
vi.mock("react-i18next", async () =>
  (await import("../test-utils")).reactI18nextMock()
);
vi.mock("@tanstack/react-router", async () =>
  (await import("../test-utils")).routerMock()
);
vi.mock("@workspace/ui/composed/icon", () => ({ Icon: () => null }));

beforeEach(() => {
  request.mockReset();
});
afterEach(() => {
  cleanup();
});

function card(id: string) {
  const el = document.querySelector(`[data-kpi="${id}"]`);
  if (!el) throw new Error(`no card ${id}`);
  return el as HTMLElement;
}

function values() {
  return [...document.querySelectorAll("[data-kpi-value]")].map(
    (el) => el.textContent
  );
}

describe("KPI grid", () => {
  it("renders six cards in layout A order", async () => {
    mockApi(request, { server: serverData(), ticket: { count: 0 } });
    renderWithClient(<KpiGrid />);
    await waitFor(() => expect(values()[0]).toBe("0"));
    expect(
      [...document.querySelectorAll("[data-kpi]")].map((el) =>
        el.getAttribute("data-kpi")
      )
    ).toEqual([
      "online-users",
      "today-traffic",
      "month-traffic",
      "server",
      "ticket",
      "system",
    ]);
  });

  it("shows a dash, not zero, while loading", () => {
    mockApi(request, {});
    renderWithClient(<KpiGrid />);
    expect(values()).toEqual(["—", "—", "—", "—", "—"]);
  });

  it("shows a real zero as 0 and no red or yellow when all clear", async () => {
    mockApi(request, {
      server: serverData({ online_servers: 3 }),
      ticket: { count: 0 },
    });
    renderWithClient(<KpiGrid />);
    await waitFor(() => expect(card("ticket").textContent).toContain("0"));
    expect(screen.queryByText("Failed to load")).toBeNull();
    expect(card("server").getAttribute("data-tone")).toBe("muted");
    expect(card("ticket").getAttribute("data-tone")).toBe("muted");
    expect(card("server").textContent).toContain("Online 3");
  });

  it("marks offline servers with danger and pending tickets with warning", async () => {
    mockApi(request, {
      server: serverData({ online_servers: 4, offline_servers: 2 }),
      ticket: { count: 3 },
    });
    renderWithClient(<KpiGrid />);
    await waitFor(() =>
      expect(card("server").getAttribute("data-tone")).toBe("danger")
    );
    expect(card("server").textContent).toContain("6");
    expect(card("server").querySelector("[data-offline]")?.className).toContain(
      "text-ds-danger"
    );
    expect(card("ticket").getAttribute("data-tone")).toBe("warning");
    expect(card("ticket").className).toContain("border-ds-warning");
    expect(
      card("ticket").querySelector("[data-kpi-value]")?.className
    ).toContain("text-ds-warning");
  });

  it("says no servers connected instead of looking healthy", async () => {
    mockApi(request, { server: serverData(), ticket: { count: 0 } });
    renderWithClient(<KpiGrid />);
    expect(await screen.findByText("No servers connected")).toBeTruthy();
    expect(card("server").textContent).not.toContain("Online");
  });

  it("shows failure and retry on server-backed cards, and retries", async () => {
    mockApi(request, { server: new Error("down"), ticket: { count: 0 } });
    renderWithClient(<KpiGrid />);

    await waitFor(() =>
      expect(screen.getAllByText("Failed to load")).toHaveLength(4)
    );
    expect(card("server").tagName).toBe("DIV");
    expect(card("ticket").textContent).toContain("0");
    expect(values().slice(0, 4)).toEqual(["—", "—", "—", "—"]);

    const before = request.mock.calls.filter(([u]) => u === URLS.server).length;
    fireEvent.click(
      screen.getAllByRole("button", { name: "Retry" })[0] as HTMLElement
    );
    await waitFor(() =>
      expect(request.mock.calls.filter(([u]) => u === URLS.server).length).toBe(
        before + 1
      )
    );
  });

  it("never shows a ticket zero when the ticket request fails", async () => {
    mockApi(request, {
      server: serverData({ online_servers: 3 }),
      ticket: new Error("down"),
    });
    renderWithClient(<KpiGrid />);
    await waitFor(() =>
      expect(card("ticket").textContent).toContain("Failed to load")
    );
    expect(card("ticket").querySelector("[data-kpi-value]")?.textContent).toBe(
      "—"
    );
    expect(card("ticket").textContent).not.toMatch(/\d/);
    expect(card("server").textContent).toContain("Online 3");
  });

  it("uses tabular numbers and links users, servers and tickets", async () => {
    mockApi(request, {
      server: serverData({ online_users: 12 }),
      ticket: { count: 1 },
    });
    renderWithClient(<KpiGrid />);
    await waitFor(() => expect(values()[0]).toBe("12"));
    for (const el of document.querySelectorAll("[data-kpi-value]")) {
      expect(el.className).toContain("tabular-nums");
    }
    expect(card("online-users").getAttribute("href")).toBe(
      "/dashboard/servers"
    );
    expect(card("server").getAttribute("href")).toBe("/dashboard/servers");
    expect(card("ticket").getAttribute("href")).toBe("/dashboard/ticket");
  });
});

describe("system service card (moved from the B status strip)", () => {
  it("loads the backend version without module credentials or gateway calls", async () => {
    request.mockImplementation((url: string) =>
      url === URLS.version
        ? Promise.resolve({ data: { code: 200, data: { version: "1.20.2" } } })
        : pending()
    );
    renderWithClient(<SystemServiceCard />);

    expect(await screen.findByText("V1.20.2")).toBeTruthy();
    const toolCalls = request.mock.calls.filter(([url]) =>
      String(url).startsWith("/v1/admin/tool/")
    );
    expect(toolCalls).toHaveLength(1);
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
    renderWithClient(<SystemServiceCard />);

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
    renderWithClient(<SystemServiceCard />);
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
