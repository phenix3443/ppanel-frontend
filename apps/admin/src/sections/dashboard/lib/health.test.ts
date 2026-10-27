import { describe, expect, it } from "vitest";
import {
  deriveHealth,
  type Health,
  healthHasAlertIcon,
  healthTone,
  type ServerStatus,
} from "./health";
import type { ModuleState } from "./module-state";

const loading = { status: "loading" } as const;
const error = { status: "error" } as const;
const ready = <T>(data: T) => ({ status: "ready", data }) as const;

const healthy = ready<ServerStatus>({ online_servers: 3, offline_servers: 0 });
const stats = ready({});

type Case = [
  string,
  ModuleState<ServerStatus>,
  ModuleState<number>,
  ModuleState<unknown>,
  ModuleState<unknown>,
  Health,
];

const cases: Case[] = [
  ["server error", error, ready(0), stats, stats, "unknown"],
  ["ticket error", healthy, error, stats, stats, "unknown"],
  [
    "ticket error wins over offline",
    ready({ online_servers: 1, offline_servers: 2 }),
    error,
    stats,
    stats,
    "unknown",
  ],
  ["server loading", loading, ready(0), stats, stats, "checking"],
  ["ticket loading", healthy, loading, stats, stats, "checking"],
  [
    "offline servers",
    ready({ online_servers: 1, offline_servers: 2 }),
    ready(0),
    stats,
    stats,
    "attention",
  ],
  ["pending tickets", healthy, ready(3), stats, stats, "attention"],
  [
    "revenue error with offline",
    ready({ online_servers: 1, offline_servers: 2 }),
    ready(0),
    error,
    stats,
    "attention",
  ],
  ["revenue error only", healthy, ready(0), error, stats, "partial"],
  ["user error only", healthy, ready(0), stats, error, "partial"],
  ["revenue loading", healthy, ready(0), loading, stats, "checking"],
  ["user loading", healthy, ready(0), stats, loading, "checking"],
  [
    "no servers",
    ready({ online_servers: 0, offline_servers: 0 }),
    ready(0),
    stats,
    stats,
    "no-servers",
  ],
  ["all ready and clear", healthy, ready(0), stats, stats, "ok"],
];

describe("deriveHealth", () => {
  it.each(cases)("%s", (_name, server, ticket, revenue, user, expected) => {
    expect(deriveHealth(server, ticket, revenue, user)).toBe(expected);
  });

  it("never reports ok when any module is not ready", () => {
    const states = [loading, error] as const;
    for (const bad of states) {
      expect(deriveHealth(bad, ready(0), stats, stats)).not.toBe("ok");
      expect(deriveHealth(healthy, bad, stats, stats)).not.toBe("ok");
      expect(deriveHealth(healthy, ready(0), bad, stats)).not.toBe("ok");
      expect(deriveHealth(healthy, ready(0), stats, bad)).not.toBe("ok");
    }
  });
});

describe("health presentation", () => {
  it("uses success only for ok and warning only for attention", () => {
    expect(healthTone("ok")).toBe("success");
    expect(healthTone("attention")).toBe("warning");
    for (const h of ["unknown", "checking", "partial", "no-servers"] as const) {
      expect(healthTone(h)).toBe("muted");
    }
  });

  it("flags failures with an alert icon", () => {
    expect(healthHasAlertIcon("unknown")).toBe(true);
    expect(healthHasAlertIcon("partial")).toBe(true);
    expect(healthHasAlertIcon("ok")).toBe(false);
  });
});
