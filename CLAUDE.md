# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in a chat interface, Claude AI generates the code using tool calls that modify a virtual file system, and the result renders in a live iframe preview. The app runs without an API key using a mock provider that returns static components.

## Commands

```bash
npm run setup          # First-time setup: install deps + prisma generate + migrate
npm run dev            # Dev server with Turbopack (localhost:3000)
npm run build          # Production build
npm run lint           # ESLint
npm run test           # Vitest (watch mode)
npx vitest run         # Vitest single run
npx vitest run src/components/chat  # Run tests in a specific directory
npm run db:reset       # Reset SQLite database
npx prisma generate    # Regenerate Prisma client after schema changes
npx prisma migrate dev # Apply pending migrations
```

## Architecture

### AI Generation Pipeline

`POST /api/chat` (route.ts) → receives chat messages + serialized file system → reconstructs `VirtualFileSystem` → calls `streamText()` with Claude (or `MockLanguageModel` when no API key) → AI uses two tools (`str_replace_editor`, `file_manager`) to modify files → tool results flow back to client → on finish, saves to database if authenticated.

The system prompt lives in `src/lib/prompts/generation.tsx`. The model is `claude-haiku-4-5` configured in `src/lib/provider.ts`. Mock mode limits to 4 steps; real mode allows up to 40.

### Virtual File System

`src/lib/file-system.ts` — `VirtualFileSystem` class provides an in-memory tree of `FileNode` objects. No actual files are written to disk. It supports create, read, update, delete, rename, and serialization/deserialization. The file system state is passed from client to server on each chat request and persisted as JSON in the database for saved projects.

### Client State Management

Two React contexts drive the app:
- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`) — wraps the Vercel AI SDK `useChat` hook, manages messages, and processes tool call results to update the file system.
- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`) — holds the `VirtualFileSystem` instance on the client, exposes file operations, and tracks the active/selected file.

### Preview System

`src/components/preview/PreviewFrame.tsx` — takes the virtual file system contents, transforms JSX using Babel (`src/lib/transform/jsx-transformer.ts`), builds an HTML document with an import map pointing to `esm.sh` for npm package resolution, and renders it in a sandboxed iframe. The `@/` alias is resolved to relative paths. Entry point is always `/App.jsx`.

### Three-Panel Layout

`src/app/main-content.tsx` uses `react-resizable-panels` for the layout:
- Left panel: Chat interface (ChatInterface → MessageList + MessageInput)
- Right panel: Tabs for Preview (PreviewFrame) and Code (FileTree + CodeEditor via Monaco)

### Authentication

JWT-based with httpOnly cookies (jose library). Server actions in `src/actions/index.ts` handle sign-up/sign-in/sign-out. `src/middleware.ts` protects API routes. `src/lib/auth.ts` manages sessions (server-only module).

### Database

SQLite via Prisma. Schema in `prisma/schema.prisma`. Two models: `User` and `Project`. Projects store `messages` (chat history) and `data` (serialized file system) as JSON strings. Prisma client is generated to `src/generated/prisma`.

## Key Conventions

- Path alias: `@/*` maps to `src/*`
- UI components use shadcn/ui (config in `components.json`, components in `src/components/ui/`)
- Styling: Tailwind CSS v4 with `@tailwindcss/postcss` plugin
- Tests colocate with source in `__tests__/` directories using Vitest + React Testing Library + jsdom
- Server Actions in `src/actions/` for auth and project CRUD
- AI tools in `src/lib/tools/` — `str_replace_editor` for file create/edit, `file_manager` for rename/delete
- Use comments sparingly. Only comment complex code.
