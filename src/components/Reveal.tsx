import type { ReactNode } from "react";

// Opens and closes a section. The height follows a smooth ease, while the content inside
// pops in with a springy bounce. `inert` keeps hidden controls out of the tab order.
export function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      {/* -mx-2 px-2: room for the bounce to overshoot sideways without being clipped */}
      <div className="-mx-2 overflow-hidden px-2">
        <div
          className={`origin-top transition-[scale,translate,opacity] duration-600 ease-spring motion-reduce:transition-none ${
            open ? "translate-y-0 scale-100 opacity-100" : "-translate-y-4 scale-[0.8] opacity-0"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
