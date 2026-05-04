import { describe, it, expect } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";

describe("GET /api/v1/healthcheck", () => {
    it("should return 200 with server status message", async () => {
        const res = await request(app).get("/api/v1/healthcheck");

        expect(res.statusCode).toBe(200);
        expect(res.body.data.message).toBe("Server is running");
    });
});
