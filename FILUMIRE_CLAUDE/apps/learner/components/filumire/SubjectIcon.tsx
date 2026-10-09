/* Subject glyphs shared by the dashboard, subject pages and lessons. */
export function SubjectIcon({ name }: { name: string }) {
  const dots = [12.2, 15, 17.8].flatMap((y) => [8.8, 12, 15.2].map((x) => [x, y]));
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {name === "english" && (
        <g>
          <path d="M12 6c-1.8-1.3-4-1.8-7-1.8v13c3 0 5.2.5 7 1.8 1.8-1.3 4-1.8 7-1.8v-13c-3 0-5.2.5-7 1.8z" />
          <path className="cutline" d="M12 6.4V19" />
        </g>
      )}
      {name === "mathematics" && (
        <g>
          <rect x="5" y="3" width="14" height="18" rx="2.4" />
          <rect className="cut" x="7.6" y="5.6" width="8.8" height="3.6" rx="0.8" />
          {dots.map(([x, y]) => (
            <circle key={`${x}-${y}`} className="cut" cx={x} cy={y} r="0.95" />
          ))}
        </g>
      )}
      {name === "science" && (
        <g>
          <path d="M9.2 3h5.6v1.8h-.9v4.5l4.5 7.7A2.1 2.1 0 0 1 16.6 20H7.4a2.1 2.1 0 0 1-1.8-3.1l4.5-7.6V4.8h-.9z" />
          <path className="cut" d="M8.4 14.6h7.2l1.5 2.6a.7.7 0 0 1-.6 1H7.5a.7.7 0 0 1-.6-1z" />
        </g>
      )}
      {name === "computing" && (
        <g>
          <rect x="3" y="4" width="18" height="12.5" rx="2.2" />
          <rect className="cut" x="5" y="6" width="14" height="8.5" rx="1" />
          <path className="line" d="M9 20.5h6M12 16.5v4" />
        </g>
      )}
    </svg>
  );
}

/* FILU, the learning buddy (the same robot as the navigation icon). */
export function FiluAvatar({ className }: { className?: string }) {
  return (
    <span className={`filuAvatar${className ? ` ${className}` : ""}`} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="3.8" r="1.7" />
        <rect x="11.2" y="5" width="1.6" height="3.2" />
        <rect x="1.5" y="12" width="2.6" height="5" rx="1.3" />
        <rect x="19.9" y="12" width="2.6" height="5" rx="1.3" />
        <rect x="3.8" y="8" width="16.4" height="13" rx="5.5" />
        <circle className="cut" cx="8.8" cy="14" r="1.6" />
        <circle className="cut" cx="15.2" cy="14" r="1.6" />
        <path className="cutline" d="M9.8 17.6c1.2 1.2 3.2 1.2 4.4 0" />
      </svg>
    </span>
  );
}
