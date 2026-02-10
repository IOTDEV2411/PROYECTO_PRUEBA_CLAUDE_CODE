// @vitest-environment node
import { test, expect, describe, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { createProject } from "@/actions/create-project";
import { getProject } from "@/actions/get-project";
import { getProjects } from "@/actions/get-projects";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

beforeEach(() => {
  vi.clearAllMocks();
});

// --- createProject ---

describe("createProject", () => {
  test("creates a project for authenticated user", async () => {
    (getSession as any).mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
    });

    const mockProject = {
      id: "proj-1",
      name: "My Project",
      userId: "user-1",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    (prisma.project.create as any).mockResolvedValue(mockProject);

    const result = await createProject({
      name: "My Project",
      messages: [],
      data: {},
    });

    expect(result).toEqual(mockProject);
    expect(prisma.project.create).toHaveBeenCalledWith({
      data: {
        name: "My Project",
        userId: "user-1",
        messages: "[]",
        data: "{}",
      },
    });
  });

  test("serializes messages and data as JSON strings", async () => {
    (getSession as any).mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
    });
    (prisma.project.create as any).mockResolvedValue({});

    const messages = [{ id: "1", role: "user", content: "Hello" }];
    const data = { "/App.jsx": { type: "file", content: "code" } };

    await createProject({ name: "Test", messages, data });

    const createCall = (prisma.project.create as any).mock.calls[0][0];
    expect(createCall.data.messages).toBe(JSON.stringify(messages));
    expect(createCall.data.data).toBe(JSON.stringify(data));
  });

  test("throws error when not authenticated", async () => {
    (getSession as any).mockResolvedValue(null);

    await expect(
      createProject({ name: "Test", messages: [], data: {} })
    ).rejects.toThrow("Unauthorized");

    expect(prisma.project.create).not.toHaveBeenCalled();
  });
});

// --- getProject ---

describe("getProject", () => {
  test("returns parsed project data for authenticated user", async () => {
    (getSession as any).mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
    });

    const now = new Date();
    (prisma.project.findUnique as any).mockResolvedValue({
      id: "proj-1",
      name: "My Project",
      messages: '[{"id":"1","role":"user"}]',
      data: '{"key":"value"}',
      createdAt: now,
      updatedAt: now,
    });

    const result = await getProject("proj-1");

    expect(result).toEqual({
      id: "proj-1",
      name: "My Project",
      messages: [{ id: "1", role: "user" }],
      data: { key: "value" },
      createdAt: now,
      updatedAt: now,
    });
  });

  test("scopes query to authenticated user", async () => {
    (getSession as any).mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
    });
    (prisma.project.findUnique as any).mockResolvedValue(null);

    await expect(getProject("proj-1")).rejects.toThrow("Project not found");

    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: "proj-1", userId: "user-1" },
    });
  });

  test("throws error when not authenticated", async () => {
    (getSession as any).mockResolvedValue(null);

    await expect(getProject("proj-1")).rejects.toThrow("Unauthorized");
  });

  test("throws error when project does not exist", async () => {
    (getSession as any).mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
    });
    (prisma.project.findUnique as any).mockResolvedValue(null);

    await expect(getProject("nonexistent")).rejects.toThrow(
      "Project not found"
    );
  });

  test("parses messages and data from JSON strings", async () => {
    (getSession as any).mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
    });

    const complexMessages = [
      { id: "1", role: "user", parts: [{ type: "text", text: "Hello" }] },
      { id: "2", role: "assistant", parts: [{ type: "text", text: "Hi" }] },
    ];
    const complexData = {
      "/App.jsx": { type: "file", content: "export default App" },
    };

    (prisma.project.findUnique as any).mockResolvedValue({
      id: "proj-1",
      name: "Complex",
      messages: JSON.stringify(complexMessages),
      data: JSON.stringify(complexData),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await getProject("proj-1");

    expect(result.messages).toEqual(complexMessages);
    expect(result.data).toEqual(complexData);
  });
});

// --- getProjects ---

describe("getProjects", () => {
  test("returns list of projects for authenticated user", async () => {
    (getSession as any).mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
    });

    const mockProjects = [
      {
        id: "proj-2",
        name: "Newer Project",
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-01"),
      },
      {
        id: "proj-1",
        name: "Older Project",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ];
    (prisma.project.findMany as any).mockResolvedValue(mockProjects);

    const result = await getProjects();

    expect(result).toEqual(mockProjects);
    expect(result).toHaveLength(2);
  });

  test("orders projects by updatedAt descending", async () => {
    (getSession as any).mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
    });
    (prisma.project.findMany as any).mockResolvedValue([]);

    await getProjects();

    expect(prisma.project.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
  });

  test("throws error when not authenticated", async () => {
    (getSession as any).mockResolvedValue(null);

    await expect(getProjects()).rejects.toThrow("Unauthorized");
  });

  test("returns empty array when user has no projects", async () => {
    (getSession as any).mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
    });
    (prisma.project.findMany as any).mockResolvedValue([]);

    const result = await getProjects();

    expect(result).toEqual([]);
  });

  test("selects only summary fields", async () => {
    (getSession as any).mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
    });
    (prisma.project.findMany as any).mockResolvedValue([]);

    await getProjects();

    const call = (prisma.project.findMany as any).mock.calls[0][0];
    expect(call.select).toEqual({
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    });
    // Should NOT select messages or data (heavy fields)
    expect(call.select.messages).toBeUndefined();
    expect(call.select.data).toBeUndefined();
  });
});
