import { describe, expect, it } from "vitest";
import { toModuleState } from "./module-state";

describe("toModuleState", () => {
  it("is loading while the first request is pending", () => {
    expect(
      toModuleState({ data: undefined, isError: false, isPending: true })
    ).toEqual({ status: "loading" });
  });

  it("is error after the request fails, even with cached data", () => {
    expect(toModuleState({ data: 5, isError: true, isPending: false })).toEqual(
      { status: "error" }
    );
    expect(
      toModuleState({ data: undefined, isError: true, isPending: false })
    ).toEqual({ status: "error" });
  });

  it("keeps a real zero as ready data", () => {
    expect(
      toModuleState({ data: 0, isError: false, isPending: false })
    ).toEqual({ status: "ready", data: 0 });
  });
});
