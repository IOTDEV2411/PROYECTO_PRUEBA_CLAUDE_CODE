"use client";

import { useState } from "react";
import { FileNode } from "@/lib/file-system";
import { useFileSystem } from "@/lib/contexts/file-system-context";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FileTreeNodeProps {
  node: FileNode;
  level: number;
}

function FileTreeNode({ node, level }: FileTreeNodeProps) {
  const { selectedFile, setSelectedFile } = useFileSystem();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleClick = () => {
    if (node.type === "directory") {
      setIsExpanded(!isExpanded);
    } else {
      setSelectedFile(node.path);
    }
  };

  const children =
    node.type === "directory" && node.children
      ? Array.from(node.children.values()).sort((a, b) => {
          // Directories first, then files
          if (a.type !== b.type) {
            return a.type === "directory" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        })
      : [];

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 cursor-pointer text-sm transition-colors",
          selectedFile === node.path && "bg-blue-50 text-blue-600"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === "directory" ? (
          <>
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-blue-500" />
            )}
          </>
        ) : (
          <>
            <div className="w-3.5" />
            <FileCode className="h-4 w-4 shrink-0 text-gray-400" />
          </>
        )}
        <span className="truncate text-gray-700">{node.name}</span>
      </div>
      {node.type === "directory" && isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <FileTreeNode key={child.path} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree() {
  const { fileSystem, refreshTrigger } = useFileSystem();
  const rootNode = fileSystem.getNode("/");

  if (!rootNode || !rootNode.children || rootNode.children.size === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-9 flex items-center px-3 border-b border-neutral-200/60">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Files</span>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
          <Folder className="h-8 w-8 text-neutral-300 mb-2" />
          <p className="text-xs text-neutral-500">No files yet</p>
        </div>
      </div>
    );
  }

  const rootChildren = Array.from(rootNode.children.values()).sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col h-full">
      <div className="h-9 flex items-center px-3 border-b border-neutral-200/60 flex-shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Files</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1.5" key={refreshTrigger}>
          {rootChildren.map((child) => (
            <FileTreeNode key={child.path} node={child} level={0} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
