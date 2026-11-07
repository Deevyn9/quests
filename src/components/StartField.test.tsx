// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { START_IMMEDIATELY, type StartChoice } from "@/lib/domain/start";
import { StartField } from "./StartField";

const TODAY = "2026-11-07"; // a Saturday

let latest: StartChoice = START_IMMEDIATELY;

function Harness({ initial = START_IMMEDIATELY }: { initial?: StartChoice }) {
  const [value, setValue] = useState(initial);
  latest = value;
  return <StartField today={TODAY} value={value} onChange={setValue} />;
}

afterEach(cleanup);

describe("StartField", () => {
  it("starts immediately by default, with the other choices hidden", () => {
    render(<Harness />);
    expect(screen.getByRole("switch", { name: "Start immediately" })).toBeChecked();
    expect(screen.getByText("Starts today")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tomorrow" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Start date" })).not.toBeInTheDocument();
  });

  it("shows Tomorrow and Pick a date when switched off, with Tomorrow chosen", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("switch", { name: "Start immediately" }));

    expect(screen.getByRole("switch", { name: "Start immediately" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Tomorrow" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Starts tomorrow · Sun 8 Nov")).toBeInTheDocument();
    expect(latest).toMatchObject({ immediately: false, pick: "tomorrow" });
    // the calendar only opens on "Pick a date"
    expect(screen.queryByRole("group", { name: "Start date" })).not.toBeInTheDocument();
  });

  it("opens the calendar on Pick a date and records the chosen day", async () => {
    render(<Harness initial={{ immediately: false, pick: "tomorrow", date: null }} />);
    await userEvent.click(screen.getByRole("button", { name: /pick a date/i }));
    expect(screen.getByText("Choose a day on the calendar")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Fri 20 Nov 2026" }));
    expect(latest).toMatchObject({ pick: "date", date: "2026-11-20" });
    expect(screen.getByText("Starts Fri 20 Nov")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fri 20 Nov 2026" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the picked date when switching back to Tomorrow and on again", async () => {
    render(<Harness initial={{ immediately: false, pick: "date", date: "2026-11-20" }} />);
    await userEvent.click(screen.getByRole("button", { name: "Tomorrow" }));
    await userEvent.click(screen.getByRole("button", { name: /pick a date/i }));
    expect(screen.getByRole("button", { name: "Fri 20 Nov 2026" })).toHaveAttribute("aria-pressed", "true");
  });

  it("can't pick today or earlier days", async () => {
    render(<Harness initial={{ immediately: false, pick: "date", date: null }} />);
    expect(screen.getByRole("button", { name: "Sat 7 Nov 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fri 6 Nov 2026" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sun 8 Nov 2026" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
  });

  it("moves between months, up to a year ahead", async () => {
    render(<Harness initial={{ immediately: false, pick: "date", date: null }} />);
    expect(screen.getByText("November 2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText("December 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous month" })).toBeEnabled();

    for (let i = 0; i < 11; i++) await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText("November 2027")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
    // 7 Nov 2027 is the last day allowed (365 days ahead); the 8th is not
    expect(screen.getByRole("button", { name: "Sun 7 Nov 2027" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Mon 8 Nov 2027" })).toBeDisabled();
  });

  it("opens on the month of an already picked date", () => {
    render(<Harness initial={{ immediately: false, pick: "date", date: "2027-01-15" }} />);
    expect(screen.getByText("January 2027")).toBeInTheDocument();
  });
});

void vi;
