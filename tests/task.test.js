import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";
import { connect, disconnect, clearDatabase } from "./helpers/db.js";
import { createTestUser } from "./helpers/auth.js";

const TASKS = "/api/v1/tasks";
const PROJECTS = "/api/v1/projects";
const AUTH = "/api/v1/auth";

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });

let adminToken, memberToken;
let adminUser, memberUser;
let project, task;

const login = async (email, password = "Test@1234") => {
    const res = await request(app).post(`${AUTH}/login`).send({ email, password });
    return res.body.data.accessToken;
};

beforeEach(async () => {
    await clearDatabase();

    adminUser = await createTestUser({ username: "admin", email: "admin@test.com" });
    memberUser = await createTestUser({ username: "member", email: "member@test.com" });

    adminToken = await login("admin@test.com");
    memberToken = await login("member@test.com");

    const projectRes = await request(app)
        .post(PROJECTS)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Test Project" });
    project = projectRes.body.data;

    await request(app)
        .post(`${PROJECTS}/${project._id}/members`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ userId: memberUser._id.toString(), role: "member" });

    /* Seed one task so tests that need an existing task don't repeat this */
    const taskRes = await request(app)
        .post(`${TASKS}/${project._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Seed Task", status: "todo" });
    task = taskRes.body.data;
});

// ─── List tasks ───────────────────────────────────────────────────────────────

describe("GET /tasks/:projectId", () => {
    it("returns all tasks for a project member", async () => {
        const res = await request(app)
            .get(`${TASKS}/${project._id}`)
            .set("Authorization", `Bearer ${memberToken}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(1);
    });

    it("returns 403 for a non-member", async () => {
        const outsider = await createTestUser({ username: "outsider", email: "outsider@test.com" });
        const outsiderToken = await login("outsider@test.com");

        const res = await request(app)
            .get(`${TASKS}/${project._id}`)
            .set("Authorization", `Bearer ${outsiderToken}`);

        expect(res.statusCode).toBe(403);
    });
});

// ─── Create task ──────────────────────────────────────────────────────────────

describe("POST /tasks/:projectId", () => {
    it("allows ADMIN to create a task (201)", async () => {
        const res = await request(app)
            .post(`${TASKS}/${project._id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "New Task", status: "in_progress" });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.title).toBe("New Task");
        expect(res.body.data.status).toBe("in_progress");
    });

    it("returns 422 when title is missing", async () => {
        const res = await request(app)
            .post(`${TASKS}/${project._id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ status: "todo" });

        expect(res.statusCode).toBe(422);
    });

    it("returns 422 for an invalid status value", async () => {
        const res = await request(app)
            .post(`${TASKS}/${project._id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Bad Status", status: "pending" });

        expect(res.statusCode).toBe(422);
    });

    it("returns 403 when a MEMBER tries to create a task", async () => {
        const res = await request(app)
            .post(`${TASKS}/${project._id}`)
            .set("Authorization", `Bearer ${memberToken}`)
            .send({ title: "Sneaky Task" });

        expect(res.statusCode).toBe(403);
    });
});

// ─── Get task by ID ───────────────────────────────────────────────────────────

describe("GET /tasks/:projectId/t/:taskId", () => {
    it("returns a task with its subtasks and assignee for a member", async () => {
        const res = await request(app)
            .get(`${TASKS}/${project._id}/t/${task._id}`)
            .set("Authorization", `Bearer ${memberToken}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.data._id).toBe(task._id);
        expect(Array.isArray(res.body.data.subtasks)).toBe(true);
    });

    it("returns 404 for a task that does not exist", async () => {
        const { Types } = await import("mongoose");
        const fakeId = new Types.ObjectId().toString();

        const res = await request(app)
            .get(`${TASKS}/${project._id}/t/${fakeId}`)
            .set("Authorization", `Bearer ${memberToken}`);

        expect(res.statusCode).toBe(404);
    });
});

// ─── Update task ──────────────────────────────────────────────────────────────

