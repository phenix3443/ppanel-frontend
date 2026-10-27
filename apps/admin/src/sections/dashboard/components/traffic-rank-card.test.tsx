// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockApi, renderWithClient, serverData } from "../test-utils";
import TrafficRankCard, { barPercent } from "./traffic-rank-card";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("@workspace/ui/lib/request", () => ({ default: request }));
vi.mock("react-i18next", async () =>
  (await import("../test-utils")).reactI18nextMock()
);
vi.mock("@/sections/user/user-detail", () => ({
  UserDetail: ({ id }: { id: number }) => <div>user {id}</div>,
  UserSubscribeDetail: ({ id }: { id: number }) => <div>subscribe {id}</div>,
}));

beforeEach(() => {
  request.mockReset();
});
afterEach(() => {
  cleanup();
});

function selectTab(name: string) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
}

const LONG_NAME = "node-".padEnd(60, "x");

describe("traffic rank card", () => {
  it("shows the empty state, not NaN, when rankings are empty", async () => {
    mockApi(request, { server: serverData() });
    renderWithClient(<TrafficRankCard target="nodes" />);

    expect(await screen.findByText("No data yet")).toBeTruthy();
    selectTab("Yesterday");
    expect(screen.getByText("No data yet")).toBeTruthy();
    expect(document.body.textContent).not.toContain("NaN");
  });

  it("keeps long names complete in the title and tabular traffic values", async () => {
    mockApi(request, {
      server: serverData({
        server_traffic_ranking_today: [
          { download: 2048, name: LONG_NAME, server_id: 1, upload: 0 },
          { download: 0, name: "small", server_id: 2, upload: 0 },
        ],
      }),
    });
    renderWithClient(<TrafficRankCard target="nodes" />);

    const name = await screen.findByText(LONG_NAME);
    expect(name.getAttribute("title")).toBe(LONG_NAME);
    expect(document.querySelectorAll("li")).toHaveLength(2);
    for (const el of document.querySelectorAll("[data-rank-value]")) {
      expect(el.className).toContain("tabular-nums");
    }
    expect(document.body.textContent).not.toContain("NaN");
  });

  it("opens user details from the keyboard-reachable row button", async () => {
    mockApi(request, {
      server: serverData({
        user_traffic_ranking_today: [
          { download: 10, sid: 42, uid: 7, upload: 5 },
        ],
      }),
    });
    renderWithClient(<TrafficRankCard target="users" />);

    const trigger = await screen.findByRole("button", {
      name: "Subscription 42 details",
    });
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getByText("user 7")).toBeTruthy());
    expect(screen.getByText("subscribe 42")).toBeTruthy();
  });

  it("shows a retryable error", async () => {
    mockApi(request, { server: new Error("x") });
    renderWithClient(<TrafficRankCard target="nodes" />);
    expect(await screen.findByText("Failed to load data")).toBeTruthy();
  });
});

describe("barPercent", () => {
  it("never divides by zero", () => {
    expect(barPercent(0, 0)).toBe(0);
    expect(barPercent(5, 10)).toBe(50);
    expect(barPercent(10, 10)).toBe(100);
  });
});
