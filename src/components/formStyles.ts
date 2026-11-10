export const ACCENT_ON = "border-blue-400 bg-blue-400 text-white";
export const ACCENT_BG = "bg-blue-400";

export const LABEL = "text-sm font-medium text-zinc-900";
export const HINT = "text-xs text-zinc-500";

export const FIELD =
  "h-12.5 w-full rounded-control border border-zinc-300 bg-white px-4 text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900";

const PILL_BASE =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-control border px-4 text-sm font-medium transition duration-300 ease-spring active:scale-95 motion-reduce:transition-none";

export const pill = (selected: boolean) =>
  `${PILL_BASE} ${
    selected ? ACCENT_ON : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
  }`;

export const chip = (selected: boolean) =>
  `grid size-10 place-items-center rounded-control border text-sm font-medium transition duration-300 ease-spring active:scale-90 motion-reduce:transition-none ${
    selected ? ACCENT_ON : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
  }`;

export const BUTTON_SECONDARY =
  "inline-flex h-10 items-center justify-center rounded-control border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 transition duration-300 ease-spring hover:bg-zinc-50 active:scale-95 motion-reduce:transition-none";

export const BUTTON_PRIMARY =
  "inline-flex h-10 items-center justify-center gap-2 rounded-control bg-blue-400 px-5 text-sm font-medium text-white transition duration-300 ease-spring hover:bg-blue-500 active:scale-95 motion-reduce:transition-none";

export const BUTTON_OUTLINE =
  "inline-flex h-10 items-center justify-center gap-2 rounded-control border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition duration-300 ease-spring hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 motion-reduce:transition-none";