// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

afterEach(cleanup);

const base = {
  open: true,
  title: "Delete quest?",
  description: "This can't be undone.",
  confirmLabel: "Delete",
  onConfirm: () => {},
  onCancel: () => {},
};

describe("ConfirmDialog", () => {
  it("renders nothing while closed", () => {
    render(<ConfirmDialog {...base} open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("makes a destructive confirm button red", () => {
    render(<ConfirmDialog {...base} destructive />);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass(
      "bg-red-600",
    );
  });

  it("keeps the confirm button dark otherwise", () => {
    render(<ConfirmDialog {...base} confirmLabel="Sign out" />);
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveClass(
      "bg-zinc-900",
    );
  });

  it("calls onConfirm and onCancel from their buttons", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog {...base} onConfirm={onConfirm} onCancel={onCancel} />,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
