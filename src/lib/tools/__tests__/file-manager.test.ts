import { test, expect, describe, beforeEach } from "vitest";
import { VirtualFileSystem } from "@/lib/file-system";
import { buildFileManagerTool } from "@/lib/tools/file-manager";

describe("buildFileManagerTool", () => {
  let fileSystem: VirtualFileSystem;
  let tool: ReturnType<typeof buildFileManagerTool>;

  beforeEach(() => {
    fileSystem = new VirtualFileSystem();
    tool = buildFileManagerTool(fileSystem);
  });

  // --- rename command ---

  describe("rename command", () => {
    test("renames a file successfully", async () => {
      fileSystem.createFileWithParents("/old.js", "content");

      const result = await tool.execute({
        command: "rename",
        path: "/old.js",
        new_path: "/new.js",
      });

      expect(result).toEqual({
        success: true,
        message: "Successfully renamed /old.js to /new.js",
      });
      expect(fileSystem.readFile("/new.js")).toBe("content");
      expect(fileSystem.readFile("/old.js")).toBeNull();
    });

    test("moves a file to a new directory", async () => {
      fileSystem.createFileWithParents("/src/app.js", "app code");

      const result = await tool.execute({
        command: "rename",
        path: "/src/app.js",
        new_path: "/dist/app.js",
      });

      expect(result.success).toBe(true);
      expect(fileSystem.readFile("/dist/app.js")).toBe("app code");
    });

    test("returns error when new_path is missing", async () => {
      fileSystem.createFileWithParents("/file.js", "content");

      const result = await tool.execute({
        command: "rename",
        path: "/file.js",
      });

      expect(result).toEqual({
        success: false,
        error: "new_path is required for rename command",
      });
    });

    test("returns error when source file does not exist", async () => {
      const result = await tool.execute({
        command: "rename",
        path: "/nonexistent.js",
        new_path: "/new.js",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to rename");
    });
  });

  // --- delete command ---

  describe("delete command", () => {
    test("deletes a file successfully", async () => {
      fileSystem.createFileWithParents("/temp.js", "temporary");

      const result = await tool.execute({
        command: "delete",
        path: "/temp.js",
      });

      expect(result).toEqual({
        success: true,
        message: "Successfully deleted /temp.js",
      });
      expect(fileSystem.readFile("/temp.js")).toBeNull();
    });

    test("returns error when file does not exist", async () => {
      const result = await tool.execute({
        command: "delete",
        path: "/nonexistent.js",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to delete");
    });

    test("deletes a nested file", async () => {
      fileSystem.createFileWithParents("/deep/nested/file.js", "content");

      const result = await tool.execute({
        command: "delete",
        path: "/deep/nested/file.js",
      });

      expect(result.success).toBe(true);
      expect(fileSystem.readFile("/deep/nested/file.js")).toBeNull();
    });
  });
});
