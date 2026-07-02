import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import type { Task } from "@prisma/client";

// Mock the service module
vi.mock("../../services/task.service.js", () => ({
	findAll: vi.fn(),
	findById: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	remove: vi.fn(),
}));

import * as taskService from "../../services/task.service.js";
import * as taskController from "../../controllers/task.controller.js";

const mockService = vi.mocked(taskService);

const mockTask: Task = {
	id: 1,
	title: "Test Task",
	description: "Test description",
	completed: false,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createMockResponse(): Response {
	const res = {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		send: vi.fn().mockReturnThis(),
	} as unknown as Response;
	return res;
}

function createMockRequest(overrides: Partial<Request> = {}): Request {
	return {
		params: {},
		body: {},
		query: {},
		...overrides,
	} as unknown as Request;
}

describe("TaskController", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAllTasks", () => {
		it("should return 200 with all tasks", async () => {
			const tasks = [mockTask];
			mockService.findAll.mockResolvedValue(tasks);
			const req = createMockRequest();
			const res = createMockResponse();

			await taskController.getAllTasks(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(tasks);
		});

		it("should return 500 when the service throws", async () => {
			mockService.findAll.mockRejectedValue(new Error("db error"));
			const req = createMockRequest();
			const res = createMockResponse();

			await taskController.getAllTasks(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch tasks" });
		});
	});

	describe("getTaskById", () => {
		it("should return 200 with the task for a valid id", async () => {
			mockService.findById.mockResolvedValue(mockTask);
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(mockService.findById).toHaveBeenCalledWith(1);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(mockTask);
		});

		it("should return 400 for a non-numeric id without calling the service", async () => {
			const req = createMockRequest({ params: { id: "abc" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(mockService.findById).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
		});

		it("should return 404 when the task does not exist", async () => {
			mockService.findById.mockResolvedValue(null);
			const req = createMockRequest({ params: { id: "999" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
		});

		it("should return 500 when the service throws", async () => {
			mockService.findById.mockRejectedValue(new Error("db error"));
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch task" });
		});
	});

	describe("createTask", () => {
		it("should return 201 with the created task", async () => {
			mockService.create.mockResolvedValue(mockTask);
			const req = createMockRequest({
				body: { title: "Test Task", description: "Test description" },
			});
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(mockService.create).toHaveBeenCalledWith({
				title: "Test Task",
				description: "Test description",
			});
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith(mockTask);
		});

		it.each([
			["missing", {}],
			["empty", { title: "" }],
			["whitespace-only", { title: "   " }],
			["non-string", { title: 123 }],
		])("should return 400 when title is %s", async (_case, body) => {
			const req = createMockRequest({ body });
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(mockService.create).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				error: "Title is required and must be a non-empty string",
			});
		});

		it("should return 500 when the service throws", async () => {
			mockService.create.mockRejectedValue(new Error("db error"));
			const req = createMockRequest({ body: { title: "Test Task" } });
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to create task" });
		});
	});

	describe("updateTask", () => {
		it("should return 200 with the updated task", async () => {
			const updatedTask = { ...mockTask, title: "Updated" };
			mockService.update.mockResolvedValue(updatedTask);
			const req = createMockRequest({
				params: { id: "1" },
				body: { title: "Updated" },
			});
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(mockService.update).toHaveBeenCalledWith(1, {
				title: "Updated",
				description: undefined,
				completed: undefined,
			});
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(updatedTask);
		});

		it("should return 400 for a non-numeric id without calling the service", async () => {
			const req = createMockRequest({ params: { id: "abc" }, body: {} });
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(mockService.update).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
		});

		it("should return 404 when the service reports the task is not found", async () => {
			mockService.update.mockRejectedValue(new Error("Task not found"));
			const req = createMockRequest({ params: { id: "999" }, body: {} });
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
		});

		it("should return 500 for a generic service error", async () => {
			mockService.update.mockRejectedValue(new Error("db error"));
			const req = createMockRequest({ params: { id: "1" }, body: {} });
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to update task" });
		});
	});

	describe("deleteTask", () => {
		it("should return 204 with no body", async () => {
			mockService.remove.mockResolvedValue(mockTask);
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(mockService.remove).toHaveBeenCalledWith(1);
			expect(res.status).toHaveBeenCalledWith(204);
			expect(res.send).toHaveBeenCalledWith();
		});

		it("should return 400 for a non-numeric id without calling the service", async () => {
			const req = createMockRequest({ params: { id: "abc" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(mockService.remove).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
		});

		it("should return 404 when the service reports the task is not found", async () => {
			mockService.remove.mockRejectedValue(new Error("Task not found"));
			const req = createMockRequest({ params: { id: "999" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
		});

		it("should return 500 for a generic service error", async () => {
			mockService.remove.mockRejectedValue(new Error("db error"));
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to delete task" });
		});
	});
});
