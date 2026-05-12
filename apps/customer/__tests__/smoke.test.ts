import { describe, it, expect } from "vitest";
import { BUILDER_API_URL, apiClient } from "@/lib/env";
import { VISITOR_TYPES } from "@mizrahitality/contracts";

describe("customer foundation smoke", () => {
  it("falls back to the default Builder API URL when BUILDER_API_URL is unset", () => {
    // Vitest doesn't set BUILDER_API_URL, so this exercises the default branch.
    expect(BUILDER_API_URL).toBe("http://localhost:5111");
  });

  it("exposes a configured API client", () => {
    expect(typeof apiClient.get).toBe("function");
    expect(typeof apiClient.post).toBe("function");
  });

  it("can import the shared contracts package", () => {
    expect(VISITOR_TYPES).toHaveLength(7);
  });
});
