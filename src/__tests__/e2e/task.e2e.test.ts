import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { vi } from "vitest";
import testPrisma from "./setup.js";

// Mock the prisma singleton to use the test client
vi.mock("../../lib/prisma.js", () => ({
	default: testPrisma,
}));

// Import app AFTER mocking prisma
const { default: app } = await import("../../app.js");
import request from "supertest";

describe("Task API E2E Tests", () => {
	beforeEach(async () => {
		// Clean up database between tests
		await testPrisma.task.deleteMany();
	});

	afterAll(async () => {
		await testPrisma.$disconnect();
	});

	describe("POST /api/tasks", () => {
		it("should create a new task", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ title: "E2E Task", description: "E2E Description" });

			expect(res.status).toBe(201);
			expect(res.body).toHaveProperty("id");
			expect(res.body.title).toBe("E2E Task");
			expect(res.body.description).toBe("E2E Description");
			expect(res.body.completed).toBe(false);
		});

		it("should return 400 and create nothing when title is missing", async () => {
			const res = await request(app)
				.post("/api/tasks")
				.send({ description: "No title" });

			expect(res.status).toBe(400);
			await expect(testPrisma.task.count()).resolves.toBe(0);
		});
	});

	describe("GET /api/tasks", () => {
		it("should return an empty array when there are no tasks", async () => {
			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(res.body).toEqual([]);
		});

		it("should return all tasks ordered by createdAt desc", async () => {
			const older = await testPrisma.task.create({
				data: { title: "Older task" },
			});
			await new Promise((resolve) => setTimeout(resolve, 10));
			const newer = await testPrisma.task.create({
				data: { title: "Newer task" },
			});

			const res = await request(app).get("/api/tasks");

			expect(res.status).toBe(200);
			expect(res.body.map((t: { id: number }) => t.id)).toEqual([
				newer.id,
				older.id,
			]);
		});
	});

	describe("GET /api/tasks/:id", () => {
		it("should return 200 with the matching task", async () => {
			const created = await testPrisma.task.create({
				data: { title: "Find me" },
			});

			const res = await request(app).get(`/api/tasks/${created.id}`);

			expect(res.status).toBe(200);
			expect(res.body.id).toBe(created.id);
			expect(res.body.title).toBe("Find me");
		});

		it("should return 404 for a non-existent id", async () => {
			const res = await request(app).get("/api/tasks/999999");

			expect(res.status).toBe(404);
		});

		it("should return 400 for a non-numeric id", async () => {
			const res = await request(app).get("/api/tasks/abc");

			expect(res.status).toBe(400);
		});
	});

	describe("PUT /api/tasks/:id", () => {
		it("should update and persist the task", async () => {
			const created = await testPrisma.task.create({
				data: { title: "Before update" },
			});

			const res = await request(app)
				.put(`/api/tasks/${created.id}`)
				.send({ title: "After update", completed: true });

			expect(res.status).toBe(200);
			expect(res.body.title).toBe("After update");
			expect(res.body.completed).toBe(true);

			const getRes = await request(app).get(`/api/tasks/${created.id}`);
			expect(getRes.body.title).toBe("After update");
			expect(getRes.body.completed).toBe(true);
		});

		it("should return 404 for a non-existent id", async () => {
			const res = await request(app)
				.put("/api/tasks/999999")
				.send({ title: "Doesn't matter" });

			expect(res.status).toBe(404);
		});
	});

	describe("DELETE /api/tasks/:id", () => {
		it("should delete the task and remove it from the database", async () => {
			const created = await testPrisma.task.create({
				data: { title: "To be deleted" },
			});

			const res = await request(app).delete(`/api/tasks/${created.id}`);

			expect(res.status).toBe(204);
			await expect(
				testPrisma.task.findUnique({ where: { id: created.id } })
			).resolves.toBeNull();
		});

		it("should return 404 for a non-existent id", async () => {
			const res = await request(app).delete("/api/tasks/999999");

			expect(res.status).toBe(404);
		});
	});
});
