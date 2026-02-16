import { anthropic } from "@ai-sdk/anthropic";
import type {
  LanguageModelV2,
  LanguageModelV2StreamPart,
  LanguageModelV2Message,
  LanguageModelV2CallOptions,
} from "@ai-sdk/provider";

const MODEL = "claude-haiku-4-5";

export class MockLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = "v2" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly supportedUrls: Record<string, RegExp[]> = {};

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(messages: LanguageModelV2Message[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          const textParts = content
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text);
          return textParts.join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private getLastToolResult(messages: LanguageModelV2Message[]): any {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "tool") {
        const content = messages[i].content;
        if (Array.isArray(content) && content.length > 0) {
          return content[0];
        }
      }
    }
    return null;
  }

  private async *generateMockStream(
    messages: LanguageModelV2Message[],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV2StreamPart> {
    const toolMessageCount = messages.filter((m) => m.role === "tool").length;

    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card")) {
      componentType = "card";
      componentName = "Card";
    }

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;
      const textId = "text_1";
      yield { type: "text-start", id: textId };
      for (const char of text) {
        yield { type: "text-delta", id: textId, delta: char };
        await this.delay(25);
      }
      yield { type: "text-end", id: textId };

      const toolCallId = "call_1";
      const toolArgs1 = {
        command: "create",
        path: `/components/${componentName}.jsx`,
        file_text: this.getComponentCode(componentType),
      };
      yield {
        type: "tool-input-start",
        id: toolCallId,
        toolName: "str_replace_editor",
      };
      yield { type: "tool-input-delta", id: toolCallId, delta: JSON.stringify(toolArgs1) };
      yield { type: "tool-input-end", id: toolCallId };
      yield {
        type: "tool-call",
        toolCallId,
        toolName: "str_replace_editor",
        input: JSON.stringify(toolArgs1),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          inputTokens: 50,
          outputTokens: 30,
          totalTokens: 80,
        },
      };
      return;
    }

    // Step 2: Enhance component
    if (toolMessageCount === 2) {
      const text = `Now let me enhance the component with better styling.`;
      const textId = "text_2";
      yield { type: "text-start", id: textId };
      for (const char of text) {
        yield { type: "text-delta", id: textId, delta: char };
        await this.delay(25);
      }
      yield { type: "text-end", id: textId };

      const toolCallId = "call_2";
      const toolArgs2 = {
        command: "str_replace",
        path: `/components/${componentName}.jsx`,
        old_str: this.getOldStringForReplace(componentType),
        new_str: this.getNewStringForReplace(componentType),
      };
      yield {
        type: "tool-input-start",
        id: toolCallId,
        toolName: "str_replace_editor",
      };
      yield { type: "tool-input-delta", id: toolCallId, delta: JSON.stringify(toolArgs2) };
      yield { type: "tool-input-end", id: toolCallId };
      yield {
        type: "tool-call",
        toolCallId,
        toolName: "str_replace_editor",
        input: JSON.stringify(toolArgs2),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          inputTokens: 50,
          outputTokens: 30,
          totalTokens: 80,
        },
      };
      return;
    }

    // Step 3: Create App.jsx
    if (toolMessageCount === 0) {
      const text = `This is a static response. You can place an Anthropic API key in the .env file to use the Anthropic API for component generation. Let me create an App.jsx file to display the component.`;
      const textId = "text_3";
      yield { type: "text-start", id: textId };
      for (const char of text) {
        yield { type: "text-delta", id: textId, delta: char };
        await this.delay(15);
      }
      yield { type: "text-end", id: textId };

      const toolCallId = "call_3";
      const toolArgs3 = {
        command: "create",
        path: "/App.jsx",
        file_text: this.getAppCode(componentName),
      };
      yield {
        type: "tool-input-start",
        id: toolCallId,
        toolName: "str_replace_editor",
      };
      yield { type: "tool-input-delta", id: toolCallId, delta: JSON.stringify(toolArgs3) };
      yield { type: "tool-input-end", id: toolCallId };
      yield {
        type: "tool-call",
        toolCallId,
        toolName: "str_replace_editor",
        input: JSON.stringify(toolArgs3),
      };

      yield {
        type: "finish",
        finishReason: "tool-calls",
        usage: {
          inputTokens: 50,
          outputTokens: 30,
          totalTokens: 80,
        },
      };
      return;
    }

    // Step 4: Final summary (no tool call)
    if (toolMessageCount >= 3) {
      const text = `Perfect! I've created:

1. **${componentName}.jsx** - A fully-featured ${componentType} component
2. **App.jsx** - The main app file that displays the component

The component is now ready to use. You can see the preview on the right side of the screen.`;

      const textId = "text_4";
      yield { type: "text-start", id: textId };
      for (const char of text) {
        yield { type: "text-delta", id: textId, delta: char };
        await this.delay(30);
      }
      yield { type: "text-end", id: textId };

      yield {
        type: "finish",
        finishReason: "stop",
        usage: {
          inputTokens: 50,
          outputTokens: 50,
          totalTokens: 100,
        },
      };
      return;
    }
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <div className="relative max-w-md mx-auto p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/20">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 rounded-t-2xl" />
      <p className="text-xs font-medium tracking-widest uppercase text-violet-400 mb-1">Get in touch</p>
      <h2 className="text-2xl font-light tracking-tight text-white mb-8">Contact Us</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-xs font-medium tracking-wide uppercase text-white/50 mb-2">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-xs font-medium tracking-wide uppercase text-white/50 mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-xs font-medium tracking-wide uppercase text-white/50 mb-2">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all resize-none"
            placeholder="How can we help?"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02] transition-all duration-200"
        >
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React from 'react';

