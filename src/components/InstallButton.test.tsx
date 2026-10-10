// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InstallButton } from "./InstallButton";
import {
  captureInstallPrompt,
  clearInstallPrompt,
} from "@/lib/pwa/installPrompt";

afterEach(() => {
  cleanup();
  clearInstallPrompt();
});

describe("InstallButton", () => {
  it("renders nothing when the app can't be installed", () => {
    render(<InstallButton />);
    expect(screen.queryByRole("button", { name: /install/i })).toBeNull();
  });

  it("appears when the browser offers the prompt, and fires it on click", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(
      new Event("beforeinstallprompt", { cancelable: true }),
      {
        prompt,
        userChoice: Promise.resolve({
          outcome: "accepted" as const,
          platform: "web",
        }),
      },
    );

    render(<InstallButton />);
    act(() => captureInstallPrompt(event));

    await userEvent.click(
      await screen.findByRole("button", { name: /install/i }),
    );
    expect(prompt).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: /install/i })).toBeNull();
  });
});
