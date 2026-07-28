import { ApiError, toUserMessage } from "./errors";

describe("ApiError", () => {
  test("stores code, message, and status", () => {
    const err = new ApiError("not_found", "Item not found", 404);
    expect(err.code).toBe("not_found");
    expect(err.message).toBe("Item not found");
    expect(err.status).toBe(404);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("toUserMessage", () => {
  test("returns message from ApiError", () => {
    const err = new ApiError("forbidden", "Admin access required", 403);
    expect(toUserMessage(err)).toBe("Admin access required");
  });

  test("returns network error message for fetch errors", () => {
    const err = new Error("fetch failed");
    expect(toUserMessage(err)).toBe(
      "A network error occurred. Please check your connection and try again.",
    );
  });

  test("returns timeout message for timeout errors", () => {
    const err = new Error("timeout of 5000ms exceeded");
    expect(toUserMessage(err)).toBe(
      "The request took too long. Please try again.",
    );
  });

  test("returns generic message for unknown errors", () => {
    const err = new Error("something weird");
    expect(toUserMessage(err)).toBe(
      "Something went wrong. Please try again later.",
    );
  });

  test("returns generic message for non-Error values", () => {
    expect(toUserMessage("string error")).toBe(
      "Something went wrong. Please try again later.",
    );
    expect(toUserMessage(null)).toBe(
      "Something went wrong. Please try again later.",
    );
    expect(toUserMessage(undefined)).toBe(
      "Something went wrong. Please try again later.",
    );
  });
});
