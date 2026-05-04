/* Runs before the test framework is installed (Jest setupFiles).
   Sets env vars required by JWT signing and token verification so tests
   never depend on a .env file being present in the repo. */
process.env.ACCESS_TOKEN_SECRET ??= "test-access-token-secret-key-for-jest";
process.env.REFRESH_TOKEN_SECRET ??= "test-refresh-token-secret-key-for-jest";
process.env.ACCESS_TOKEN_EXPIRY ??= "1d";
process.env.REFRESH_TOKEN_EXPIRY ??= "7d";
