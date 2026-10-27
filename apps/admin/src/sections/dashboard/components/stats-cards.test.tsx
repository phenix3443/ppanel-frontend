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
import {
  emptyRevenue,
  emptyUserStats,
  mockApi,
  renderWithClient,
  stubResizeObserver,
} from "../test-utils";
import RevenueCard from "./revenue-card";
import UserCard from "./user-card";

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
function selectTab(scope: HTMLElement, name: string) {
  fireEvent.mouseDown(within(scope).getByRole("tab", { name }), { button: 0 });
}

function module(name: string) {
  const el = document.querySelector(`[data-module="${name}"]`);
  if (!el) throw new Error(`no module ${name}`);
  return el as HTMLElement;
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

function renderBoth() {
  renderWithClient(
    <>
      <RevenueCard />
      <UserCard />
    </>
  );
}

describe("revenue and user cards", () => {
  it("show empty states and real zero totals for all-empty data", async () => {
    mockApi(request, { revenue: emptyRevenue, user: emptyUserStats });
    renderBoth();

    await waitFor(() =>
      expect(screen.getAllByText("No data yet")).toHaveLength(2)
    );
    for (const name of ["revenue", "user"]) {
      const card = module(name);
      expect(card.querySelectorAll("[data-summary-value]").length).toBe(3);
      for (const period of ["Month", "Total"]) {
        selectTab(card, period);
        expect(within(card).getByText("No data yet")).toBeTruthy();
      }
    }
    expect(document.body.textContent).not.toContain("NaN");
  });

  it("keeps the revenue card when only user statistics fail", async () => {
    mockApi(request, { revenue: emptyRevenue, user: new Error("x") });
    renderBoth();

    await waitFor(() =>
      expect(
        within(module("user")).getByText("Failed to load data")
      ).toBeTruthy()
    );
    expect(within(module("revenue")).getByText("No data yet")).toBeTruthy();
    const before = request.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(request.mock.calls.length).toBeGreaterThan(before)
    );
  });

  it("gives each tab group its own name and exposes the selected tab", async () => {
    mockApi(request, { revenue: emptyRevenue, user: emptyUserStats });
    renderBoth();

    await waitFor(() =>
      expect(screen.getAllByText("No data yet")).toHaveLength(2)
    );
    expect(
      screen.getByRole("tablist", { name: "Revenue Statistics range" })
    ).toBeTruthy();
    expect(
      screen.getByRole("tablist", { name: "User Statistics range" })
    ).toBeTruthy();
    for (const tab of screen.getAllByRole("tab", { name: "Today" })) {
      expect(tab.getAttribute("aria-selected")).toBe("true");
    }
  });

  it("adds a screen-reader table with one row per data point", async () => {
    mockApi(request, { revenue: revenueWithMonth, user: emptyUserStats });
    renderBoth();

    await waitFor(() =>
      expect(screen.getAllByText("No data yet")).toHaveLength(2)
    );
    selectTab(module("revenue"), "Month");
    const table = await waitFor(() => {
      const el = module("revenue").querySelector("[data-chart-table]");
      if (!el) throw new Error("no table");
      return el;
    });
    expect(table.parentElement?.className).toContain("sr-only");
    expect(table.querySelectorAll("tbody tr")).toHaveLength(2);
    for (const el of document.querySelectorAll("[data-summary-value]")) {
      expect(el.className).toContain("tabular-nums");
    }
  });
});
