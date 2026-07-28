import "@testing-library/jest-dom";

/* Polyfill TextEncoder/TextDecoder for jsdom environment (needed by jose, etc.) */
if (typeof globalThis.TextDecoder === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextDecoder: NodeTextDecoder } = require("util");
  globalThis.TextDecoder = NodeTextDecoder;
}
if (typeof globalThis.TextEncoder === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextEncoder: NodeTextEncoder } = require("util");
  globalThis.TextEncoder = NodeTextEncoder;
}
