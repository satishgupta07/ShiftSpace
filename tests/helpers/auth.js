import { User } from "../../src/models/user.model.js";

/* Creates a user directly in the database, bypassing the register endpoint
   and its email-sending side-effect. isEmailVerified defaults to true so the
   account is immediately usable for login without verifying email. */
export const createTestUser = async ({
    username = "testuser",
    email = "test@example.com",
    password = "Test@1234",
    isEmailVerified = true,
} = {}) => {
    return await User.create({ username, email, password, isEmailVerified });
};
