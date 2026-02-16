"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useFileSystem } from "./file-system-context";
import { setHasAnonWork } from "@/lib/anon-work-tracker";

interface ChatContextProps {
  projectId?: string;
  initialMessages?: UIMessage[];
}

interface ChatContextType {
  messages: UIMessage[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: string;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Stable reference to avoid re-renders when no initial messages are provided
const EMPTY_MESSAGES: UIMessage[] = [];

export function ChatProvider({
  children,
  projectId,
  initialMessages,
}: ChatContextProps & { children: ReactNode }) {
  const { fileSystem, handleToolCall } = useFileSystem();
  const [input, setInput] = useState("");
  const processedToolCalls = useRef(new Set<string>());

  // Use a ref for initial messages so the value passed to useAIChat never changes
  // between renders (prevents useAIChat from resetting during FileSystemProvider re-renders).
  const initialMessagesRef = useRef(initialMessages ?? EMPTY_MESSAGES);

  // Memoize transport so it's not recreated on every render.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          files: fileSystem.serialize(),
          projectId,
        }),
      }),
    [fileSystem, projectId]
  );

  const {
    messages,
    sendMessage,
    status,
  } = useAIChat({
    transport,
    messages: initialMessagesRef.current,
  });

  // Process tool calls from streamed messages to update the client-side file system.
  // In AI SDK v5, server-executed tools don't trigger onToolCall on the client
  // (guarded by providerExecuted flag). Tool parts appear with type "tool-{name}"
  // (e.g. "tool-str_replace_editor") and properties directly on the part object.
  useEffect(() => {
    for (const message of messages) {
      if (message.role !== "assistant" || !message.parts) continue;
      for (const part of message.parts) {
        const p = part as any;
        // Tool parts have type "tool-{toolName}" or "dynamic-tool"
        const isToolPart =
          (typeof p.type === "string" && p.type.startsWith("tool-")) ||
          p.type === "dynamic-tool";
        if (!isToolPart || !p.toolCallId) continue;

        const state = p.state as string;
        if (
          (state === "input-available" || state === "output-available") &&
          !processedToolCalls.current.has(p.toolCallId)
        ) {
          processedToolCalls.current.add(p.toolCallId);
          const toolName =
            p.type === "dynamic-tool"
              ? p.toolName
              : (p.type as string).slice(5); // strip "tool-" prefix
          const args =
            typeof p.input === "string" ? JSON.parse(p.input) : p.input;
          handleToolCall({ toolName, args });
        }
      }
    }
  }, [messages, handleToolCall]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!input.trim()) return;
      sendMessage({ text: input });
      setInput("");
    },
    [input, sendMessage]
  );

  // Track anonymous work
  useEffect(() => {
    if (!projectId && messages.length > 0) {
      setHasAnonWork(messages, fileSystem.serialize());
    }
  }, [messages, fileSystem, projectId]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        input,
        handleInputChange,
        handleSubmit,
        status,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
