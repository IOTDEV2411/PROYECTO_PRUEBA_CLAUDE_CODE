import { test, expect, vi, afterEach, beforeEach, describe } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

// Mock context providers
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <div>{children}</div>,
  useFileSystem: vi.fn(() => ({
    getAllFiles: vi.fn(() => new Map()),
    refreshTrigger: 0,
  })),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <div>{children}</div>,
  useChat: vi.fn(() => ({
    messages: [],
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    status: "idle",
  })),
}));

// Mock heavy child components
vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">Preview</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">FileTree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">CodeEditor</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">Actions</div>,
}));

// Mock react-resizable-panels
vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: any) => <div data-testid="resizable-group">{children}</div>,
  ResizablePanel: ({ children }: any) => <div data-testid="resizable-panel">{children}</div>,
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("MainContent toggle buttons", () => {
  test("renders with preview tab active by default", () => {
    render(<MainContent />);

    // Preview should be visible by default
    expect(screen.getByTestId("preview-frame")).toBeDefined();

    // Code editor should NOT be visible
    expect(screen.queryByTestId("code-editor")).toBeNull();
    expect(screen.queryByTestId("file-tree")).toBeNull();
  });

  test("clicking Code tab shows code editor and file tree", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    // Initially in preview mode
    expect(screen.getByTestId("preview-frame")).toBeDefined();

    // Click the Code tab
    const codeTab = screen.getByRole("tab", { name: "Code" });
    await user.click(codeTab);

    // Code editor should now be visible
    expect(screen.getByTestId("code-editor")).toBeDefined();
    expect(screen.getByTestId("file-tree")).toBeDefined();

    // Preview should no longer be visible
    expect(screen.queryByTestId("preview-frame")).toBeNull();
  });

  test("clicking Preview tab shows preview frame", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    // Switch to code first
    const codeTab = screen.getByRole("tab", { name: "Code" });
    await user.click(codeTab);

    // Verify code view is showing
    expect(screen.getByTestId("code-editor")).toBeDefined();

    // Click the Preview tab
    const previewTab = screen.getByRole("tab", { name: "Preview" });
    await user.click(previewTab);

    // Preview should now be visible
    expect(screen.getByTestId("preview-frame")).toBeDefined();

    // Code editor should no longer be visible
    expect(screen.queryByTestId("code-editor")).toBeNull();
  });

  test("can toggle back and forth between preview and code multiple times", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    const codeTab = screen.getByRole("tab", { name: "Code" });
    const previewTab = screen.getByRole("tab", { name: "Preview" });

    // Start: preview mode
    expect(screen.getByTestId("preview-frame")).toBeDefined();

    // Toggle to code
    await user.click(codeTab);
    expect(screen.getByTestId("code-editor")).toBeDefined();
    expect(screen.queryByTestId("preview-frame")).toBeNull();

    // Toggle back to preview
    await user.click(previewTab);
    expect(screen.getByTestId("preview-frame")).toBeDefined();
    expect(screen.queryByTestId("code-editor")).toBeNull();

    // Toggle to code again
    await user.click(codeTab);
    expect(screen.getByTestId("code-editor")).toBeDefined();
    expect(screen.queryByTestId("preview-frame")).toBeNull();

    // Toggle back to preview again
    await user.click(previewTab);
    expect(screen.getByTestId("preview-frame")).toBeDefined();
    expect(screen.queryByTestId("code-editor")).toBeNull();
  });

  test("Preview tab is selected/active initially", () => {
    render(<MainContent />);

    const previewTab = screen.getByRole("tab", { name: "Preview" });
    const codeTab = screen.getByRole("tab", { name: "Code" });

    // Radix UI sets aria-selected on the active tab
    expect(previewTab.getAttribute("aria-selected")).toBe("true");
    expect(codeTab.getAttribute("aria-selected")).toBe("false");
  });

  test("Code tab becomes active after clicking it", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    const codeTab = screen.getByRole("tab", { name: "Code" });
    await user.click(codeTab);

    const previewTab = screen.getByRole("tab", { name: "Preview" });
    expect(codeTab.getAttribute("aria-selected")).toBe("true");
    expect(previewTab.getAttribute("aria-selected")).toBe("false");
  });
});
