import type { CSSProperties } from "react";

// Spread across the whole card, big enough to see, and fixed in place.
// The same numbers every render, so the server and browser always agree.
const FLAKES = [
  { x: 5, y: 12, size: 30, rot: 10 },
  { x: 24, y: 72, size: 24, rot: -20 },
  { x: 38, y: 8, size: 22, rot: 35 },
  { x: 52, y: 80, size: 34, rot: 0 },
  { x: 66, y: 16, size: 28, rot: -15 },
  { x: 83, y: 62, size: 38, rot: 25 },
  { x: 94, y: 10, size: 24, rot: -30 },
  { x: 10, y: 46, size: 36, rot: 15 },
  { x: 46, y: 42, size: 26, rot: -10 },
  { x: 75, y: 90, size: 22, rot: 40 },
  { x: 30, y: 26, size: 20, rot: -35 },
  { x: 58, y: 58, size: 30, rot: 5 },
];

// Jagged white lines across the card, like cracks in ice. They are drawn on a
// 100 x 100 grid that stretches to fit the card.
const CRACKS = [
  "M0 18 L12 24 L20 20 L31 34 L38 31 L47 46",
  "M31 34 L28 48 L35 58",
  "M100 30 L88 36 L80 33 L70 47 L62 44 L55 60",
  "M70 47 L74 62 L68 72",
  "M22 100 L27 88 L36 84 L41 72 L52 70",
  "M64 100 L60 90 L68 82 L66 74",
  "M58 0 L52 12 L57 20 L48 30",
  "M0 70 L10 66 L16 74 L26 70",
  "M100 78 L90 82 L86 92",
];

function Flake() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-full text-white"
    >
      {[0, 60, 120].map((deg) => (
        <g key={deg} transform={`rotate(${deg} 12 12)`}>
          <path d="M12 2v20" />
          <path d="M9.5 4.5 12 7l2.5-2.5" />
          <path d="M9.5 19.5 12 17l2.5 2.5" />
        </g>
      ))}
    </svg>
  );
}

// Sits behind the card's content. `active` fades it in; turning it off fades it out
// (the card keeps it mounted for a moment, see useLingering). Changing `burst`
// remounts the cracks and flakes, which makes the frost form again.
export function FrostOverlay({
  burst,
  active,
}: {
  burst: number;
  active: boolean;
}) {
  return (
    <div
      aria-hidden
      data-frost
      className={`ice-frame ${
        active ? "frost-in" : "frost-out"
      } pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl`}
    >
      <svg
        key={`ice-${burst}`}
        data-ice
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
      >
        {CRACKS.map((d, i) => (
          <path
            key={i}
            d={d}
            className="ice-crack"
            style={{ "--delay": `${i * 0.1}s` } as CSSProperties}
          />
        ))}
      </svg>

      <div key={`snow-${burst}`} data-snow>
        {FLAKES.map((f, i) => (
          <span
            key={i}
            className="snowflake absolute"
            style={
              {
                left: `${f.x}%`,
                top: `${f.y}%`,
                width: f.size,
                height: f.size,
                marginLeft: -f.size / 2,
                marginTop: -f.size / 2,
                "--rot": `${f.rot}deg`,
                "--delay": `${(i % 6) * 0.08}s`,
              } as CSSProperties
            }
          >
            <Flake />
          </span>
        ))}
      </div>
    </div>
  );
}
