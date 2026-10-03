// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuestStore } from "@/features/quests/store";
import { AppShell } from "./AppShell";

vi.mock("@/features/quests/useFlipReorder", () => ({
  useFlipReorder: () => {},
}));

const initialState = useQuestStore.getState();

beforeEach(() => {
  // fresh store for every test, already loaded
  useQuestStore.setState({ ...initialState, ready: true }, true);
});
afterEach(cleanup);

const noop = async () => {};

function renderApp(
  user: { name: string | null } | null = { name: "Ada Lovelace" },
) {
  return render(
    <AppShell user={user} signInAction={noop} signOutAction={noop} />,
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function createQuest(user: User, name: string) {
  await user.click(screen.getByRole("button", { name: /new quest/i }));
  await user.type(screen.getByLabelText(/quest name/i), name);
  await user.click(screen.getByRole("button", { name: /create quest/i }));
}

describe("AppShell (signed in)", () => {
  it("titles the page with the user's first name and shows their streak restores", () => {
    renderApp();
    expect(
      screen.getByRole("heading", { name: "Ada's quests" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/streak restore: 0/i)).toBeInTheDocument();
  });

  it("has a new quest button, a trophy button and a sign out button", () => {
    renderApp();
    expect(
      screen.getByRole("button", { name: /new quest/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open trophies/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign out/i }),
    ).toBeInTheDocument();
  });

  it("shows the empty state when there are no quests", () => {
    renderApp();
    expect(screen.getByText(/no quests at the moment/i)).toBeInTheDocument();
  });

  it("holds the list back until saved quests have loaded", () => {
    useQuestStore.setState({ ready: false });
    renderApp();
    expect(
      screen.queryByText(/no quests at the moment/i),
    ).not.toBeInTheDocument();
  });

  it("creates a quest and shows its length and progress", async () => {
    const user = userEvent.setup();
    renderApp();

    await createQuest(user, "Read 10 pages");

    expect(screen.getByText("Read 10 pages")).toBeInTheDocument();
    expect(screen.getByText("7 days")).toBeInTheDocument();
    expect(screen.getByText("Day 1 of 7")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/no quests at the moment/i),
    ).not.toBeInTheDocument();
  });

  it("shows a validation error for a blank name", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /new quest/i }));
    await user.click(screen.getByRole("button", { name: /create quest/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/name/i);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("checks in a quest and shows a toast", async () => {
    const user = userEvent.setup();
    renderApp();
    await createQuest(user, "Read 10 pages");

    await user.click(screen.getByRole("button", { name: /check in today/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/checked in/i);
    expect(
      screen.queryByRole("button", { name: /check in today/i }),
    ).not.toBeInTheDocument();
  });

  it("removes a finished one-day quest from the list", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /new quest/i }));
    await user.type(screen.getByLabelText(/quest name/i), "Jump");
    await user.click(screen.getByRole("button", { name: "Day" }));
    await user.click(screen.getByRole("button", { name: /create quest/i }));
    await user.click(screen.getByRole("button", { name: /check in today/i }));

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/quest complete/i);
  });

  it("deletes a quest after confirming", async () => {
    const user = userEvent.setup();
    renderApp();
    await createQuest(user, "Read 10 pages");

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: /delete quest/i });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(screen.queryByText("Read 10 pages")).not.toBeInTheDocument();
    expect(screen.getByText(/no quests at the moment/i)).toBeInTheDocument();
  });

  it("keeps the quest when deleting is cancelled", async () => {
    const user = userEvent.setup();
    renderApp();
    await createQuest(user, "Read 10 pages");

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: /delete quest/i });
    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

    expect(screen.getByText("Read 10 pages")).toBeInTheDocument();
  });

  it("puts a quest on hold and resumes it", async () => {
    const user = userEvent.setup();
    renderApp();
    await createQuest(user, "Read 10 pages");

    await user.click(screen.getByRole("button", { name: /put on hold/i }));
    expect(screen.getByText("On hold")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /check in today/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /resume/i }));
    expect(screen.queryByText("On hold")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /check in today/i }),
    ).toBeInTheDocument();
  });

  it("opens the trophy panel from the trophy button", async () => {
    const user = userEvent.setup();
    renderApp();
    expect(
      screen.queryByRole("dialog", { name: /trophies/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /open trophies/i }));

    expect(
      screen.getByRole("dialog", { name: /trophies/i }),
    ).toBeInTheDocument();
  });

  it("unlocks First Steps after creating a quest", async () => {
    const user = userEvent.setup();
    renderApp();
    await createQuest(user, "Read 10 pages");

    await user.click(screen.getByRole("button", { name: /open trophies/i }));

    expect(screen.getByText(/^Earned /)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/first steps/i);
  });

  it("asks for confirmation before signing out", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /sign out/i }));
    const dialog = screen.getByRole("dialog", { name: /sign out\?/i });
    expect(dialog).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));
    expect(
      screen.queryByRole("dialog", { name: /sign out\?/i }),
    ).not.toBeInTheDocument();
  });
});

describe("AppShell (signed out)", () => {
  it("offers sign-in in place of the new quest button", () => {
    renderApp(null);
    expect(screen.getByRole("heading", { name: "Quests" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in to create quests/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /new quest/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open trophies/i }),
    ).not.toBeInTheDocument();
  });
});
