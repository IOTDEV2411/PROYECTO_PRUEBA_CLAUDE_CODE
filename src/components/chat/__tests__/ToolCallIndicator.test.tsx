import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallIndicator, getToolLabel } from "../ToolCallIndicator";

afterEach(() => {
  cleanup();
});

// --- getToolLabel unit tests ---

test("getToolLabel returns 'Created' for completed str_replace_editor create", () => {
  expect(
    getToolLabel({
      toolName: "str_replace_editor",
      args: { command: "create", path: "/App.jsx" },
      state: "result",
      result: "Success",
    })
  ).toBe("Created App.jsx");
});

test("getToolLabel returns 'Creating' for pending str_replace_editor create", () => {
  expect(
    getToolLabel({
      toolName: "str_replace_editor",
      args: { command: "create", path: "/components/Card.jsx" },
      state: "pending",
    })
  ).toBe("Creating Card.jsx");
});

test("getToolLabel returns 'Edited' for completed str_replace", () => {
  expect(
    getToolLabel({
      toolName: "str_replace_editor",
      args: { command: "str_replace", path: "/App.jsx" },
      state: "result",
      result: "Success",
    })
  ).toBe("Edited App.jsx");
});

test("getToolLabel returns 'Editing' for pending str_replace", () => {
  expect(
    getToolLabel({
      toolName: "str_replace_editor",
      args: { command: "str_replace", path: "/App.jsx" },
      state: "pending",
    })
  ).toBe("Editing App.jsx");
});

test("getToolLabel returns 'Edited' for completed insert", () => {
  expect(
    getToolLabel({
      toolName: "str_replace_editor",
      args: { command: "insert", path: "/utils.js" },
      state: "result",
      result: "Success",
    })
  ).toBe("Edited utils.js");
});

test("getToolLabel returns 'Viewed' for completed view", () => {
  expect(
    getToolLabel({
      toolName: "str_replace_editor",
      args: { command: "view", path: "/App.jsx" },
      state: "result",
      result: "file contents",
    })
  ).toBe("Viewed App.jsx");
});

test("getToolLabel returns 'Renamed' for completed file_manager rename", () => {
  expect(
    getToolLabel({
      toolName: "file_manager",
      args: { command: "rename", path: "/old.jsx" },
      state: "result",
      result: { success: true },
    })
  ).toBe("Renamed old.jsx");
});

test("getToolLabel returns 'Deleting' for pending file_manager delete", () => {
  expect(
    getToolLabel({
      toolName: "file_manager",
      args: { command: "delete", path: "/temp.jsx" },
      state: "pending",
    })
  ).toBe("Deleting temp.jsx");
});

test("getToolLabel returns 'Deleted' for completed file_manager delete", () => {
  expect(
    getToolLabel({
      toolName: "file_manager",
      args: { command: "delete", path: "/temp.jsx" },
      state: "result",
      result: { success: true },
    })
  ).toBe("Deleted temp.jsx");
});

test("getToolLabel extracts filename from nested path", () => {
  expect(
    getToolLabel({
      toolName: "str_replace_editor",
      args: { command: "create", path: "/components/ui/Button.jsx" },
      state: "result",
      result: "Success",
    })
  ).toBe("Created Button.jsx");
});

test("getToolLabel falls back to toolName for unknown tools", () => {
  expect(
    getToolLabel({
      toolName: "unknown_tool",
      args: {},
      state: "result",
      result: "done",
    })
  ).toBe("unknown_tool");
});

test("getToolLabel handles missing path gracefully", () => {
  expect(
    getToolLabel({
      toolName: "str_replace_editor",
      args: { command: "create" },
      state: "result",
      result: "Success",
    })
  ).toBe("Created ");
});

// --- Component render tests ---

test("ToolCallIndicator shows green dot for completed tool call", () => {
  const { container } = render(
    <ToolCallIndicator
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Created App.jsx")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
});

test("ToolCallIndicator shows spinner for pending tool call", () => {
  const { container } = render(
    <ToolCallIndicator
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "pending",
      }}
    />
  );

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  expect(container.querySelector(".animate-spin")).not.toBeNull();
});
