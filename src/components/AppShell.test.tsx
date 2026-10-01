// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuestStore } from "@/features/quests/store";
import { AppShell } from "./AppShell";

const initialState = useQuestStore.getState();

beforeEach(() => {
  useQuestStore.setState(initialState, true); // fresh store for every test
});
afterEach(cleanup);

async function createQuest(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(screen.getByRole("button", { name: /new quest/i }));
  await user.type(screen.getByLabelText(/quest name/i), name);
  await user.click(screen.getByRole("button", { name: /create quest/i }));
}

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

  it("creates a quest from the modal and lists it", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await createQuest(user, "Read 10 pages");

    expect(screen.getByText("Read 10 pages")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/no quests at the moment/i),
    ).not.toBeInTheDocument();
  });

  it("shows a validation error for a blank name", async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.click(screen.getByRole("button", { name: /new quest/i }));
    await user.click(screen.getByRole("button", { name: /create quest/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/name/i);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("checks in a quest and shows a toast", async () => {
    const user = userEvent.setup();
    render(<AppShell />);
    await createQuest(user, "Read 10 pages");

    await user.click(screen.getByRole("button", { name: /check in today/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/checked in/i);
    expect(
      screen.queryByRole("button", { name: /check in today/i }),
    ).not.toBeInTheDocument();
  });
});
