import { describe, expect, it } from "vitest";
import { parseCartCode } from "./cartCode";

describe("parseCartCode", () => {
  it("reads the cart number from the cart QR URL", () => {
    expect(parseCartCode("https://sicart.vercel.app/app/connect?cart=12")).toBe(12);
    expect(parseCartCode("http://192.168.1.5:3000/app/connect?x=1&cart=7")).toBe(7);
  });

  it("accepts a typed number", () => {
    expect(parseCartCode(" 12 ")).toBe(12);
  });

  it("rejects anything else", () => {
    for (const bad of ["", "abc", "0", "-3", "1.5", "https://example.com/?cart=", "12abc"]) {
      expect(parseCartCode(bad), bad).toBeNull();
    }
  });
});
