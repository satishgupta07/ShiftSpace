import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { connect, disconnect, clearDatabase } from "./helpers/db.js";
import { createTestUser } from "./helpers/auth.js";

const NOTES = "/api/v1/notes";
const PROJECTS = "/api/v1/projects";
const AUTH = "/api/v1/auth";

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });

let adminToken, memberToken, outsiderToken;
let memberUser;
let project, note;

const login = async (email, password = "Test@1234") => {
    const res = await request(app).post(`${AUTH}/login`).send({ email, password });
    return res.body.data.accessToken;
};

beforeEach(async () => {
    await clearDatabase();

    await createTestUser({ username: "admin", email: "admin@test.com" });
    memberUser = await createTestUser({ username: "member", email: "member@test.com" });
    await createTestUser({ username: "outsider", email: "outsider@test.com" });

    adminToken = await login("admin@test.com");
    memberToken = await login("member@test.com");
    outsiderToken = await login("outsider@test.com");

    const projectRes = await request(app)
        .post(PROJECTS)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Test Project" });
    project = projectRes.body.data;

    /* Add member user to the project */
    await request(app)
        .post(`${PROJECTS}/${project._id}/members`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: memberUser._id.toString(), role: "member" });

    /* Seed one note so tests that need an existing note skip this step */
    const noteRes = await request(app)
        .post(`${NOTES}/${project._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ content: "Seed note content" });
    note = noteRes.body.data;
});

// ─── List notes ───────────────────────────────────────────────────────────────

describe("GET /notes/:projectId", () => {
    it("returns all notes for a project member", async () => {
        const res = await request(app)
            .get(`${NOTES}/${project._id}`)
            .set("Authorization", `Bearer ${memberToken}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(1);
    });

    it("returns 403 for a non-member", async () => {
        const res = await request(app)
            .get(`${NOTES}/${project._id}`)
            .set("Authorization", `Bearer ${outsiderToken}`);

        expect(res.statusCode).toBe(403);
    });

    it("returns 401 without a token", async () => {
        const res = await request(app).get(`${NOTES}/${project._id}`);
        expect(res.statusCode).toBe(401);
    });
});

// ─── Create note ──────────────────────────────────────────────────────────────

describe("POST /notes/:projectId", () => {
    it("allows ADMIN to create a note (201)", async () => {
        const res = await request(app)
            .post(`${NOTES}/${project._id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ content: "New meeting notes" });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.content).toBe("New meeting notes");
    });

    it("returns 403 when MEMBER tries to create a note", async () => {
        const res = await request(app)
            .post(`${NOTES}/${project._id}`)
            .set("Authorization", `Bearer ${memberToken}`)
            .send({ content: "Member note attempt" });

        expect(res.statusCode).toBe(403);
    });

    it("returns 422 when content is missing", async () => {
        const res = await request(app)
            .post(`${NOTES}/${project._id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({});

        expect(res.statusCode).toBe(422);
    });
});

// ─── Get note by ID ───────────────────────────────────────────────────────────

describe("GET /notes/:projectId/n/:noteId", () => {
    it("returns a note with creator details for a project member", async () => {
        const res = await request(app)
            .get(`${NOTES}/${project._id}/n/${note._id}`)
            .set("Authorization", `Bearer ${memberToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data._id).toBe(note._id);
        expect(res.body.data.content).toBe("Seed note content");
        expect(res.body.data.createdBy).toBeDefined();
    });

    it("returns 404 for a non-existent note", async () => {
        const { Types } = await import("mongoose");
        const fakeId = new Types.ObjectId().toString();

        const res = await request(app)
            .get(`${NOTES}/${project._id}/n/${fakeId}`)
            .set("Authorization", `Bearer ${memberToken}`);

        expect(res.statusCode).toBe(404);
    });

    it("returns 403 for a non-member", async () => {
        const res = await request(app)
            .get(`${NOTES}/${project._id}/n/${note._id}`)
            .set("Authorization", `Bearer ${outsiderToken}`);

        expect(res.statusCode).toBe(403);
    });
});

// ─── Update note ──────────────────────────────────────────────────────────────

describe("PUT /notes/:projectId/n/:noteId", () => {
    it("allows ADMIN to update a note's content", async () => {
        const res = await request(app)
            .put(`${NOTES}/${project._id}/n/${note._id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ content: "Updated content" });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.content).toBe("Updated content");
    });

    it("returns 403 when MEMBER tries to update", async () => {
        const res = await request(app)
            .put(`${NOTES}/${project._id}/n/${note._id}`)
            .set("Authorization", `Bearer ${memberToken}`)
            .send({ content: "Sneaky edit" });

        expect(res.statusCode).toBe(403);
    });

    it("returns 422 when content is empty", async () => {
        const res = await request(app)
            .put(`${NOTES}/${project._id}/n/${note._id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ content: "" });

        expect(res.statusCode).toBe(422);
    });

    it("returns 404 for a non-existent note", async () => {
        const { Types } = await import("mongoose");
        const fakeId = new Types.ObjectId().toString();

        const res = await request(app)
            .put(`${NOTES}/${project._id}/n/${fakeId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ content: "Ghost note" });

        expect(res.statusCode).toBe(404);
    });
});

// ─── Delete note ──────────────────────────────────────────────────────────────

describe("DELETE /notes/:projectId/n/:noteId", () => {
    it("allows ADMIN to delete a note", async () => {
        const res = await request(app)
            .delete(`${NOTES}/${project._id}/n/${note._id}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);

        /* Confirm the note is gone */
        const check = await request(app)
            .get(`${NOTES}/${project._id}/n/${note._id}`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(check.statusCode).toBe(404);
    });

    it("returns 403 when MEMBER tries to delete", async () => {
        const res = await request(app)
            .delete(`${NOTES}/${project._id}/n/${note._id}`)
            .set("Authorization", `Bearer ${memberToken}`);

        expect(res.statusCode).toBe(403);
    });

    it("returns 404 for a non-existent note", async () => {
        const { Types } = await import("mongoose");
        const fakeId = new Types.ObjectId().toString();

        const res = await request(app)
            .delete(`${NOTES}/${project._id}/n/${fakeId}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(404);
    });
});
