import type { Config } from "jest";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

const config_: Config = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/lib/db/__tests__/*.runtime.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(bson|mongodb|mongoose)/)",
  ],
  testTimeout: 60000,
};

export default config_;
