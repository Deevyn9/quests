// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canInstall,
  captureInstallPrompt,
  clearInstallPrompt,
  promptInstall,
  subscribe,
} from "./installPrompt";

function fakeEvent(outcome: "accepted" | "dismissed" = "accepted") {
  const e = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
    prompt: ReturnType<typeof vi.fn>;
    userChoice: Promise<{ outcome: typeof outcome; platform: string }>;
  };
  e.prompt = vi.fn().mockResolvedValue(undefined);
  e.userChoice = Promise.resolve({ outcome, platform: "web" });
  return e;
}

describe("installPrompt", () => {
  beforeEach(() => clearInstallPrompt());

  it("is unavailable until the browser offers the prompt", async () => {
    expect(canInstall()).toBe(false);
    expect(await promptInstall()).toBe("unavailable");
  });

  it("captures the event and stops the browser's own mini-infobar", () => {
    const e = fakeEvent();
    captureInstallPrompt(e);
    expect(e.defaultPrevented).toBe(true);
    expect(canInstall()).toBe(true);
  });

  it("shows the prompt once and reports the choice", async () => {
    const e = fakeEvent("dismissed");
    captureInstallPrompt(e);
    expect(await promptInstall()).toBe("dismissed");
    expect(e.prompt).toHaveBeenCalledOnce();
    expect(canInstall()).toBe(false);
  });

  it("notifies subscribers when availability changes", () => {
    const listener = vi.fn();
    const off = subscribe(listener);
    captureInstallPrompt(fakeEvent());
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    clearInstallPrompt();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});