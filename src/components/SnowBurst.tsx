import type { CSSProperties } from "react";
import { SnowflakeIcon } from "./Icons";

// Fixed numbers rather than Math.random(), so the server and browser render the same thing.
const FLAKES = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 37 + 7) % 90,
  y: (i * 23 + 5) % 55,
  size: 10 + ((i * 7) % 3) * 4,
  drift: ((i % 5) - 2) * 10,
  fall: 40 + ((i * 11) % 5) * 12,
  spin: (i % 2 ? 1 : -1) * (90 + (i % 4) * 40),
  delay: (i % 8) * 0.07,
  duration: 1.6 + (i % 4) * 0.25,
}));

// Changing `burst` remounts the flakes, which replays the animation.
export function SnowBurst({ burst }: { burst: number }) {
  return (
    <div
      aria-hidden
      data-snow
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
    >
      <div key={burst}>
        {FLAKES.map((f, i) => (
          <span
            key={i}
            className="snowflake absolute"
            style={
              {
                left: `${(f.x + burst * 17) % 90}%`,
                top: `${f.y}%`,
                width: f.size,
                height: f.size,
                "--drift": `${f.drift}px`,
                "--fall": `${f.fall}px`,
                "--spin": `${f.spin}deg`,
                "--delay": `${f.delay}s`,
                "--dur": `${f.duration}s`,
              } as CSSProperties
            }
          >
            <SnowflakeIcon className="size-full text-white" />
          </span>
        ))}
      </div>
    </div>
  );
}
