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

function renderApp(user: { name: string | null } | null = { name: "Ada" }) {
  return render(
    <AppShell user={user} signInAction={noop} signOutAction={noop} />,
  );
}

async function createQuest(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(screen.getByRole("button", { name: /new quest/i }));
  await user.type(screen.getByLabelText(/quest name/i), name);
  await user.click(screen.getByRole("button", { name: /create quest/i }));
}

describe("AppShell (signed in)", () => {
  it("shows the page heading and the user's name", () => {
    renderApp();
    expect(screen.getByRole("heading", { name: "Quests" })).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
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

  it("creates a quest from the modal and lists it", async () => {
    const user = userEvent.setup();
    renderApp();

    await createQuest(user, "Read 10 pages");

    expect(screen.getByText("Read 10 pages")).toBeInTheDocument();
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
  it("offers Google sign-in instead of the quest list", () => {
    renderApp(null);
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /new quest/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open trophies/i }),
    ).not.toBeInTheDocument();
  });
});
