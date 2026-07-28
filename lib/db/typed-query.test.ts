import {
  leanFind,
  leanFindOne,
  leanFindById,
  leanAggregate,
  leanDistinct,
  findOneAndUpdate,
  createDocument,
} from "./typed-query";

function createMockModel() {
  return {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    findOneAndUpdate: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
  };
}

describe("leanFind", () => {
  test("calls find with filter and returns results", async () => {
    const model = createMockModel();
    const docs = [{ _id: "1" }];
    model.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(docs),
    });
    const result = await leanFind(model as any, { status: "active" });
    expect(model.find).toHaveBeenCalledWith({ status: "active" });
    expect(result).toEqual(docs);
  });
});

describe("leanFindOne", () => {
  test("calls findOne with filter", async () => {
    const model = createMockModel();
    await leanFindOne(model as any, { _id: "123" });
    expect(model.findOne).toHaveBeenCalledWith({ _id: "123" });
  });
});

describe("leanFindById", () => {
  test("calls findById with id", async () => {
    const model = createMockModel();
    await leanFindById(model as any, "abc123");
    expect(model.findById).toHaveBeenCalledWith("abc123");
  });
});

describe("leanAggregate", () => {
  test("calls aggregate with pipeline", async () => {
    const model = createMockModel();
    const pipeline = [{ $match: { status: "active" } }];
    await leanAggregate(model as any, pipeline);
    expect(model.aggregate).toHaveBeenCalledWith(pipeline);
  });
});

describe("leanDistinct", () => {
  test("calls distinct with field and filter", async () => {
    const model = createMockModel();
    await leanDistinct(model as any, "categoryId", { status: "active" });
    expect(model.distinct).toHaveBeenCalledWith("categoryId", { status: "active" });
  });
});

describe("findOneAndUpdate", () => {
  test("calls findOneAndUpdate with filter, update, and opts", async () => {
    const model = createMockModel();
    await findOneAndUpdate(model as any, { _id: "1" }, { $set: { x: 1 } }, { new: true });
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "1" },
      { $set: { x: 1 } },
      { new: true },
    );
  });

  test("defaults opts to empty object", async () => {
    const model = createMockModel();
    await findOneAndUpdate(model as any, { _id: "1" }, { $set: { x: 1 } });
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "1" },
      { $set: { x: 1 } },
      {},
    );
  });
});

describe("createDocument", () => {
  test("calls create with doc", async () => {
    const model = createMockModel();
    const doc = { name: "test" };
    await createDocument(model as any, doc);
    expect(model.create).toHaveBeenCalledWith(doc);
  });
});
