// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

afterEach(cleanup); // unmount between tests so they don't see each other's output

describe("EmptyState", () => {
  it("tells the user there are no quests", () => {
    render(<EmptyState />);
    expect(screen.getByText(/no quests at the moment/i)).toBeInTheDocument();
  });

  it("offers a way to start one", () => {
    render(<EmptyState />);
    expect(
      screen.getByRole("button", { name: /start a quest/i }),
    ).toBeInTheDocument();
  });
});
