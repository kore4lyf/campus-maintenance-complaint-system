import type { Page, BrowserContext } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

export async function createTestUser(
  overrides?: Partial<TestUser>,
): Promise<TestUser> {
  const email =
    overrides?.email ??
    `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.lasu.edu.ng`;
  const password = overrides?.password ?? "TestPassword123!";
  const name = overrides?.name ?? "E2E User";

  const res = await fetch(`${BASE_URL}/api/test/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (!res.ok) {
    throw new Error(`Failed to create test user: ${res.status} ${await res.text()}`);
  }

  return { email, password, name };
}

export async function signInAsTestUser(
  context: BrowserContext,
  user: TestUser,
): Promise<void> {
  // We use a test-session cookie instead of the better-auth session token
  // because the nextCookies plugin does not reliably set/read the better-auth
  // session cookie in the E2E environment. The server-side DAL recognizes this
  // test-only cookie in non-production environments.
  await context.addCookies([
    {
      name: "test-session",
      value: user.email,
      domain: "localhost",
      path: "/",
    },
  ]);
}

export async function ensureAuthenticated(page: Page): Promise<void> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.lasu.edu.ng`;
  const user = await createTestUser({ email });
  await signInAsTestUser(page.context(), user);

  await page.goto("/complaints/mine");
  await page.waitForURL(/\/complaints/, { timeout: 10000 });
}
