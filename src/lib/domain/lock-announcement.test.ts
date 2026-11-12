import { describe, expect, it } from "vitest";

import { lockAnnouncement } from "@/lib/domain/lock-announcement";

describe("lock announcement", () => {
  it("announces only when a day changes to locked", () => {
    expect(lockAnnouncement("open", "locked", "Thursday")).toBe("Thursday is locked.");
    expect(lockAnnouncement("imminent", "locked", "Thursday")).toBe("Thursday is locked.");
  });

  it("stays quiet for a countdown tick, an already locked day, and the first paint", () => {
    expect(lockAnnouncement("locked", "locked", "Thursday")).toBeNull();
    expect(lockAnnouncement("open", "imminent", "Thursday")).toBeNull();
    expect(lockAnnouncement("imminent", "open", "Thursday")).toBeNull();
    expect(lockAnnouncement(null, "locked", "Thursday")).toBeNull();
  });
});
