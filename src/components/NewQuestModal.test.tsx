// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuestStore } from "@/features/quests/store";
import { NewQuestModal } from "./NewQuestModal";

const initialState = useQuestStore.getState();

beforeEach(() => {
  useQuestStore.setState({ ...initialState, ready: true }, true);
});
afterEach(cleanup);

describe("NewQuestModal custom length", () => {
  it("keeps the days field out of reach until Custom is chosen", async () => {
    const user = userEvent.setup();
    render(<NewQuestModal open onClose={() => {}} />);
    const field = screen.getByLabelText("Number of days");

    expect(field.closest("[inert]")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Custom" }));
    expect(field.closest("[inert]")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Week" }));
    expect(field.closest("[inert]")).not.toBeNull();
  });

  it("creates a quest with the custom number of days", async () => {
    const user = userEvent.setup();
    render(<NewQuestModal open onClose={() => {}} />);

    await user.type(screen.getByLabelText(/quest name/i), "Stretch");
    await user.click(screen.getByRole("button", { name: "Custom" }));
    const field = screen.getByLabelText("Number of days");
    await user.clear(field);
    await user.type(field, "10");
    await user.click(screen.getByRole("button", { name: /create quest/i }));

    expect(useQuestStore.getState().quests[0]).toMatchObject({
      title: "Stretch",
      durationDays: 10,
    });
  });
});
