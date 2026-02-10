// @vitest-environment node
import { test, expect, describe, vi, beforeEach } from "vitest";

// Mock dependencies before imports
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn((password: string) => Promise.resolve(`hashed_${password}`)),
    compare: vi.fn((plain: string, hashed: string) =>
      Promise.resolve(hashed === `hashed_${plain}`)
    ),
  },
}));

import { signUp, signIn, signOut, getUser } from "@/actions/index";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession, getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

beforeEach(() => {
  vi.clearAllMocks();
});

// --- signUp ---

describe("signUp", () => {
  test("creates user and session successfully", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
    });

    const result = await signUp("test@example.com", "password123");

    expect(result).toEqual({ success: true });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "test@example.com",
        password: "hashed_password123",
      },
    });
    expect(createSession).toHaveBeenCalledWith("user-1", "test@example.com");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  test("returns error when email is empty", async () => {
    const result = await signUp("", "password123");

    expect(result).toEqual({
      success: false,
      error: "Email and password are required",
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  test("returns error when password is empty", async () => {
    const result = await signUp("test@example.com", "");

    expect(result).toEqual({
      success: false,
      error: "Email and password are required",
    });
  });

  test("returns error when password is too short", async () => {
    const result = await signUp("test@example.com", "short");

    expect(result).toEqual({
      success: false,
      error: "Password must be at least 8 characters",
    });
  });

  test("returns error when email is already registered", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "existing",
      email: "test@example.com",
    });

    const result = await signUp("test@example.com", "password123");

    expect(result).toEqual({
      success: false,
      error: "Email already registered",
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  test("returns generic error on database failure", async () => {
    (prisma.user.findUnique as any).mockRejectedValue(new Error("DB error"));

    const result = await signUp("test@example.com", "password123");

    expect(result).toEqual({
      success: false,
      error: "An error occurred during sign up",
    });
  });
});

// --- signIn ---

describe("signIn", () => {
  test("signs in successfully with correct credentials", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password: "hashed_password123",
    });

    const result = await signIn("test@example.com", "password123");

    expect(result).toEqual({ success: true });
    expect(createSession).toHaveBeenCalledWith("user-1", "test@example.com");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  test("returns error when email is empty", async () => {
    const result = await signIn("", "password123");

    expect(result).toEqual({
      success: false,
      error: "Email and password are required",
    });
  });

  test("returns error when password is empty", async () => {
    const result = await signIn("test@example.com", "");

    expect(result).toEqual({
      success: false,
      error: "Email and password are required",
    });
  });

  test("returns error when user does not exist", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const result = await signIn("nonexistent@example.com", "password123");

    expect(result).toEqual({
      success: false,
      error: "Invalid credentials",
    });
  });

  test("returns error when password is wrong", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      password: "hashed_correctpassword",
    });

    const result = await signIn("test@example.com", "wrongpassword");

    expect(result).toEqual({
      success: false,
      error: "Invalid credentials",
    });
    expect(createSession).not.toHaveBeenCalled();
  });

  test("returns generic error on database failure", async () => {
    (prisma.user.findUnique as any).mockRejectedValue(new Error("DB error"));

    const result = await signIn("test@example.com", "password123");

    expect(result).toEqual({
      success: false,
      error: "An error occurred during sign in",
    });
  });

  test("does not reveal whether email exists on wrong password", async () => {
    // Both "user not found" and "wrong password" should return same error
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const noUserResult = await signIn("test@example.com", "password123");

    (prisma.user.findUnique as any).mockResolvedValue({
      id: "1",
      email: "test@example.com",
      password: "hashed_other",
    });
    const wrongPwResult = await signIn("test@example.com", "password123");

    expect(noUserResult.error).toBe(wrongPwResult.error);
  });
});

// --- signOut ---

describe("signOut", () => {
  test("deletes session, revalidates, and redirects", async () => {
    await signOut();

    expect(deleteSession).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(redirect).toHaveBeenCalledWith("/");
  });
});

// --- getUser ---

describe("getUser", () => {
  test("returns user data when session exists", async () => {
    (getSession as any).mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
    });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      createdAt: new Date("2024-01-01"),
    });

    const user = await getUser();

    expect(user).toEqual({
      id: "user-1",
      email: "test@example.com",
      createdAt: new Date("2024-01-01"),
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { id: true, email: true, createdAt: true },
    });
  });

  test("returns null when no session exists", async () => {
    (getSession as any).mockResolvedValue(null);

    const user = await getUser();

    expect(user).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  test("returns null on database error", async () => {
    (getSession as any).mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
    });
    (prisma.user.findUnique as any).mockRejectedValue(new Error("DB error"));

    const user = await getUser();

    expect(user).toBeNull();
  });

  test("returns null when user not found in database", async () => {
    (getSession as any).mockResolvedValue({
      userId: "deleted-user",
      email: "gone@example.com",
    });
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const user = await getUser();

    expect(user).toBeNull();
  });
});
