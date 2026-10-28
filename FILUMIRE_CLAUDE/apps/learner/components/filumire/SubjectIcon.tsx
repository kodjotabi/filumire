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
      {/* Curriculum Review subjects (see subjectCatalogue.ts). */}
      {name === "ghanaian-language" && (
        <g>
          <path d="M6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4V16A2.5 2.5 0 0 1 4 13.5v-8A2.5 2.5 0 0 1 6.5 3z" />
          {[8.5, 12, 15.5].map((x) => (
            <circle key={x} className="cut" cx={x} cy="9.5" r="1.1" />
          ))}
        </g>
      )}
      {name === "french" && (
        <g>
          <path d="M6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4V16A2.5 2.5 0 0 1 4 13.5v-8A2.5 2.5 0 0 1 6.5 3z" />
          <path className="cutline" d="M8 7.8h8M8 11.2h5" />
        </g>
      )}
      {name === "arabic" && (
        <g>
          <path d="M17.5 3h-11A2.5 2.5 0 0 0 4 5.5v8A2.5 2.5 0 0 0 6.5 16H13l4.5 4V16a2.5 2.5 0 0 0 2.5-2.5v-8A2.5 2.5 0 0 0 17.5 3z" />
          <path className="cutline" d="M16.5 9.5c-.75 1.2-1.5 1.2-2.25 0s-1.5-1.2-2.25 0-1.5 1.2-2.25 0-1.5-1.2-2.25 0" />
        </g>
      )}
      {name === "creative-arts-design" && (
        <g>
          <path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.8-1.7h2.1A4.3 4.3 0 0 0 21 11c0-4.4-4-8-9-8z" />
          {[[7.5, 11.5], [9.5, 7.5], [14.5, 7.5], [17, 11]].map(([x, y]) => (
            <circle key={`${x}-${y}`} className="cut" cx={x} cy={y} r="1.4" />
          ))}
        </g>
      )}
      {name === "career-technology" && (
        <g>
          <path className="line" d="M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8" />
          <rect x="3" y="8" width="18" height="12" rx="2" />
          <path className="cutline" d="M3.8 13.5h6.2M14 13.5h6.2" />
          <rect className="cut" x="10.5" y="12" width="3" height="3" rx="0.6" />
        </g>
      )}
      {name === "social-studies" && (
        <g>
          <circle cx="12" cy="12" r="9" />
          <path className="cutline" d="M3.6 12h16.8M12 3.3c2.6 2.4 3.8 5.3 3.8 8.7s-1.2 6.3-3.8 8.7M12 3.3C9.4 5.7 8.2 8.6 8.2 12s1.2 6.3 3.8 8.7" />
        </g>
      )}
      {name === "rme" && (
        <g>
          <path d="M12 20.3l-1.3-1.2C6 14.9 3 12.1 3 8.6A4.6 4.6 0 0 1 7.6 4c1.7 0 3.3.8 4.4 2.1A5.8 5.8 0 0 1 16.4 4 4.6 4.6 0 0 1 21 8.6c0 3.5-3 6.3-7.7 10.5z" />
        </g>
      )}
      {name === "physical-health-education" && (
        <g>
          <circle cx="12" cy="12" r="9" />
          <path className="cut" d="M12 8.2l3.2 2.3-1.2 3.8h-4l-1.2-3.8z" />
          <path className="cutline" d="M12 8.2V3.6M15.2 10.5l4.3-1.6M14 14.3l2.6 3.8M10 14.3l-2.6 3.8M8.8 10.5L4.5 8.9" />
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
