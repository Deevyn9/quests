// Shared look for form controls, so every button and field in a dialog matches the
// outlined pills on the quest cards: same height, same radius, one accent colour.

// The accent colour for "selected" and "on" states. Change it here and it changes everywhere.
export const ACCENT_ON = "border-blue-600 bg-blue-600 text-white";
export const ACCENT_BG = "bg-blue-600";

export const LABEL = "text-sm font-medium text-zinc-900";
export const HINT = "text-xs text-zinc-500";

// Text fields
export const FIELD =
  "h-12.5 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900";

// Pills: all 40px tall. The selected one takes the accent colour.
const PILL_BASE =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border px-4 text-sm font-medium transition duration-300 ease-spring active:scale-95 motion-reduce:transition-none";

export const pill = (selected: boolean) =>
  `${PILL_BASE} ${
    selected ? ACCENT_ON : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
  }`;

// Weekday chips: rounded squares, like the day boxes on a quest card.
export const chip = (selected: boolean) =>
  `grid size-10 place-items-center rounded-xl border text-sm font-medium transition duration-300 ease-spring active:scale-90 motion-reduce:transition-none ${
    selected ? ACCENT_ON : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
  }`;

export const BUTTON_SECONDARY =
  "inline-flex h-10 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 transition duration-300 ease-spring hover:bg-zinc-50 active:scale-95 motion-reduce:transition-none";

// The main action: an almost-white fill, so it stands out from the plain white Cancel
// without adding another colour.
export const BUTTON_PRIMARY =
  "inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-medium text-white transition duration-300 ease-spring hover:bg-blue-700 active:scale-95 motion-reduce:transition-none";

  // Near-white fill with a border: for the main page's "New quest" button
export const BUTTON_NEUTRAL =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-zinc-100 px-5 text-sm font-semibold text-zinc-900 transition duration-300 ease-spring hover:bg-zinc-200 active:scale-95 motion-reduce:transition-none";