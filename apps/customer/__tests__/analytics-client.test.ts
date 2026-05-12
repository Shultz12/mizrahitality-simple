import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiOk } from "@mizrahitality/contracts";
import { postEvent, postEventOnce, __resetAnalyticsGuard } from "@/lib/analytics-client";

const BASE = "http://localhost:5113";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  __resetAnalyticsGuard();
  fetchMock = vi.fn(async () => new Response(JSON.stringify(apiOk({ recorded: true }))));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("postEventOnce", () => {
  it("fires once per slug|type and de-duplicates a repeat", () => {
    expect(postEventOnce(BASE, { slug: "a", type: "visit" })).toBe(true);
    expect(postEventOnce(BASE, { slug: "a", type: "visit" })).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fires again for a different slug or a different type", () => {
    expect(postEventOnce(BASE, { slug: "a", type: "visit" })).toBe(true);
    expect(postEventOnce(BASE, { slug: "b", type: "visit" })).toBe(true);
    expect(postEventOnce(BASE, { slug: "a", type: "book-now-hover" })).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("postEvent", () => {
  it("swallows a rejected fetch (never throws)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await expect(postEvent(BASE, { slug: "a", type: "visit" })).resolves.toBeUndefined();
  });

  it("POSTs JSON to ${base}/api/events with the event as the body", async () => {
    await postEvent(BASE, { slug: "cafe", type: "book-now-click" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:5113/api/events");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({ slug: "cafe", type: "book-now-click" });
  });
});
