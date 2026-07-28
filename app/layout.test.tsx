jest.mock("better-auth", () => ({
  betterAuth: jest.fn(() => ({
    api: {
      signInEmail: jest.fn(),
      signUpEmail: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
    },
  })),
}));

jest.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    useSession: () => ({ data: null, subscribe: () => () => {} }),
  }),
}));

import { metadata } from "./layout";

describe("RootLayout", () => {
  it("has correct metadata title", () => {
    expect(metadata.title).toBe(
      "Campus Maintenance Complaint Management System (LASU)"
    );
  });

  it("has correct metadata description", () => {
    expect(metadata.description).toBe(
      "Web-based platform for campus maintenance complaints at LASU"
    );
  });
});
