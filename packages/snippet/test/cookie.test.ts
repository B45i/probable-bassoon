import { beforeEach, describe, expect, it } from "vitest";
import { getVisitorId } from "../src/cookie";

function clearCookies(): void {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name) {
      document.cookie = `${name}=; Max-Age=0; Path=/`;
    }
  }
}

describe("getVisitorId", () => {
  beforeEach(() => {
    clearCookies();
  });

  it("generates a new id when no cookie exists", () => {
    const id = getVisitorId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("returns the same id on a later call, from the cookie it wrote", () => {
    const first = getVisitorId();
    const second = getVisitorId();
    expect(second).toBe(first);
  });

  it("writes a cookie that a fresh read can see", () => {
    const id = getVisitorId();
    expect(document.cookie).toContain(`_abtester_vid=${id}`);
  });
});
