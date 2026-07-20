import { normalizeTask, normalizeTasks } from "../normalize";

describe("normalizeTask", () => {
  it("normalizes a well-formed task", () => {
    const result = normalizeTask({
      id: "t1",
      title: "Label the cat photos",
      type: "image",
      status: "in_progress",
      assignee: { id: "u1", name: "Asha" },
      annotationCount: 5,
      updatedAt: 1719600000000,
      meta: {},
    });

    expect(result).toMatchObject({
      id: "t1",
      title: "Label the cat photos",
      type: "image",
      status: "in_progress",
      assignee: { id: "u1", name: "Asha" },
      annotationCount: 5,
      updatedAt: 1719600000000,
    });
    expect(result?.issues).toEqual([]);
  });

  it("maps inconsistent status casing/spelling onto the canonical enum", () => {
    expect(normalizeTask({ id: "t1", status: "InProgress" })?.status).toBe("in_progress");
    expect(normalizeTask({ id: "t2", status: "QA" })?.status).toBe("qa");
    expect(normalizeTask({ id: "t3", status: "BLOCKED" })?.status).toBe("blocked");
    expect(normalizeTask({ id: "t4", status: "todo" })?.status).toBe("todo");
  });

  it("falls back to 'unknown' status/type without crashing or dropping the row", () => {
    const result = normalizeTask({ id: "t5", type: "video", status: "in-review" });
    expect(result).not.toBeNull();
    expect(result?.type).toBe("unknown");
    if (result?.type === "unknown") {
      expect(result.rawType).toBe("video");
    }
    expect(result?.status).toBe("unknown");
    expect(result?.issues.length).toBeGreaterThan(0);
  });

  it("accepts both epoch-ms and ISO timestamps", () => {
    const fromEpoch = normalizeTask({ id: "t6", updatedAt: 1719600000000 });
    const fromIso = normalizeTask({ id: "t7", updatedAt: "2024-06-28T16:00:00.000Z" });
    expect(fromEpoch?.updatedAt).toBe(1719600000000);
    expect(fromIso?.updatedAt).toBe(Date.parse("2024-06-28T16:00:00.000Z"));
  });

  it("coerces a numeric-string annotationCount to a number", () => {
    expect(normalizeTask({ id: "t8", annotationCount: "42" })?.annotationCount).toBe(42);
    expect(normalizeTask({ id: "t9", annotationCount: 42 })?.annotationCount).toBe(42);
  });

  it("treats a null assignee as unassigned, and a malformed one too", () => {
    expect(normalizeTask({ id: "t10", assignee: null })?.assignee).toBeNull();
    const malformed = normalizeTask({ id: "t11", assignee: { id: "u1" } });
    expect(malformed?.assignee).toBeNull();
    expect(malformed?.issues.some((i) => i.includes("assignee"))).toBe(true);
  });

  it("returns null only when there is no usable id", () => {
    expect(normalizeTask({ title: "no id here" })).toBeNull();
    expect(normalizeTask(null)).toBeNull();
    expect(normalizeTask("not an object")).toBeNull();
  });

  it("never throws on garbage input", () => {
    expect(() => normalizeTask(undefined)).not.toThrow();
    expect(() => normalizeTask(42)).not.toThrow();
    expect(() => normalizeTask({ id: "t12", meta: "not-an-object", annotationCount: {} })).not.toThrow();
  });
});

describe("normalizeTasks", () => {
  it("drops only the records with no id, keeping everything else", () => {
    const result = normalizeTasks([{ id: "a" }, { title: "missing id" }, { id: "b" }]);
    expect(result.map((t) => t.id)).toEqual(["a", "b"]);
  });
});
