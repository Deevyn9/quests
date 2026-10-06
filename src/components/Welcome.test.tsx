// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Welcome } from "./Welcome";

afterEach(cleanup);

const renderWelcome = () => render(<Welcome signInAction={async () => {}} />);

describe("Welcome", () => {
  it("shows an example quest card", () => {
    renderWelcome();
    expect(screen.getByText("What a quest looks like")).toBeInTheDocument();
    expect(screen.getByText("Read 10 pages")).toBeInTheDocument();
    expect(screen.getByText("7 days · Skips Sat, Sun")).toBeInTheDocument();
    expect(screen.getByText("Day 4 of 7")).toBeInTheDocument();
    expect(screen.getByText("Streak: 3")).toBeInTheDocument();
  });

  it("shows the whole example week", () => {
    renderWelcome();
    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      expect(screen.getByText(day)).toBeInTheDocument();
    }
  });

  it("explains how it works in four steps", () => {
    renderWelcome();
    expect(
      screen.getByRole("heading", { name: "How it works" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pick a challenge")).toBeInTheDocument();
    expect(screen.getByText("Check in every day")).toBeInTheDocument();
    expect(screen.getByText("Freeze it when life happens")).toBeInTheDocument();
    expect(screen.getByText("Earn restores and trophies")).toBeInTheDocument();
  });

  it("ends with a button to sign in and start", () => {
    renderWelcome();
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });
});
