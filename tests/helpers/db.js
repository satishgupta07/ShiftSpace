import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongoServer;

/* Spins up an in-memory MongoDB instance and connects mongoose to it.
   Call in beforeAll so the server is ready before any test runs. */
export const connect = async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
};

/* Drops the database, closes the connection, and stops the server.
   Call in afterAll to release all resources cleanly. */
export const disconnect = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
};

/* Empties every collection without tearing down the connection.
   Call in beforeEach to give each test a clean slate. */
export const clearDatabase = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
};
