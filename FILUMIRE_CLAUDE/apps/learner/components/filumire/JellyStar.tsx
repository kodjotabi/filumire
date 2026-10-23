/*
 * Jelly Star, FILUMIRE's Basic 4-6 feedback character. Decorative only
 * (aria-hidden): every message it carries is also given as text.
 */
export type JellyStarMood = "happy" | "sad" | "calm";

const STAR_POINTS =
  "50,12 61.17,36.63 88.04,39.64 68.07,57.87 73.51,84.36 50,71 26.49,84.36 31.93,57.87 11.96,39.64 38.83,36.63";

export function JellyStar({
  mood,
  size = 72,
}: {
  mood: JellyStarMood;
  size?: number;
}) {
  return (
    <svg
      className={`jellyStar ${mood}`}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <polygon
        points={STAR_POINTS}
        fill="#f2a900"
        stroke="#f2a900"
        strokeWidth="13"
        strokeLinejoin="round"
      />
      <polygon
        points={STAR_POINTS}
        fill={mood === "sad" ? "#ffd980" : "#ffd23f"}
        stroke={mood === "sad" ? "#ffd980" : "#ffd23f"}
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <ellipse cx="38" cy="30" rx="7" ry="4" fill="#ffffff" opacity="0.7" transform="rotate(-30 38 30)" />
      <circle cx="31" cy="38" r="2" fill="#ffffff" opacity="0.7" />

      {mood === "happy" && (
        <g>
          <path d="M37 49 q4.5 -6 9 0 M54 49 q4.5 -6 9 0" fill="none" stroke="#6b3a00" strokeWidth="3" strokeLinecap="round" />
          <path d="M41 56 q9 10 18 0 z" fill="#6b3a00" />
          <path d="M45 59.5 q5 3 10 0" fill="none" stroke="#ff7a8a" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="34" cy="56" r="3.6" fill="#ff9aa8" opacity="0.75" />
          <circle cx="66" cy="56" r="3.6" fill="#ff9aa8" opacity="0.75" />
        </g>
      )}

      {mood === "sad" && (
        <g>
          <path d="M36 46.5 l8 -3 M64 46.5 l-8 -3" fill="none" stroke="#6b3a00" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="41" cy="51" r="2.8" fill="#6b3a00" />
          <circle cx="59" cy="51" r="2.8" fill="#6b3a00" />
          <path d="M44 62 q6 -5 12 0" fill="none" stroke="#6b3a00" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M61 55 q1.6 3 0 4.4 q-1.6 -1.4 0 -4.4 z" fill="#7cc6ff" />
        </g>
      )}

      {mood === "calm" && (
        <g>
          <circle cx="41" cy="50" r="2.8" fill="#6b3a00" />
          <circle cx="59" cy="50" r="2.8" fill="#6b3a00" />
          <path d="M43 58 q7 5 14 0" fill="none" stroke="#6b3a00" strokeWidth="2.8" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
