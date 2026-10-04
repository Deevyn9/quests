// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuestStore } from "@/features/quests/store";
import { AppShell } from "./AppShell";

vi.mock("@/features/quests/useFlipReorder", () => ({
  useFlipReorder: () => {},
}));

const initialState = useQuestStore.getState();

beforeEach(() => {
  useQuestStore.setState({ ...initialState, ready: true }, true);
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

const noop = async () => {};

function renderApp() {
  return render(
    <AppShell
      user={{ name: "Ada Lovelace" }}
      signInAction={noop}
      signOutAction={noop}
    />,
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

describe("page scrolling behind dialogs", () => {
  it("is locked while the new quest dialog is open", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /new quest/i }));
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.body.style.overflow).toBe("");
  });

  it("is locked while the sign out dialog is open", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /sign out/i }));
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.body.style.overflow).toBe("");
  });

  it("is locked while the trophy panel is open", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole("button", { name: /open trophies/i }));
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(screen.getByRole("button", { name: /close trophies/i }));
    expect(document.body.style.overflow).toBe("");
  });
});

describe("putting a quest on hold", () => {
  it("shows the hold straight away after checking in today, and can be undone", async () => {
    const user = userEvent.setup();
    renderApp();
    await createQuest(user, "Read 10 pages");
    await user.click(screen.getByRole("button", { name: /check in today/i }));

    await user.click(screen.getByRole("button", { name: /put on hold/i }));

    expect(screen.getByText("On hold from tomorrow")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /put on hold/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Resume" }));

    expect(screen.queryByText("On hold from tomorrow")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /put on hold/i }),
    ).toBeInTheDocument();
  });
});
