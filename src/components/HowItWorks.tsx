const STEPS = [
  {
    title: "Pick a challenge",
    text: "A day, a week, a month or forever. Skip the days you want off, like weekends.",
  },
  {
    title: "Check in every day",
    text: "Cross off today's box. Each day in a row grows your streak.",
  },
  {
    title: "Freeze it when life happens",
    text: "Put a quest on hold and your streak waits for you instead of breaking.",
  },
  {
    title: "Earn restores and trophies",
    text: "Finish quests and hit milestones to rescue a streak you missed.",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works">
      <h2
        id="how-it-works"
        className="mb-4 text-xs font-medium tracking-wide text-zinc-500 uppercase"
      >
        How it works
      </h2>
      <ol className="flex flex-col gap-5">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-4">
            <span className="grid size-7 shrink-0 place-items-center rounded-full border border-zinc-300 text-sm font-medium tabular-nums">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium">{step.title}</p>
              <p className="mt-0.5 text-sm text-zinc-500">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
