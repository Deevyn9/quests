import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

function pngSize(file: string) {
  const buf = readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("web app manifest", () => {
  const m = manifest();

  it("is installable: standalone, with a start URL and names", () => {
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.name).toBe("Quests");
  });

  it("points at icon files that exist and match their declared size", () => {
    for (const icon of m.icons ?? []) {
      const file = join(process.cwd(), "public", icon.src);
      expect(existsSync(file), icon.src).toBe(true);
      const [w, h] = (icon.sizes ?? "").split("x").map(Number);
      expect(pngSize(file)).toEqual({ width: w, height: h });
    }
  });

  it("includes a 512px icon and a maskable icon", () => {
    expect(m.icons?.some((i) => i.sizes === "512x512" && i.purpose === "any")).toBe(true);
    expect(m.icons?.some((i) => i.purpose === "maskable")).toBe(true);
  });
});