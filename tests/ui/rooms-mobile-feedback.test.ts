import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("rooms and hostel UX requirements", () => {
  it("uses shared toast/snackbar hook instead of top-only success banners", () => {
    const rooms = read("app/(dashboard)/rooms/rooms-dashboard-client.tsx");
    const hostel = read("app/(dashboard)/hostel/hostel-config-client.tsx");

    expect(rooms).toContain('from "@/lib/toast-context"');
    expect(rooms).toContain("showToast(");
    expect(hostel).toContain('from "@/lib/toast-context"');
    expect(hostel).toContain("showToast(");
  });

  it("expands room details inline for all breakpoints without forced scrolling", () => {
    const rooms = read("app/(dashboard)/rooms/rooms-dashboard-client.tsx");

    expect(rooms).toContain("selectedRoomId === room.id");
    expect(rooms).not.toContain("scrollIntoView");
    expect(rooms).not.toContain("lg:sticky");
    expect(rooms).toContain("AnimatePresence");
    expect(rooms).toContain("motion.div");
    expect(rooms).toContain("w-full text-left border-0 bg-transparent p-0 shadow-none");
  });

  it("filters transfer targets to allocatable beds", () => {
    const rooms = read("app/(dashboard)/rooms/rooms-dashboard-client.tsx");
    const roomLib = read("lib/rooms.ts");

    expect(rooms).toContain("target.status === \"AVAILABLE\"");
    expect(roomLib).toContain("bed.status === \"AVAILABLE\"");
  });
});
