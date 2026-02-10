import { test, expect, describe, vi, beforeEach, afterEach } from "vitest";
import { MockLanguageModel, getLanguageModel } from "@/lib/provider";
import type { LanguageModelV2Message } from "@ai-sdk/provider";

// Mock the anthropic provider
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn((model: string) => ({
    specificationVersion: "v2",
    provider: "anthropic",
    modelId: model,
  })),
}));

describe("MockLanguageModel", () => {
  let model: MockLanguageModel;

  beforeEach(() => {
    model = new MockLanguageModel("mock-test");
  });

  test("implements LanguageModelV2 interface", () => {
    expect(model.specificationVersion).toBe("v2");
    expect(model.provider).toBe("mock");
    expect(model.modelId).toBe("mock-test");
    expect(model.supportedUrls).toEqual({});
  });

  // --- doGenerate ---

  describe("doGenerate", () => {
    test("generates text and tool calls on initial request", async () => {
      const messages: LanguageModelV2Message[] = [
        {
          role: "user",
          content: [{ type: "text", text: "Create a counter component" }],
        },
      ];

      const result = await model.doGenerate({ prompt: messages } as any);

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.finishReason).toBe("tool-calls");
      expect(result.usage.inputTokens).toBeDefined();
      expect(result.usage.outputTokens).toBeDefined();
      expect(result.warnings).toEqual([]);

      // Should include text and a tool call to create App.jsx
      const textPart = result.content.find((p: any) => p.type === "text");
      expect(textPart).toBeDefined();

      const toolCall = result.content.find((p: any) => p.type === "tool-call");
      expect(toolCall).toBeDefined();
      expect(toolCall.toolName).toBe("str_replace_editor");
    }, 15000);

    test("detects form component type from prompt", async () => {
      const messages: LanguageModelV2Message[] = [
        {
          role: "user",
          content: [{ type: "text", text: "Create a contact form" }],
        },
      ];

      const result = await model.doGenerate({ prompt: messages } as any);

      const toolCall = result.content.find((p: any) => p.type === "tool-call");
      expect(toolCall.input.path).toBe("/App.jsx");
      // App.jsx should reference the form component
      expect(toolCall.input.file_text).toContain("ContactForm");
    });

    test("detects card component type from prompt", async () => {
      const messages: LanguageModelV2Message[] = [
        {
          role: "user",
          content: [{ type: "text", text: "Make a card component" }],
        },
      ];

      const result = await model.doGenerate({ prompt: messages } as any);

      const toolCall = result.content.find((p: any) => p.type === "tool-call");
      expect(toolCall.input.file_text).toContain("Card");
    });

    test("defaults to counter component type", async () => {
      const messages: LanguageModelV2Message[] = [
        {
          role: "user",
          content: [{ type: "text", text: "Build something cool" }],
        },
      ];

      const result = await model.doGenerate({ prompt: messages } as any);

      const toolCall = result.content.find((p: any) => p.type === "tool-call");
      expect(toolCall.input.file_text).toContain("Counter");
    });

    test("generates final summary when toolMessageCount >= 3", async () => {
      const messages: LanguageModelV2Message[] = [
        {
          role: "user",
          content: [{ type: "text", text: "Create a counter" }],
        },
        { role: "tool", content: [{ type: "tool-result", toolCallId: "c1", toolName: "str_replace_editor", result: "ok" }] },
        { role: "tool", content: [{ type: "tool-result", toolCallId: "c2", toolName: "str_replace_editor", result: "ok" }] },
        { role: "tool", content: [{ type: "tool-result", toolCallId: "c3", toolName: "str_replace_editor", result: "ok" }] },
      ];

      const result = await model.doGenerate({ prompt: messages } as any);

      expect(result.finishReason).toBe("stop");
      const textPart = result.content.find((p: any) => p.type === "text");
      expect(textPart.text).toContain("Perfect!");
      expect(textPart.text).toContain("Counter");
      // No tool call in final step
      const toolCall = result.content.find((p: any) => p.type === "tool-call");
      expect(toolCall).toBeUndefined();
    }, 15000);

    test("returns empty string when no user message found", async () => {
      const messages: LanguageModelV2Message[] = [
        { role: "system", content: "You are a helpful assistant." },
      ];

      const result = await model.doGenerate({ prompt: messages } as any);

      // Should still produce output (defaults to counter)
      expect(result.content.length).toBeGreaterThan(0);
    });
  });

  // --- doStream ---

  describe("doStream", () => {
    test("returns a readable stream", async () => {
      const messages: LanguageModelV2Message[] = [
        {
          role: "user",
          content: [{ type: "text", text: "Create a counter" }],
        },
      ];

      const result = await model.doStream({ prompt: messages } as any);

      expect(result.stream).toBeInstanceOf(ReadableStream);
    });

    test("stream emits text-start, text-delta, text-end, and finish parts", async () => {
      const messages: LanguageModelV2Message[] = [
        {
          role: "user",
          content: [{ type: "text", text: "Create a counter" }],
        },
      ];

      const result = await model.doStream({ prompt: messages } as any);
      const reader = result.stream.getReader();
      const parts: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }

      const types = parts.map((p) => p.type);
      expect(types).toContain("text-start");
      expect(types).toContain("text-delta");
      expect(types).toContain("text-end");
      expect(types).toContain("finish");
    });

    test("stream emits tool-input parts for tool call steps", async () => {
      const messages: LanguageModelV2Message[] = [
        {
          role: "user",
          content: [{ type: "text", text: "Create a counter" }],
        },
      ];

      const result = await model.doStream({ prompt: messages } as any);
      const reader = result.stream.getReader();
      const parts: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }

      const types = parts.map((p) => p.type);
      expect(types).toContain("tool-input-start");
      expect(types).toContain("tool-input-delta");
      expect(types).toContain("tool-input-end");

      const toolStart = parts.find((p) => p.type === "tool-input-start");
      expect(toolStart.toolName).toBe("str_replace_editor");
    });

    test("stream finish has correct finishReason for tool calls", async () => {
      const messages: LanguageModelV2Message[] = [
        {
          role: "user",
          content: [{ type: "text", text: "Create a counter" }],
        },
      ];

      const result = await model.doStream({ prompt: messages } as any);
      const reader = result.stream.getReader();
      const parts: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }

      const finish = parts.find((p) => p.type === "finish");
      expect(finish.finishReason).toBe("tool-calls");
      expect(finish.usage).toBeDefined();
    });

    test("final step stream finishes with stop reason", async () => {
      const messages: LanguageModelV2Message[] = [
        {
          role: "user",
          content: [{ type: "text", text: "Create a counter" }],
        },
        { role: "tool", content: [{ type: "tool-result", toolCallId: "c1", toolName: "t", result: "ok" }] },
        { role: "tool", content: [{ type: "tool-result", toolCallId: "c2", toolName: "t", result: "ok" }] },
        { role: "tool", content: [{ type: "tool-result", toolCallId: "c3", toolName: "t", result: "ok" }] },
      ];

      const result = await model.doStream({ prompt: messages } as any);
      const reader = result.stream.getReader();
      const parts: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
      }

      const finish = parts.find((p) => p.type === "finish");
      expect(finish.finishReason).toBe("stop");
    }, 15000);
  });
});

describe("getLanguageModel", () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  test("returns MockLanguageModel when no API key", () => {
    delete process.env.ANTHROPIC_API_KEY;

    const model = getLanguageModel();

    expect(model).toBeInstanceOf(MockLanguageModel);
  });

  test("returns MockLanguageModel when API key is empty string", () => {
    process.env.ANTHROPIC_API_KEY = "";

    const model = getLanguageModel();

    expect(model).toBeInstanceOf(MockLanguageModel);
  });

  test("returns MockLanguageModel when API key is whitespace", () => {
    process.env.ANTHROPIC_API_KEY = "   ";

    const model = getLanguageModel();

    expect(model).toBeInstanceOf(MockLanguageModel);
  });

  test("returns anthropic model when API key is set", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";

    const model = getLanguageModel();

    expect(model).not.toBeInstanceOf(MockLanguageModel);
    expect((model as any).modelId).toBe("claude-haiku-4-5");
  });
});
