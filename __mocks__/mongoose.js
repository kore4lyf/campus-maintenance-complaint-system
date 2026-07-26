const mockObjectId = jest.fn();
const mockMixed = jest.fn();

const Schema = jest.fn().mockImplementation((fields, options) => {
  const paths = {};
  function processFields(obj, prefix) {
    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const val = obj[key];
      if (val && typeof val === "object" && val.fields && val.paths) {
        paths[fullKey] = { ...val, path: fullKey };
      } else if (val && typeof val === "object" && !Array.isArray(val) && val.type) {
        paths[fullKey] = { ...val, path: fullKey };
      } else if (val && typeof val === "object" && !Array.isArray(val)) {
        processFields(val, fullKey);
      } else {
        paths[fullKey] = val;
      }
    }
  }
  if (fields) {
    processFields(fields, "");
  }
  paths["_id"] = { path: "_id" };

  return {
    path: jest.fn().mockImplementation((field) => {
      if (paths[field]) {
        return { ...paths[field], path: field };
      }
      return undefined;
    }),
    paths,
    fields,
    options,
    _indexes: [],
    _clone: jest.fn().mockReturnThis(),
    pre: jest.fn().mockReturnValue(undefined),
    post: jest.fn().mockReturnValue(undefined),
    invalidate: jest.fn(),
    virtual: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    })),
    _preFindOneAndUpdate: {
      getUpdate: jest.fn().mockReturnValue(null),
      getFilter: jest.fn().mockReturnValue({}),
      getOptions: jest.fn().mockReturnValue({}),
    },
  };
});

Schema.Types = {
  ObjectId: mockObjectId,
  Mixed: mockMixed,
};

module.exports = {
  Schema,
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  connection: {
    readyState: 0,
    model: jest.fn(),
  },
  models: {},
  model: jest.fn().mockReturnValue({}),
  Types: {
    ObjectId: mockObjectId,
  },
};
