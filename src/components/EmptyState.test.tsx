// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./EmptyState";

afterEach(cleanup);

describe("EmptyState", () => {
  it("tells the user there are no quests", () => {
    render(<EmptyState onStart={() => {}} />);
    expect(screen.getByText(/no quests at the moment/i)).toBeInTheDocument();
  });

  it("calls onStart when the button is clicked", async () => {
    const onStart = vi.fn();
    render(<EmptyState onStart={onStart} />);
    await userEvent.click(
      screen.getByRole("button", { name: /start a quest/i }),
    );
    expect(onStart).toHaveBeenCalledOnce();
  });
});
