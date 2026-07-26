import { QueryClient } from "@tanstack/react-query";
import { queryClient } from "./query-client";

describe("queryClient", () => {
  test("returns the same instance on repeated imports (singleton)", () => {
    expect(queryClient).toBeDefined();
    expect(typeof queryClient.fetchQuery).toBe("function");
  });

  test("configures staleTime of 60 seconds per AC-3", () => {
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(60_000);
  });

  test("enables refetchOnWindowFocus per AC-3", () => {
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(true);
  });

  test("sets retry to 1 per AC-3", () => {
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(1);
  });

  test("is a real QueryClient instance", () => {
    expect(queryClient).toBeInstanceOf(QueryClient);
  });
});
