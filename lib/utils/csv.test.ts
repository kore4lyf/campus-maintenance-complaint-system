import { toCsvRow, toCsv, formatDateForFilename } from "./csv";

describe("toCsvRow", () => {
  test("joins simple values with commas", () => {
    expect(toCsvRow(["a", "b", "c"])).toBe("a,b,c");
  });

  test("handles numbers", () => {
    expect(toCsvRow([1, 2, 3])).toBe("1,2,3");
  });

  test("handles null and undefined as empty", () => {
    expect(toCsvRow(["a", null, undefined, "d"])).toBe("a,,,d");
  });

  test("wraps values containing commas in quotes", () => {
    expect(toCsvRow(["hello, world"])).toBe('"hello, world"');
  });

  test("escapes double quotes by doubling them", () => {
    expect(toCsvRow(['say "hello"'])).toBe('"say ""hello"""');
  });

  test("wraps values containing newlines in quotes", () => {
    expect(toCsvRow(["line1\nline2"])).toBe('"line1\nline2"');
  });

  test("handles empty array", () => {
    expect(toCsvRow([])).toBe("");
  });

  test("handles single value", () => {
    expect(toCsvRow(["only"])).toBe("only");
  });
});

describe("toCsv", () => {
  const columns = [
    { key: "name", header: "Name" },
    { key: "count", header: "Count" },
  ];

  test("produces header row and data rows", () => {
    const rows = [
      { name: "Alice", count: 5 },
      { name: "Bob", count: 3 },
    ];
    expect(toCsv(rows, columns)).toBe("Name,Count\nAlice,5\nBob,3");
  });

  test("handles empty rows", () => {
    expect(toCsv([], columns)).toBe("Name,Count");
  });

  test("handles missing keys as empty", () => {
    const rows = [{ name: "Alice" }];
    expect(toCsv(rows, columns)).toBe("Name,Count\nAlice,");
  });

  test("handles values with commas", () => {
    const rows = [{ name: "Alice, Bob", count: 1 }];
    expect(toCsv(rows, columns)).toBe('Name,Count\n"Alice, Bob",1');
  });
});

describe("formatDateForFilename", () => {
  test("formats date to ISO-like string with dashes", () => {
    const date = new Date("2026-07-26T14:30:45.123Z");
    const result = formatDateForFilename(date);
    expect(result).toBe("2026-07-26T14-30-45");
  });

  test("truncates to 19 characters", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    const result = formatDateForFilename(date);
    expect(result.length).toBe(19);
  });
});
