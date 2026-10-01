// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AppShell } from "./AppShell";

afterEach(cleanup);

describe("AppShell", () => {
  it("shows the page heading", () => {
    render(<AppShell />);
    expect(screen.getByRole("heading", { name: "Quests" })).toBeInTheDocument();
  });

  it("has a new quest button and a trophy button", () => {
    render(<AppShell />);
    expect(
      screen.getByRole("button", { name: /new quest/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open trophies/i }),
    ).toBeInTheDocument();
  });

  it("shows the empty state when there are no quests", () => {
    render(<AppShell />);
    expect(screen.getByText(/no quests at the moment/i)).toBeInTheDocument();
  });
});
