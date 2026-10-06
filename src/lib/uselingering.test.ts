// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useLingering } from "./useLingering";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useLingering", () => {
  it("is on while active", () => {
    const { result } = renderHook(() => useLingering(true, 450));
    expect(result.current).toBe(true);
  });

  it("is off while inactive", () => {
    const { result } = renderHook(() => useLingering(false, 450));
    expect(result.current).toBe(false);
  });

  it("stays on for a moment after turning off, then goes off", () => {
    const { result, rerender } = renderHook(({ on }) => useLingering(on, 450), {
      initialProps: { on: true },
    });

    rerender({ on: false });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(449);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2);
    });
    expect(result.current).toBe(false);
  });

  it("comes straight back if it turns on again while lingering", () => {
    const { result, rerender } = renderHook(({ on }) => useLingering(on, 450), {
      initialProps: { on: true },
    });

    rerender({ on: false });
    rerender({ on: true });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBe(true);
  });
});