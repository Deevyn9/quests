// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeQuest } from "@/lib/domain/fixtures";
import { TrophyPanel } from "./TrophyPanel";

afterEach(cleanup);

const base = { onClose: () => {}, trophies: {}, completed: [] };

describe("TrophyPanel", () => {
  it("is hidden from the accessibility tree while closed", () => {
    render(<TrophyPanel {...base} open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists every trophy, marking earned and locked ones", () => {
    render(
      <TrophyPanel {...base} open trophies={{ "first-quest": "2026-09-01" }} />,
    );
    expect(screen.getByText("First Steps")).toBeInTheDocument();
    expect(screen.getByText("Earned 1 Sep 2026")).toBeInTheDocument();
    expect(screen.getAllByText("Locked")).toHaveLength(5);
  });

  it("switches to the completed quests tab", async () => {
    const user = userEvent.setup();
    render(
      <TrophyPanel
        {...base}
        open
        completed={[makeQuest({ title: "Read 10 pages" })]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /completed quests/i }));

    expect(screen.getByRole("tabpanel")).toHaveTextContent("Read 10 pages");
  });

  it("shows the details of a completed quest", async () => {
    const user = userEvent.setup();
    const quest = makeQuest({
      title: "Read 10 pages",
      durationDays: 3,
      checkIns: ["2026-09-01", "2026-09-02", "2026-09-03"],
    });
    render(<TrophyPanel {...base} open completed={[quest]} />);

    await user.click(screen.getByRole("tab", { name: /completed quests/i }));

    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("3 days")).toBeInTheDocument();
    expect(
      within(panel).getByText("1 Sep 2026 → 3 Sep 2026"),
    ).toBeInTheDocument();
    expect(within(panel).getByText("3 check-ins")).toBeInTheDocument();
    expect(within(panel).getByText("Best streak 3")).toBeInTheDocument();
  });

  it("explains when nothing has been completed yet", async () => {
    const user = userEvent.setup();
    render(<TrophyPanel {...base} open />);

    await user.click(screen.getByRole("tab", { name: /completed quests/i }));

    expect(screen.getByRole("tabpanel")).toHaveTextContent(
      /no completed quests yet/i,
    );
  });

  it("closes when Escape is pressed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TrophyPanel {...base} open onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes from the close button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TrophyPanel {...base} open onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /close trophies/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
