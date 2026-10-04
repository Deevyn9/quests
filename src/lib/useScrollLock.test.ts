// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { useScrollLock } from "./useScrollLock";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("useScrollLock", () => {
  it("stops the page scrolling while active and restores it afterwards", () => {
    document.body.style.overflow = "auto";
    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("does nothing while inactive", () => {
    const { rerender } = renderHook(({ on }) => useScrollLock(on), {
      initialProps: { on: false },
    });
    expect(document.body.style.overflow).toBe("");

    rerender({ on: true });
    expect(document.body.style.overflow).toBe("hidden");

    rerender({ on: false });
    expect(document.body.style.overflow).toBe("");
  });

  it("stays locked until every lock is released", () => {
    const first = renderHook(() => useScrollLock(true));
    const second = renderHook(() => useScrollLock(true));

    first.unmount();
    expect(document.body.style.overflow).toBe("hidden");

    second.unmount();
    expect(document.body.style.overflow).toBe("");
  });
});