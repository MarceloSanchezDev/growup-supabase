import { describe, expect, it } from "vitest";
import { ars } from "./money";

describe("ars", () => {
  it("formats Argentine pesos and handles missing values", () => {
    expect(ars(125000)).toMatch(/125\.000|125,000/);
    expect(ars()).toMatch(/0/);
  });
});
