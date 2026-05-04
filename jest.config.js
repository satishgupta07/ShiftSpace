/* Jest configuration for an ES Module (type: "module") Node.js project.
   --experimental-vm-modules is required because Jest's ESM support is still
   experimental. It is injected via NODE_OPTIONS in the npm test scripts. */
export default {
    testEnvironment: "node",

    /* Disable all transforms — the project is native ESM, no Babel needed */
    transform: {},

    /* Where Jest looks for test files */
    testMatch: ["**/tests/**/*.test.js"],

    /* Print each test name as it runs */
    verbose: true,

    /* Reset mock state between tests automatically */
    clearMocks: true,

    /* Allow extra time for MongoMemoryServer startup and async DB operations */
    testTimeout: 30000,

    /* Set JWT env vars before the test framework loads */
    setupFiles: ["./tests/setup.js"],
};
