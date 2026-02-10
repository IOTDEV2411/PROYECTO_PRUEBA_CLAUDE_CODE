import { test, expect, describe, beforeEach, vi } from "vitest";
import {
  setHasAnonWork,
  getHasAnonWork,
  getAnonWorkData,
  clearAnonWork,
} from "@/lib/anon-work-tracker";

describe("anon-work-tracker", () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};

    // Mock sessionStorage
    vi.stubGlobal("sessionStorage", {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
    });
  });

  // --- setHasAnonWork ---

  describe("setHasAnonWork", () => {
    test("stores messages and file system data when messages exist", () => {
      const messages = [{ id: "1", role: "user", content: "Hello" }];
      const fsData = { "/": { type: "directory" } };

      setHasAnonWork(messages, fsData);

      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        "uigen_has_anon_work",
        "true"
      );
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        "uigen_anon_data",
        JSON.stringify({ messages, fileSystemData: fsData })
      );
    });

    test("stores data when file system has more than root", () => {
      const messages: any[] = [];
      const fsData = {
        "/": { type: "directory" },
        "/App.jsx": { type: "file", content: "code" },
      };

      setHasAnonWork(messages, fsData);

      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        "uigen_has_anon_work",
        "true"
      );
    });

    test("does not store when messages are empty and fs has only root", () => {
      const messages: any[] = [];
      const fsData = { "/": { type: "directory" } };

      setHasAnonWork(messages, fsData);

      expect(sessionStorage.setItem).not.toHaveBeenCalled();
    });

    test("does not store when messages are empty and fs is empty", () => {
      setHasAnonWork([], {});

      expect(sessionStorage.setItem).not.toHaveBeenCalled();
    });
  });

  // --- getHasAnonWork ---

  describe("getHasAnonWork", () => {
    test("returns true when work is tracked", () => {
      store["uigen_has_anon_work"] = "true";

      expect(getHasAnonWork()).toBe(true);
    });

    test("returns false when no work is tracked", () => {
      expect(getHasAnonWork()).toBe(false);
    });

    test("returns false when value is not 'true'", () => {
      store["uigen_has_anon_work"] = "false";

      expect(getHasAnonWork()).toBe(false);
    });
  });

  // --- getAnonWorkData ---

  describe("getAnonWorkData", () => {
    test("returns stored data when available", () => {
      const data = {
        messages: [{ id: "1" }],
        fileSystemData: { "/App.jsx": { type: "file" } },
      };
      store["uigen_anon_data"] = JSON.stringify(data);

      const result = getAnonWorkData();

      expect(result).toEqual(data);
    });

    test("returns null when no data is stored", () => {
      expect(getAnonWorkData()).toBeNull();
    });

    test("returns null when stored data is invalid JSON", () => {
      store["uigen_anon_data"] = "not valid json{{{";

      expect(getAnonWorkData()).toBeNull();
    });
  });

  // --- clearAnonWork ---

  describe("clearAnonWork", () => {
    test("removes both storage keys", () => {
      store["uigen_has_anon_work"] = "true";
      store["uigen_anon_data"] = "{}";

      clearAnonWork();

      expect(sessionStorage.removeItem).toHaveBeenCalledWith(
        "uigen_has_anon_work"
      );
      expect(sessionStorage.removeItem).toHaveBeenCalledWith(
        "uigen_anon_data"
      );
    });
  });

  // --- SSR safety ---

  describe("SSR safety (no window)", () => {
    test("setHasAnonWork is a no-op when window is undefined", () => {
      const origWindow = globalThis.window;
      // @ts-ignore
      delete globalThis.window;

      setHasAnonWork([{ id: "1" }], { "/": {} });

      // Should not throw and should not call sessionStorage
      globalThis.window = origWindow;
    });

    test("getHasAnonWork returns false when window is undefined", () => {
      const origWindow = globalThis.window;
      // @ts-ignore
      delete globalThis.window;

      const result = getHasAnonWork();

      expect(result).toBe(false);
      globalThis.window = origWindow;
    });

    test("getAnonWorkData returns null when window is undefined", () => {
      const origWindow = globalThis.window;
      // @ts-ignore
      delete globalThis.window;

      const result = getAnonWorkData();

      expect(result).toBeNull();
      globalThis.window = origWindow;
    });

    test("clearAnonWork is a no-op when window is undefined", () => {
      const origWindow = globalThis.window;
      // @ts-ignore
      delete globalThis.window;

      clearAnonWork();

      // Should not throw
      globalThis.window = origWindow;
    });
  });
});
