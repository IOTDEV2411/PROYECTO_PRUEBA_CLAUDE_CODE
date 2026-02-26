import { test, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

// Mock child components to isolate toggle behavior
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <div>{children}</div>,
  useFileSystem: vi.fn(() => ({
    getAllFiles: vi.fn(() => new Map()),
    refreshTrigger: 0,
    selectedFile: null,
    setSelectedFile: vi.fn(),
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

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  ResizablePanel: ({ children }: any) => <div>{children}</div>,
  ResizableHandle: () => <div />,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

test("Preview tab is active by default", () => {
  render(<MainContent />);

  const previewTab = screen.getByRole("tab", { name: "Preview" });
  expect(previewTab).toHaveAttribute("aria-selected", "true");

  const codeTab = screen.getByRole("tab", { name: "Code" });
  expect(codeTab).toHaveAttribute("aria-selected", "false");
});

test("Preview panel is shown by default", () => {
  render(<MainContent />);

  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
  expect(screen.queryByTestId("file-tree")).toBeNull();
});

test("clicking Code tab shows code editor and file tree", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: "Code" });
  await user.click(codeTab);

  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.getByTestId("file-tree")).toBeDefined();
  expect(screen.queryByTestId("preview-frame")).toBeNull();
});

test("clicking Code tab updates aria-selected attributes", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: "Code" });
  await user.click(codeTab);

  expect(codeTab).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute(
    "aria-selected",
    "false"
  );
});

test("clicking Preview tab after Code tab restores preview", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: "Code" });
  await user.click(codeTab);

  expect(screen.getByTestId("code-editor")).toBeDefined();

  const previewTab = screen.getByRole("tab", { name: "Preview" });
  await user.click(previewTab);

  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});

test("tab toggles work correctly with multiple switches", async () => {
  const user = userEvent.setup();
  render(<MainContent />);

  const previewTab = screen.getByRole("tab", { name: "Preview" });
  const codeTab = screen.getByRole("tab", { name: "Code" });

  // Start: Preview is shown
  expect(screen.getByTestId("preview-frame")).toBeDefined();

  // Switch to Code
  await user.click(codeTab);
  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.queryByTestId("preview-frame")).toBeNull();

  // Switch back to Preview
  await user.click(previewTab);
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();

  // Switch to Code again
  await user.click(codeTab);
  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.queryByTestId("preview-frame")).toBeNull();
});

test("mousedown on Code tab triggers state change (iframe focus-stealing fix)", () => {
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: "Code" });

  // Simulate mousedown (which fires before click and handles iframe focus loss)
  codeTab.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

  // After mousedown, the code view should be active
  expect(screen.getByTestId("code-editor")).toBeDefined();
  expect(screen.queryByTestId("preview-frame")).toBeNull();
});

test("mousedown on Preview tab after Code tab restores preview", () => {
  render(<MainContent />);

  const codeTab = screen.getByRole("tab", { name: "Code" });
  codeTab.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  expect(screen.getByTestId("code-editor")).toBeDefined();

  const previewTab = screen.getByRole("tab", { name: "Preview" });
  previewTab.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  expect(screen.getByTestId("preview-frame")).toBeDefined();
  expect(screen.queryByTestId("code-editor")).toBeNull();
});
