import { describe, expect, it } from "vitest";
import { serverTone, ticketTone } from "./health";

const ready = <T>(data: T) => ({ status: "ready" as const, data });

describe("serverTone", () => {
  it("is danger only when a ready result has offline servers", () => {
    expect(serverTone(ready({ online_servers: 4, offline_servers: 2 }))).toBe(
      "danger"
    );
    expect(serverTone(ready({ online_servers: 4, offline_servers: 0 }))).toBe(
      "muted"
    );
    expect(serverTone(ready({ online_servers: 0, offline_servers: 0 }))).toBe(
      "muted"
    );
  });

  it("stays muted while loading or after a failure", () => {
    expect(serverTone({ status: "loading" })).toBe("muted");
    expect(serverTone({ status: "error" })).toBe("muted");
  });
});

describe("ticketTone", () => {
  it("is warning only when a ready count is above zero", () => {
    expect(ticketTone(ready(3))).toBe("warning");
    expect(ticketTone(ready(0))).toBe("muted");
  });

  it("stays muted while loading or after a failure", () => {
    expect(ticketTone({ status: "loading" })).toBe("muted");
    expect(ticketTone({ status: "error" })).toBe("muted");
  });
});