describe("PUT /tasks/:projectId/t/:taskId", () => {
    it("allows ADMIN to update task details", async () => {
        const res = await request(app)
            .put(`${TASKS}/${project._id}/t/${task._id}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Updated Task", status: "done" });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.title).toBe("Updated Task");
        expect(res.body.data.status).toBe("done");
    });

    it("returns 403 when a MEMBER tries to update", async () => {
        const res = await request(app)
            .put(`${TASKS}/${project._id}/t/${task._id}`)
            .set("Authorization", `Bearer ${memberToken}`)
            .send({ title: "Hacked" });

        expect(res.statusCode).toBe(403);
    });
});

// ─── Delete task ──────────────────────────────────────────────────────────────

describe("DELETE /tasks/:projectId/t/:taskId", () => {
    it("allows ADMIN to delete a task (cascades subtasks)", async () => {
        /* Add a subtask first to verify cascade */
        await request(app)
            .post(`${TASKS}/${project._id}/t/${task._id}/subtasks`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Sub" });

        const res = await request(app)
            .delete(`${TASKS}/${project._id}/t/${task._id}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);

        /* Confirm the task is gone */
        const check = await request(app)
            .get(`${TASKS}/${project._id}/t/${task._id}`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(check.statusCode).toBe(404);
    });

    it("returns 403 when a MEMBER tries to delete", async () => {
        const res = await request(app)
            .delete(`${TASKS}/${project._id}/t/${task._id}`)
            .set("Authorization", `Bearer ${memberToken}`);

        expect(res.statusCode).toBe(403);
    });
});

// ─── Create subtask ───────────────────────────────────────────────────────────

describe("POST /tasks/:projectId/t/:taskId/subtasks", () => {
    it("allows ADMIN to create a subtask (201)", async () => {
        const res = await request(app)
            .post(`${TASKS}/${project._id}/t/${task._id}/subtasks`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "My Subtask" });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.title).toBe("My Subtask");
        expect(res.body.data.isCompleted).toBe(false);
    });

    it("returns 422 when title is missing", async () => {
        const res = await request(app)
            .post(`${TASKS}/${project._id}/t/${task._id}/subtasks`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({});

        expect(res.statusCode).toBe(422);
    });

    it("returns 403 when MEMBER tries to create a subtask", async () => {
        const res = await request(app)
            .post(`${TASKS}/${project._id}/t/${task._id}/subtasks`)
            .set("Authorization", `Bearer ${memberToken}`)
            .send({ title: "Sneaky Sub" });

        expect(res.statusCode).toBe(403);
    });
});

// ─── Update subtask ───────────────────────────────────────────────────────────

describe("PUT /tasks/:projectId/t/:taskId/subtasks/:subtaskId", () => {
    let subtask;

    beforeEach(async () => {
        const res = await request(app)
            .post(`${TASKS}/${project._id}/t/${task._id}/subtasks`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Original" });
        subtask = res.body.data;
    });

    it("allows any MEMBER to toggle isCompleted", async () => {
        const res = await request(app)
            .put(`${TASKS}/${project._id}/t/${task._id}/subtasks/${subtask._id}`)
            .set("Authorization", `Bearer ${memberToken}`)
            .send({ isCompleted: true });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.isCompleted).toBe(true);
    });

    it("allows MEMBER to update the title", async () => {
        const res = await request(app)
            .put(`${TASKS}/${project._id}/t/${task._id}/subtasks/${subtask._id}`)
            .set("Authorization", `Bearer ${memberToken}`)
            .send({ title: "Renamed" });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.title).toBe("Renamed");
    });

    it("returns 404 for a non-existent subtask", async () => {
        const { Types } = await import("mongoose");
        const fakeId = new Types.ObjectId().toString();

        const res = await request(app)
            .put(`${TASKS}/${project._id}/t/${task._id}/subtasks/${fakeId}`)
            .set("Authorization", `Bearer ${memberToken}`)
            .send({ isCompleted: true });

        expect(res.statusCode).toBe(404);
    });
});

// ─── Delete subtask ───────────────────────────────────────────────────────────

describe("DELETE /tasks/:projectId/t/:taskId/subtasks/:subtaskId", () => {
    let subtask;

    beforeEach(async () => {
        const res = await request(app)
            .post(`${TASKS}/${project._id}/t/${task._id}/subtasks`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "To Delete" });
        subtask = res.body.data;
    });

    it("allows ADMIN to delete a subtask", async () => {
        const res = await request(app)
            .delete(`${TASKS}/${project._id}/t/${task._id}/subtasks/${subtask._id}`)
            .set("Authorization", `Bearer ${adminToken}`);

        expect(res.statusCode).toBe(200);
    });

    it("returns 403 when MEMBER tries to delete a subtask", async () => {
        const res = await request(app)
            .delete(`${TASKS}/${project._id}/t/${task._id}/subtasks/${subtask._id}`)
            .set("Authorization", `Bearer ${memberToken}`);

        expect(res.statusCode).toBe(403);
    });
});
