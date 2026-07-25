import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^bson$": "<rootDir>/node_modules/bson/lib/bson.cjs",
    "^bson/(.*)$": "<rootDir>/node_modules/bson/lib/bson.cjs",
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  transformIgnorePatterns: [
    "node_modules/(?!(bson|mongodb|mongoose)/)",
  ],
};

export default createJestConfig(config);
