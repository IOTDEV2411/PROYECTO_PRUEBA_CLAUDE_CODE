import { Loader2 } from "lucide-react";

interface ToolInvocation {
  toolName: string;
  args: Record<string, unknown>;
  state: string;
  result?: unknown;
}

interface ToolCallIndicatorProps {
  toolInvocation: ToolInvocation;
}

function getFileName(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

function getToolLabel(toolInvocation: ToolInvocation): string {
  const { toolName, args, state } = toolInvocation;
  const done = state === "result";
  const path = typeof args.path === "string" ? args.path : "";
  const fileName = getFileName(path);

  if (toolName === "str_replace_editor") {
    const command = args.command as string;
    switch (command) {
      case "create":
        return done ? `Created ${fileName}` : `Creating ${fileName}`;
      case "str_replace":
      case "insert":
        return done ? `Edited ${fileName}` : `Editing ${fileName}`;
      case "view":
        return done ? `Viewed ${fileName}` : `Viewing ${fileName}`;
      default:
        return done ? `Modified ${fileName}` : `Modifying ${fileName}`;
    }
  }

  if (toolName === "file_manager") {
    const command = args.command as string;
    switch (command) {
      case "rename":
        return done ? `Renamed ${fileName}` : `Renaming ${fileName}`;
      case "delete":
        return done ? `Deleted ${fileName}` : `Deleting ${fileName}`;
      default:
        return done ? `Modified ${fileName}` : `Modifying ${fileName}`;
    }
  }

  return toolName;
}

export function ToolCallIndicator({ toolInvocation }: ToolCallIndicatorProps) {
  const done = toolInvocation.state === "result" && toolInvocation.result;
  const label = getToolLabel(toolInvocation);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {done ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}

export { getToolLabel };
