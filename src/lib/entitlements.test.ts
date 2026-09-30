// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getEntitlements, unlimited } from "./entitlements";

describe("getEntitlements", () => {
  it("grants unlimited access", async () => {
    await expect(getEntitlements("user-1")).resolves.toEqual(unlimited);
  });
});
