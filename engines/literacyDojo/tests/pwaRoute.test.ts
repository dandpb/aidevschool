import { describe, expect, it } from "vitest";
import { serviceWorkerUrl } from "../src/pwa";

describe("serviceWorkerUrl", () => {
  it("keeps the standalone worker at the origin root", () => {
    expect(serviceWorkerUrl("/")).toBe("/sw.js");
  });

  it("scopes an embedded build to its engine route", () => {
    expect(serviceWorkerUrl("/apps/literacydojo/")).toBe("/apps/literacydojo/sw.js");
  });
});
