import type { Config } from "jest";
import nextJest from "next/jest.js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

const createJestConfig = nextJest({ dir: "./" });

const ESM_PATTERN =
  "node_modules/(?!(bson|mongodb|mongoose|@astryxdesign|better-auth|@better-auth|jose|nanoid|@ai-sdk)/)";

const config_: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testTimeout: 60000,
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^bson$": "<rootDir>/node_modules/bson/lib/bson.cjs",
    "^bson/(.*)$": "<rootDir>/node_modules/bson/lib/bson.cjs",
    "@astryxdesign/core/theme$": "<rootDir>/lib/__mocks__/Theme.tsx",
    "@astryxdesign/core/Link$": "<rootDir>/lib/__mocks__/LinkProvider.tsx",
    "@astryxdesign/theme-neutral/built$": "<rootDir>/lib/__mocks__/neutralTheme.ts",
  },
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/tests/e2e/",
  ],
  transformIgnorePatterns: [ESM_PATTERN],
};

// next/jest's createJestConfig returns a function; we wrap it to patch
// transformIgnorePatterns back in after the wrapper processes our config.
const resolvedConfig = createJestConfig(config_);

export default async function jestConfig() {
  const cfg = await resolvedConfig();
  cfg.transformIgnorePatterns = [ESM_PATTERN];
  return cfg;
}
