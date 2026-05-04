import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { connect, disconnect, clearDatabase } from "./helpers/db.js";
import { createTestUser } from "./helpers/auth.js";

const PROJECTS = "/api/v1/projects";
const AUTH = "/api/v1/auth";

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });

/* Each test gets a fresh DB + a pre-built admin user, a member user, and
   a project so tests only set up the specific state they need to vary. */
let adminToken, memberToken, outsiderToken;
let adminUser, memberUser;
let project;

const login = async (email, password = "Test@1234") => {
    const res = await request(app).post(`${AUTH}/login`).send({ email, password });
    return res.body.data.accessToken;
};

beforeEach(async () => {
    await clearDatabase();

    adminUser = await createTestUser({ username: "admin", email: "admin@test.com" });
    memberUser = await createTestUser({ username: "member", email: "member@test.com" });
    const outsiderUser = await createTestUser({ username: "outsider", email: "outsider@test.com" });

    adminToken = await login("admin@test.com");
    memberToken = await login("member@test.com");
    outsiderToken = await login("outsider@test.com");

    /* Create project — creator is auto-added as ADMIN by the controller */
    const projectRes = await request(app)
        .post(PROJECTS)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Test Project", description: "For testing" });
    project = projectRes.body.data;

    /* Add member user as MEMBER */
    await request(app)
        .post(`${PROJECTS}/${project._id}/members`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: memberUser._id.toString(), role: "member" });
});

// ─── List projects ────────────────────────────────────────────────────────────

describe("GET /projects", () => {
    it("returns the projects the authenticated user belongs to", async () => {
        const res = await request(app)
            .get(PROJECTS)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("returns 401 without a token", async () => {
        const res = await request(app).get(PROJECTS);
        expect(res.statusCode).toBe(401);
    });
});

// ─── Create project ───────────────────────────────────────────────────────────

describe("POST /projects", () => {
    it("creates a project and adds the creator as ADMIN (201)", async () => {
        const res = await request(app)
            .post(PROJECTS)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "New Project" });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.name).toBe("New Project");
    });

    it("returns 422 when name is missing", async () => {
        const res = await request(app)
            .post(PROJECTS)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({});

        expect(res.statusCode).toBe(422);
    });

    it("returns 401 without a token", async () => {
        const res = await request(app).post(PROJECTS).send({ name: "Stealth Project" });
        expect(res.statusCode).toBe(401);
    });
});

// ─── Get project by ID ────────────────────────────────────────────────────────

describe("GET /projects/:projectId", () => {
    it("returns project details for a project member", async () => {
        const res = await request(app)
            .get(`${PROJECTS}/${project._id}`)
            .set("Authorization", `Bearer ${memberToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data._id).toBe(project._id);
    });

    it("returns 403 for a user who is not a member", async () => {
        const res = await request(app)
            .get(`${PROJECTS}/${project._id}`)
            .set("Authorization", `Bearer ${outsiderToken}`);

        expect(res.statusCode).toBe(403);
    });
});

// ─── Update project ───────────────────────────────────────────────────────────

describe("PUT /projects/:projectId", () => {
    it("allows ADMIN to update project details", async () => {
        const res = await request(app)
            .put(`${PROJECTS}/${project._id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "Updated Name" });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.name).toBe("Updated Name");
    });

    it("returns 403 when a MEMBER tries to update", async () => {
        const res = await request(app)
            .put(`${PROJECTS}/${project._id}`)
            .set("Authorization", `Bearer ${memberToken}`)
            .send({ name: "Hacked Name" });

        expect(res.statusCode).toBe(403);
    });
});

// ─── Delete project ───────────────────────────────────────────────────────────

describe("DELETE /projects/:projectId", () => {
    it("allows ADMIN to delete the project", async () => {
        const res = await request(app)
            .delete(`${PROJECTS}/${project._id}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
    });

    it("returns 403 when a MEMBER tries to delete", async () => {
        const res = await request(app)
            .delete(`${PROJECTS}/${project._id}`)
            .set("Authorization", `Bearer ${memberToken}`);

        expect(res.statusCode).toBe(403);
    });
});

// ─── List members ─────────────────────────────────────────────────────────────

describe("GET /projects/:projectId/members", () => {
    it("returns the member list for any project member", async () => {
        const res = await request(app)
            .get(`${PROJECTS}/${project._id}/members`)
            .set("Authorization", `Bearer ${memberToken}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(2); // admin + member
    });
});

// ─── Add member ───────────────────────────────────────────────────────────────

describe("POST /projects/:projectId/members", () => {
    it("allows ADMIN to add a new member", async () => {
        const newUser = await createTestUser({ username: "newbie", email: "newbie@test.com" });

        const res = await request(app)
            .post(`${PROJECTS}/${project._id}/members`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ userId: newUser._id.toString(), role: "member" });

        expect(res.statusCode).toBe(201);
    });

    it("returns 409 when the user is already a member", async () => {
        const res = await request(app)
            .post(`${PROJECTS}/${project._id}/members`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ userId: memberUser._id.toString() });

        expect(res.statusCode).toBe(409);
    });

    it("returns 404 when the userId does not exist", async () => {
        const { Types } = await import("mongoose");
        const fakeId = new Types.ObjectId().toString();

        const res = await request(app)
            .post(`${PROJECTS}/${project._id}/members`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ userId: fakeId });

        expect(res.statusCode).toBe(404);
    });

    it("returns 403 when a MEMBER tries to add someone", async () => {
        const newUser = await createTestUser({ username: "newbie", email: "newbie@test.com" });

        const res = await request(app)
            .post(`${PROJECTS}/${project._id}/members`)
            .set("Authorization", `Bearer ${memberToken}`)
            .send({ userId: newUser._id.toString() });

        expect(res.statusCode).toBe(403);
    });

    it("returns 422 for an invalid userId format", async () => {
        const res = await request(app)
            .post(`${PROJECTS}/${project._id}/members`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ userId: "not-a-mongo-id" });

        expect(res.statusCode).toBe(422);
    });
});

// ─── Update member role ───────────────────────────────────────────────────────

describe("PUT /projects/:projectId/members/:userId", () => {
    it("allows ADMIN to change a member's role", async () => {
        const res = await request(app)
            .put(`${PROJECTS}/${project._id}/members/${memberUser._id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ role: "project_admin" });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.role).toBe("project_admin");
    });

    it("returns 400 when ADMIN tries to change their own role", async () => {
        const res = await request(app)
            .put(`${PROJECTS}/${project._id}/members/${adminUser._id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ role: "member" });

        expect(res.statusCode).toBe(400);
    });

    it("returns 422 for an invalid role value", async () => {
        const res = await request(app)
            .put(`${PROJECTS}/${project._id}/members/${memberUser._id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ role: "superuser" });

        expect(res.statusCode).toBe(422);
    });
});

// ─── Remove member ────────────────────────────────────────────────────────────

describe("DELETE /projects/:projectId/members/:userId", () => {
    it("allows ADMIN to remove a member", async () => {
        const res = await request(app)
            .delete(`${PROJECTS}/${project._id}/members/${memberUser._id}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
    });

    it("returns 400 when ADMIN tries to remove themselves", async () => {
        const res = await request(app)
            .delete(`${PROJECTS}/${project._id}/members/${adminUser._id}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(400);
    });

    it("returns 403 when a MEMBER tries to remove someone", async () => {
        const res = await request(app)
            .delete(`${PROJECTS}/${project._id}/members/${adminUser._id}`)
            .set("Authorization", `Bearer ${memberToken}`);

        expect(res.statusCode).toBe(403);
    });
});
