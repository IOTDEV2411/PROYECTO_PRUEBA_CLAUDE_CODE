"use client";

import { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface MessageInputProps {
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export function MessageInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
}: MessageInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const isActive = !isLoading && !!input.trim();

  return (
    <form onSubmit={handleSubmit} className="relative px-3 py-3 bg-white border-t border-neutral-200/60">
      <div className="relative max-w-4xl mx-auto">
        <textarea
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Describe the React component you want to create..."
          disabled={isLoading}
          className="w-full min-h-[76px] max-h-[200px] pl-4 pr-14 py-3 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400/60 focus:bg-white transition-all placeholder:text-neutral-400 text-sm shadow-sm disabled:opacity-60"
          rows={3}
        />
        <button
          type="submit"
          disabled={!isActive}
          className={`absolute right-2.5 bottom-2.5 p-2 rounded-lg transition-all ${
            isActive
              ? 'bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200'
              : 'bg-neutral-100 cursor-not-allowed'
          }`}
        >
          <Send className={`h-3.5 w-3.5 transition-transform ${isActive ? 'text-white translate-x-0 -translate-y-0 hover:translate-x-0.5 hover:-translate-y-0.5' : 'text-neutral-400'}`} />
        </button>
      </div>
      <p className="text-[11px] text-neutral-400 text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
    </form>
  );
}