// @vitest-environment jsdom
// @vitest-environment-options {"url": "http://localhost:3000/chart/abc#/subscribe"}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PaymentMethods from "./payment-methods";

vi.mock("@workspace/ui/services/user/user", () => ({
  getV1PublicPortalPaymentMethod: async () => ({
    data: { data: { list: [{ id: -1, name: "Balance", icon: "" }] } },
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

afterEach(() => {
  cleanup();
});

describe("PaymentMethods", () => {
  // The storefront can be opened at a URL with extra path segments; a
  // document-relative icon URL then resolves under them and gets index.html.
  it("loads the fallback icon from the app, not relative to the page path", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PaymentMethods onChange={vi.fn()} value={-1} />
      </QueryClientProvider>
    );

    const icon = (await screen.findByAltText("Balance")) as HTMLImageElement;

    expect(new URL(icon.src).pathname).not.toMatch(/^\/chart\//);
  });
});
