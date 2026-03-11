"use client";

import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { User, Bot, Loader2 } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ToolCallIndicator } from "./ToolCallIndicator";

const EXAMPLE_PROMPTS = [
  "A pricing card with a highlighted plan",
  "A login form with email and password",
  "A responsive navigation bar",
  "A data table with sorting",
  "A notification toast component",
  "A profile avatar with status badge",
];

interface MessageListProps {
  messages: UIMessage[];
  isLoading?: boolean;
  onPromptSelect?: (prompt: string) => void;
}

export function MessageList({ messages, isLoading, onPromptSelect }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600 mb-4 shadow-sm shadow-blue-200">
          <Bot className="h-6 w-6 text-white" />
        </div>
        <p className="text-neutral-900 font-semibold text-base mb-1.5">Generate React components with AI</p>
        <p className="text-neutral-500 text-sm max-w-xs mb-6">Describe what you want to build and I&apos;ll create it instantly</p>
        <div className="flex flex-wrap gap-2 justify-center max-w-xs">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onPromptSelect?.(prompt)}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-full transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-6">
      <div className="space-y-6 max-w-4xl mx-auto w-full">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-4",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0">
                <div className="w-9 h-9 rounded-lg bg-white border border-neutral-200 shadow-sm flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5 text-neutral-700" />
                </div>
              </div>
            )}
            
            <div className={cn(
              "flex flex-col gap-2 max-w-[85%]",
              message.role === "user" ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "rounded-xl px-4 py-3",
                message.role === "user" 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "bg-white text-neutral-900 border border-neutral-200 shadow-sm"
              )}>
                <div className="text-sm">
                  {message.parts && message.parts.length > 0 ? (
                    <>
                      {message.parts.map((part, partIndex) => {
                        switch (part.type) {
                          case "text":
                            return message.role === "user" ? (
                              <span key={partIndex} className="whitespace-pre-wrap">{part.text}</span>
                            ) : (
                              <MarkdownRenderer
                                key={partIndex}
                                content={part.text}
                                className="prose-sm"
                              />
                            );
                          case "reasoning":
                            return (
                              <div key={partIndex} className="mt-3 p-3 bg-white/50 rounded-md border border-neutral-200">
                                <span className="text-xs font-medium text-neutral-600 block mb-1">Reasoning</span>
                                <span className="text-sm text-neutral-700">{part.reasoning}</span>
                              </div>
                            );
                          case "source-url":
                            return (
                              <div key={partIndex} className="mt-2 text-xs text-neutral-500">
                                Source: {JSON.stringify(part.url)}
                              </div>
                            );
                          case "step-start":
                            return partIndex > 0 ? <hr key={partIndex} className="my-3 border-neutral-200" /> : null;
                          default: {
                            // AI SDK v5: tool parts have type "tool-{name}" or "dynamic-tool"
                            const pType = part.type as string;
                            if (pType.startsWith("tool-") || pType === "dynamic-tool") {
                              const p = part as any;
                              const toolName = pType === "dynamic-tool" ? p.toolName : pType.slice(5);
                              return (
                                <ToolCallIndicator
                                  key={partIndex}
                                  toolInvocation={{
                                    toolName,
                                    args: p.input || {},
                                    state: p.state === "output-available" ? "result" : p.state,
                                    result: p.output,
                                  }}
                                />
                              );
                            }
                            return null;
                          }
                        }
                      })}
                      {isLoading &&
                        message.role === "assistant" &&
                        messages.indexOf(message) === messages.length - 1 && (
                          <div className="flex items-center gap-2 mt-3 text-neutral-500">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-sm">Generating...</span>
                          </div>
                        )}
                    </>
                  ) : isLoading &&
                    message.role === "assistant" &&
                    messages.indexOf(message) === messages.length - 1 ? (
                    <div className="flex items-center gap-2 text-neutral-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-sm">Generating...</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            
            {message.role === "user" && (
              <div className="flex-shrink-0">
                <div className="w-9 h-9 rounded-lg bg-blue-600 shadow-sm flex items-center justify-center">
                  <User className="h-4.5 w-4.5 text-white" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}