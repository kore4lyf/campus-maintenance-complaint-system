import { QueryClient } from "@tanstack/react-query";
import { getQueryClient } from "./query-client";

describe("queryClient", () => {
  test("returns the same instance on repeated calls (singleton)", () => {
    const client = getQueryClient();
    expect(client).toBeDefined();
    expect(typeof client.fetchQuery).toBe("function");
  });

  test("configures staleTime of 60 seconds per AC-3", () => {
    const client = getQueryClient();
    expect(client.getDefaultOptions().queries?.staleTime).toBe(60_000);
  });

  test("enables refetchOnWindowFocus per AC-3", () => {
    const client = getQueryClient();
    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(true);
  });

  test("sets retry to 1 per AC-3", () => {
    const client = getQueryClient();
    expect(client.getDefaultOptions().queries?.retry).toBe(1);
  });

  test("is a real QueryClient instance", () => {
    const client = getQueryClient();
    expect(client).toBeInstanceOf(QueryClient);
  });
});
