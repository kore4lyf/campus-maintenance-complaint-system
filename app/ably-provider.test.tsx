/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("ably", () => ({
  __esModule: true,
  default: { Realtime: jest.fn() },
  Realtime: jest.fn(),
}));

Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: jest.fn(() => "test-uuid-1234"),
  },
  configurable: true,
});
if (typeof globalThis.window !== "undefined") {
  Object.defineProperty(globalThis.window, "crypto", {
    value: {
      randomUUID: jest.fn(() => "test-uuid-1234"),
    },
    configurable: true,
  });
}

import { AblyClientProvider } from "./ably-provider";

describe("AblyClientProvider", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders children without blocking the UI when Ably is unavailable", () => {
    render(
      <AblyClientProvider>
        <div data-testid="child">child</div>
      </AblyClientProvider>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