const Card = ({
  title = "Welcome to Our Service",
  description = "Discover amazing features and capabilities that will transform your experience.",
  imageUrl,
  actions
}) => {
  return (
    <div className="relative rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/20 overflow-hidden group hover:-translate-y-1 transition-all duration-300">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        />
      )}
      <div className="p-8">
        <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
        <p className="text-white/60 leading-relaxed mb-6">{description}</p>
        {actions && (
          <div className="mt-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(prev => prev + 1);
  };

  const decrement = () => {
    setCount(prev => prev - 1);
  };

  const reset = () => {
    setCount(0);
  };

  return (
    <div className="relative flex flex-col items-center p-10 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/20">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 rounded-t-2xl" />
      <p className="text-xs font-medium tracking-widest uppercase text-violet-400 mb-2">Counter</p>
      <div className="text-7xl font-extralight tracking-tight text-white mb-8 tabular-nums">{count}</div>
      <div className="flex gap-4">
        <button
          onClick={decrement}
          className="px-6 py-3 rounded-xl bg-white/10 text-white/80 font-medium hover:bg-white/20 hover:text-white transition-all duration-200 hover:scale-105"
        >
          &minus; Decrease
        </button>
        <button
          onClick={reset}
          className="px-6 py-3 rounded-xl ring-1 ring-white/20 text-white/50 font-medium hover:ring-white/40 hover:text-white/70 transition-all duration-200"
        >
          Reset
        </button>
        <button
          onClick={increment}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium hover:shadow-lg hover:shadow-violet-500/25 hover:scale-105 transition-all duration-200"
        >
          Increase +
        </button>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getOldStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);";
      case "card":
        return '      <div className="p-8">';
      default:
        return "      <p className=\"text-xs font-medium tracking-widest uppercase text-violet-400 mb-2\">Counter</p>";
    }
  }

  private getNewStringForReplace(componentType: string): string {
    switch (componentType) {
      case "form":
        return "    console.log('Form submitted:', formData);\n    alert('Thank you! We\\'ll get back to you soon.');";
      case "card":
        return '      <div className="p-8 bg-white/[0.02]">';
      default:
        return "      <div className=\"flex items-center gap-2 mb-2\">\n        <div className=\"w-2 h-2 rounded-full bg-violet-400 animate-pulse\" />\n        <p className=\"text-xs font-medium tracking-widest uppercase text-violet-400\">Counter</p>\n      </div>";
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <Card
          title="Amazing Product"
          description="This is a fantastic product that will change your life. Experience the difference today!"
          actions={
            <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-medium hover:shadow-lg hover:shadow-violet-500/25 hover:scale-105 transition-all duration-200">
              Learn More
            </button>
          }
        />
      </div>
    </div>
  );
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <${componentName} />
      </div>
    </div>
  );
}`;
  }

  async doGenerate(
    options: LanguageModelV2CallOptions
  ): Promise<Awaited<ReturnType<LanguageModelV2["doGenerate"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);

    const parts: LanguageModelV2StreamPart[] = [];
    for await (const part of this.generateMockStream(
      options.prompt,
      userPrompt
    )) {
      parts.push(part);
    }

    const textParts = parts
      .filter((p) => p.type === "text-delta")
      .map((p) => (p as any).delta)
      .join("");

    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => {
        const tc = p as any;
        return {
          type: "tool-call" as const,
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          input: tc.input,
        };
      });

    const finishPart = parts.find((p) => p.type === "finish") as any;
    const finishReason = finishPart?.finishReason || "stop";

    const content: any[] = [];
    if (textParts) {
      content.push({ type: "text", text: textParts });
    }
    content.push(...toolCalls);

    return {
      content,
      finishReason: finishReason as any,
      usage: {
        inputTokens: 100,
        outputTokens: 200,
        totalTokens: 300,
      },
      warnings: [],
    };
  }

  async doStream(
    options: LanguageModelV2CallOptions
  ): Promise<Awaited<ReturnType<LanguageModelV2["doStream"]>>> {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      async start(controller) {
        try {
          const generator = self.generateMockStream(options.prompt, userPrompt);
          for await (const chunk of generator) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return {
      stream,
    };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.log("No ANTHROPIC_API_KEY found, using mock provider");
    return new MockLanguageModel("mock-claude-sonnet-4-0");
  }

  return anthropic(MODEL);
}
