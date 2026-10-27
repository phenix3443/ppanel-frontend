// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  emptyRevenue,
  emptyUserStats,
  mockApi,
  renderWithClient,
  stubResizeObserver,
} from "../test-utils";
import StatisticsCard from "./statistics-card";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@workspace/ui/lib/request", () => ({ default: request }));
vi.mock("react-i18next", async () =>
  (await import("../test-utils")).reactI18nextMock()
);

beforeAll(stubResizeObserver);
beforeEach(() => {
  request.mockReset();
});
afterEach(() => {
  cleanup();
});

// Radix Tabs activate on mousedown in jsdom.
function selectTab(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
}

const revenueWithMonth: API.RevenueStatisticsResponse = {
  ...emptyRevenue,
  monthly: {
    ...emptyRevenue.monthly,
    list: [
      {
        amount_total: 300,
        date: "2026-10-01",
        list: [],
        new_order_amount: 200,
        renewal_order_amount: 100,
      },
      {
        amount_total: 500,
        date: "2026-10-02",
        list: [],
        new_order_amount: 500,
        renewal_order_amount: 0,
      },
    ],
  },
};

describe("statistics card", () => {
  it("shows the empty state and real zero totals for all-empty data", async () => {
    mockApi(request, { revenue: emptyRevenue, user: emptyUserStats });
    renderWithClient(<StatisticsCard />);

    expect(await screen.findByText("No data yet")).toBeTruthy();
    expect(document.querySelectorAll("[data-summary-value]").length).toBe(3);
    for (const period of ["Month", "Total"]) {
      selectTab(period);
      expect(screen.getByText("No data yet")).toBeTruthy();
    }
    selectTab("Users");
    for (const period of ["Today", "Month", "Total"]) {
      selectTab(period);
      expect(screen.getByText("No data yet")).toBeTruthy();
    }
    expect(document.body.textContent).not.toContain("NaN");
  });

  it("shows a retryable failure for the selected statistics only", async () => {
    mockApi(request, { revenue: emptyRevenue, user: new Error("x") });
    renderWithClient(<StatisticsCard />);

    expect(await screen.findByText("No data yet")).toBeTruthy();
    selectTab("Users");
    expect(await screen.findByText("Failed to load data")).toBeTruthy();
    const before = request.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(request.mock.calls.length).toBeGreaterThan(before)
    );
  });

  it("labels tab groups and exposes the selected tab", async () => {
    mockApi(request, { revenue: emptyRevenue, user: emptyUserStats });
    renderWithClient(<StatisticsCard />);

    await screen.findByText("No data yet");
    expect(
      screen.getByRole("tablist", { name: "Statistics type" })
    ).toBeTruthy();
    expect(screen.getByRole("tablist", { name: "Time range" })).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Today" }).getAttribute("aria-selected")
    ).toBe("true");
  });

  it("adds a screen-reader table with one row per data point", async () => {
    mockApi(request, { revenue: revenueWithMonth, user: emptyUserStats });
    renderWithClient(<StatisticsCard />);

    await screen.findByText("No data yet");
    selectTab("Month");
    const table = await waitFor(() => {
      const el = document.querySelector("[data-chart-table]");
      if (!el) throw new Error("no table");
      return el;
    });
    expect(table.className).toContain("sr-only");
    expect(table.querySelectorAll("tbody tr")).toHaveLength(2);
    for (const el of document.querySelectorAll("[data-summary-value]")) {
      expect(el.className).toContain("tabular-nums");
    }
  });
});
