import { test, expect, describe, beforeEach } from "vitest";
import { VirtualFileSystem } from "@/lib/file-system";
import { buildStrReplaceTool } from "@/lib/tools/str-replace";

describe("buildStrReplaceTool", () => {
  let fileSystem: VirtualFileSystem;
  let tool: ReturnType<typeof buildStrReplaceTool>;

  beforeEach(() => {
    fileSystem = new VirtualFileSystem();
    tool = buildStrReplaceTool(fileSystem);
  });

  test("returns tool with correct id and parameters schema", () => {
    expect(tool.id).toBe("str_replace_editor");
    expect(tool.parameters).toBeDefined();
  });

  // --- create command ---

  describe("create command", () => {
    test("creates a new file with content", async () => {
      const result = await tool.execute({
        command: "create",
        path: "/App.jsx",
        file_text: "export default function App() { return <div>Hello</div>; }",
      });

      expect(result).toContain("App.jsx");
      const file = fileSystem.readFile("/App.jsx");
      expect(file).toBe("export default function App() { return <div>Hello</div>; }");
    });

    test("creates file with empty content when file_text is omitted", async () => {
      await tool.execute({
        command: "create",
        path: "/empty.js",
      });

      const file = fileSystem.readFile("/empty.js");
      expect(file).toBe("");
    });

    test("creates parent directories automatically", async () => {
      await tool.execute({
        command: "create",
        path: "/components/ui/Button.jsx",
        file_text: "export const Button = () => <button>Click</button>;",
      });

      const file = fileSystem.readFile("/components/ui/Button.jsx");
      expect(file).toBe("export const Button = () => <button>Click</button>;");
    });
  });

  // --- view command ---

  describe("view command", () => {
    test("views an existing file", async () => {
      fileSystem.createFileWithParents("/test.js", "line1\nline2\nline3");

      const result = await tool.execute({
        command: "view",
        path: "/test.js",
      });

      expect(result).toContain("line1");
      expect(result).toContain("line2");
      expect(result).toContain("line3");
    });

    test("views a file with a specific range", async () => {
      fileSystem.createFileWithParents(
        "/test.js",
        "line1\nline2\nline3\nline4\nline5"
      );

      const result = await tool.execute({
        command: "view",
        path: "/test.js",
        view_range: [2, 4],
      });

      expect(result).toContain("line2");
      expect(result).toContain("line4");
    });

    test("returns error for non-existent file", async () => {
      const result = await tool.execute({
        command: "view",
        path: "/nonexistent.js",
      });

      expect(result).toContain("File not found");
    });
  });

  // --- str_replace command ---

  describe("str_replace command", () => {
    test("replaces text in a file", async () => {
      fileSystem.createFileWithParents(
        "/hello.js",
        'const greeting = "Hello World";'
      );

      const result = await tool.execute({
        command: "str_replace",
        path: "/hello.js",
        old_str: "Hello World",
        new_str: "Hello Universe",
      });

      const content = fileSystem.readFile("/hello.js");
      expect(content).toBe('const greeting = "Hello Universe";');
    });

    test("handles missing old_str gracefully", async () => {
      fileSystem.createFileWithParents("/file.js", "some content");

      const result = await tool.execute({
        command: "str_replace",
        path: "/file.js",
        new_str: "replacement",
      });

      // Should try to replace empty string
      expect(result).toBeDefined();
    });

    test("handles missing new_str gracefully", async () => {
      fileSystem.createFileWithParents("/file.js", "some content");

      const result = await tool.execute({
        command: "str_replace",
        path: "/file.js",
        old_str: "some",
      });

      expect(result).toBeDefined();
    });

    test("returns error when file does not exist", async () => {
      const result = await tool.execute({
        command: "str_replace",
        path: "/missing.js",
        old_str: "foo",
        new_str: "bar",
      });

      expect(result).toContain("Error");
    });

    test("returns error when old_str is not found", async () => {
      fileSystem.createFileWithParents("/file.js", "actual content");

      const result = await tool.execute({
        command: "str_replace",
        path: "/file.js",
        old_str: "nonexistent text",
        new_str: "replacement",
      });

      expect(result).toContain("Error");
    });
  });

  // --- insert command ---

  describe("insert command", () => {
    test("inserts text at a specific line", async () => {
      fileSystem.createFileWithParents("/file.js", "line1\nline2\nline3");

      await tool.execute({
        command: "insert",
        path: "/file.js",
        insert_line: 1,
        new_str: "inserted line",
      });

      const content = fileSystem.readFile("/file.js");
      expect(content).toContain("inserted line");
    });

    test("inserts at line 0 when insert_line is omitted", async () => {
      fileSystem.createFileWithParents("/file.js", "original");

      await tool.execute({
        command: "insert",
        path: "/file.js",
        new_str: "prepended",
      });

      const content = fileSystem.readFile("/file.js");
      expect(content).toContain("prepended");
    });

    test("handles missing new_str by inserting empty string", async () => {
      fileSystem.createFileWithParents("/file.js", "content");

      const result = await tool.execute({
        command: "insert",
        path: "/file.js",
        insert_line: 0,
      });

      expect(result).toBeDefined();
    });
  });

  // --- undo_edit command ---

  describe("undo_edit command", () => {
    test("returns unsupported error message", async () => {
      const result = await tool.execute({
        command: "undo_edit",
        path: "/file.js",
      });

      expect(result).toContain("Error");
      expect(result).toContain("undo_edit");
      expect(result).toContain("not supported");
    });
  });
});
