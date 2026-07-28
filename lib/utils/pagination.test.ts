import { paginateCursor } from "./pagination";

function createMockModel(docs: Record<string, unknown>[]) {
  const chainable = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(docs),
  };
  return {
    find: jest.fn().mockReturnValue(chainable),
  };
}

describe("paginateCursor", () => {
  test("returns data and meta with hasMore false when fewer docs than pageSize", async () => {
    const docs = [{ _id: "1" }, { _id: "2" }];
    const model = createMockModel(docs);
    const result = await paginateCursor({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: model as any,
      query: {},
      pageSize: 20,
    });
    expect(result.data).toEqual(docs);
    expect(result.meta.hasMore).toBe(false);
    expect(result.meta.nextCursor).toBeNull();
  });

  test("returns hasMore true and nextCursor when docs exceed pageSize", async () => {
    const docs = Array.from({ length: 21 }, (_, i) => ({ _id: String(i) }));
    const model = createMockModel(docs);
    const result = await paginateCursor({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: model as any,
      query: {},
      pageSize: 20,
    });
    expect(result.data).toHaveLength(20);
    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.nextCursor).toBe("19");
  });

  test("applies cursor filter when valid ObjectId provided", async () => {
    const docs = [{ _id: "abc123def456abc123def4" }];
    const model = createMockModel(docs);
    await paginateCursor({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: model as any,
      query: {},
      cursor: "abc123def456abc123def456",
    });
    expect(model.find).toHaveBeenCalledWith({ _id: { $lt: "abc123def456abc123def456" } });
  });

  test("ignores invalid cursor", async () => {
    const docs = [{ _id: "1" }];
    const model = createMockModel(docs);
    await paginateCursor({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: model as any,
      query: {},
      cursor: "invalid",
    });
    expect(model.find).toHaveBeenCalledWith({});
  });

  test("clamps pageSize to minimum 1", async () => {
    const docs = [{ _id: "1" }];
    const model = createMockModel(docs);
    const result = await paginateCursor({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: model as any,
      query: {},
      pageSize: 0,
    });
    expect(result.data).toEqual(docs);
  });

  test("clamps pageSize to maximum 100", async () => {
    const docs = [{ _id: "1" }];
    const model = createMockModel(docs);
    const result = await paginateCursor({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: model as any,
      query: {},
      pageSize: 200,
    });
    expect(result.data).toEqual(docs);
  });

  test("defaults pageSize to 20", async () => {
    const docs = [{ _id: "1" }];
    const model = createMockModel(docs);
    const result = await paginateCursor({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      model: model as any,
      query: {},
    });
    expect(result.data).toEqual(docs);
  });
});
