// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

// Mock server-only (no-op)
vi.mock("server-only", () => ({}));

// Mock next/headers cookies()
const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import {
  createSession,
  getSession,
  deleteSession,
  verifySession,
} from "../auth";

beforeEach(() => {
  vi.clearAllMocks();
});

async function createValidToken(
  userId: string,
  email: string
): Promise<string> {
  return new SignJWT({ userId, email, expiresAt: new Date().toISOString() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

async function createExpiredToken(): Promise<string> {
  return new SignJWT({ userId: "user-expired", email: "expired@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("-1s")
    .setIssuedAt(Math.floor(Date.now() / 1000) - 60)
    .sign(JWT_SECRET);
}

// --- createSession ---

test("createSession sets an httpOnly cookie with a JWT", async () => {
  await createSession("user-123", "test@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledOnce();

  const [name, token, options] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(typeof token).toBe("string");
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");

  // Verify the token is a valid JWT containing the correct payload
  const { payload } = await jwtVerify(token, JWT_SECRET);
  expect(payload.userId).toBe("user-123");
  expect(payload.email).toBe("test@example.com");
});

test("createSession sets cookie expiration to 7 days", async () => {
  const before = Date.now();
  await createSession("user-123", "test@example.com");
  const after = Date.now();

  const { expires } = mockCookieStore.set.mock.calls[0][2];
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs);
  expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs);
});

test("createSession sets secure flag to false in non-production", async () => {
  await createSession("user-123", "test@example.com");

  const options = mockCookieStore.set.mock.calls[0][2];
  expect(options.secure).toBe(false);
});

test("createSession sets secure flag to true in production", async () => {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  await createSession("user-123", "test@example.com");

  const options = mockCookieStore.set.mock.calls[0][2];
  expect(options.secure).toBe(true);

  process.env.NODE_ENV = original;
});

test("createSession JWT contains iat and exp claims", async () => {
  await createSession("user-123", "test@example.com");

  const token = mockCookieStore.set.mock.calls[0][1];
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.iat).toBeDefined();
  expect(payload.exp).toBeDefined();
  expect(typeof payload.iat).toBe("number");
  expect(typeof payload.exp).toBe("number");
});

test("createSession JWT includes expiresAt in payload", async () => {
  await createSession("user-123", "test@example.com");

  const token = mockCookieStore.set.mock.calls[0][1];
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.expiresAt).toBeDefined();
});

test("createSession uses HS256 algorithm", async () => {
  await createSession("user-123", "test@example.com");

  const token = mockCookieStore.set.mock.calls[0][1];
  const { protectedHeader } = await jwtVerify(token, JWT_SECRET);

  expect(protectedHeader.alg).toBe("HS256");
});

// --- getSession ---

test("getSession returns session payload for a valid token", async () => {
  const token = await createValidToken("user-456", "hello@example.com");
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-456");
  expect(session!.email).toBe("hello@example.com");
});

test("getSession returns null when no cookie exists", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for an invalid token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "not-a-valid-jwt" });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for a token signed with wrong secret", async () => {
  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const token = await new SignJWT({ userId: "user-1", email: "a@b.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(wrongSecret);

  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession reads from the auth-token cookie", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  await getSession();

  expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
});

test("getSession returns null for an expired token", async () => {
  const token = await createExpiredToken();
  mockCookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null when cookie value is empty string", async () => {
  mockCookieStore.get.mockReturnValue({ value: "" });

  const session = await getSession();

  expect(session).toBeNull();
});

// --- deleteSession ---

test("deleteSession deletes the auth cookie", async () => {
  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});

test("deleteSession calls delete exactly once", async () => {
  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledOnce();
});

test("deleteSession does not call set or get", async () => {
  await deleteSession();

  expect(mockCookieStore.set).not.toHaveBeenCalled();
  expect(mockCookieStore.get).not.toHaveBeenCalled();
});

// --- verifySession ---

test("verifySession returns session payload for a valid token on request", async () => {
  const token = await createValidToken("user-789", "req@example.com");
  const request = {
    cookies: { get: vi.fn().mockReturnValue({ value: token }) },
  } as any;

  const session = await verifySession(request);

  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-789");
  expect(session!.email).toBe("req@example.com");
  expect(request.cookies.get).toHaveBeenCalledWith("auth-token");
});

test("verifySession returns null when request has no cookie", async () => {
  const request = {
    cookies: { get: vi.fn().mockReturnValue(undefined) },
  } as any;

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession returns null for an invalid token on request", async () => {
  const request = {
    cookies: { get: vi.fn().mockReturnValue({ value: "garbage-token" }) },
  } as any;

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession returns null for a token signed with wrong secret", async () => {
  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const token = await new SignJWT({ userId: "user-1", email: "a@b.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(wrongSecret);

  const request = {
    cookies: { get: vi.fn().mockReturnValue({ value: token }) },
  } as any;

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession returns null for an expired token on request", async () => {
  const token = await createExpiredToken();
  const request = {
    cookies: { get: vi.fn().mockReturnValue({ value: token }) },
  } as any;

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession reads from request cookies, not next/headers", async () => {
  const token = await createValidToken("user-1", "a@b.com");
  const request = {
    cookies: { get: vi.fn().mockReturnValue({ value: token }) },
  } as any;

  await verifySession(request);

  expect(request.cookies.get).toHaveBeenCalledWith("auth-token");
  expect(mockCookieStore.get).not.toHaveBeenCalled();
});
