import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("dashboard form consistency", () => {
  it("hostel and rooms pages use shared input/select primitives", () => {
    const hostel = read("app/(dashboard)/hostel/hostel-config-client.tsx");
    const rooms = read("app/(dashboard)/rooms/rooms-dashboard-client.tsx");

    expect(hostel).toContain('from "@/components/ui/input"');
    expect(hostel).toContain('from "@/components/ui/select"');
    expect(rooms).toContain('from "@/components/ui/input"');
    expect(rooms).toContain('from "@/components/ui/select"');
  });

  it("rooms action controls use glass button variants", () => {
    const rooms = read("app/(dashboard)/rooms/rooms-dashboard-client.tsx");
    expect(rooms).toContain('from "@/components/ui/button"');
    expect(rooms).toContain('variant="secondary"');
    expect(rooms).toContain('variant="danger"');
  });
});
