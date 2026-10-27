// @vitest-environment jsdom

import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  emptyRevenue,
  mockApi,
  renderWithClient,
  serverData,
} from "../test-utils";
import MetricBand from "./metric-band";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@workspace/ui/lib/request", () => ({ default: request }));
vi.mock("react-i18next", async () =>
  (await import("../test-utils")).reactI18nextMock()
);
vi.mock("@tanstack/react-router", async () =>
  (await import("../test-utils")).routerMock()
);

beforeEach(() => {
  request.mockReset();
});
afterEach(() => {
  cleanup();
});

function values() {
  return [...document.querySelectorAll("[data-metric-value]")].map(
    (el) => el.textContent
  );
}

describe("metric band", () => {
  it("shows a dash, not zero, while loading", () => {
    mockApi(request, {});
    renderWithClient(<MetricBand />);
    expect(values()).toEqual(["—", "—", "—", "—"]);
  });

  it("shows a dash and a failure note when requests fail", async () => {
    mockApi(request, { server: new Error("x"), revenue: new Error("x") });
    renderWithClient(<MetricBand />);
    await waitFor(() =>
      expect(screen.getAllByText("Failed to load")).toHaveLength(4)
    );
    expect(values()).toEqual(["—", "—", "—", "—"]);
    expect(values()).not.toContain("0");
  });

  it("shows a real zero as 0", async () => {
    mockApi(request, { server: serverData(), revenue: emptyRevenue });
    renderWithClient(<MetricBand />);
    await waitFor(() => expect(values()[0]).toBe("0"));
    expect(screen.queryByText("Failed to load")).toBeNull();
  });

  it("uses tabular numbers and links online users to servers", async () => {
    mockApi(request, {
      server: serverData({ online_users: 12 }),
      revenue: emptyRevenue,
    });
    renderWithClient(<MetricBand />);
    await waitFor(() => expect(values()[0]).toBe("12"));
    for (const el of document.querySelectorAll("[data-metric-value]")) {
      expect(el.className).toContain("tabular-nums");
    }
    expect(screen.getByText("12").closest("a")?.getAttribute("href")).toBe(
      "/dashboard/servers"
    );
  });
});
