import Link from "next/link";

import { subjectLabel, type FilumireSubject } from "./subjects";

type SubjectGridProps = {
  language?: "en" | "fr";
  subjects: readonly FilumireSubject[];
  currentSubjectId?: string | null;
  compact?: boolean;
};

function subjectCopy(
  subject: FilumireSubject,
  language: "en" | "fr",
) {
  if (language === "fr") {
    if (subject.key === "english") {
      return "Lire. Penser. Communiquer.";
    }

    if (subject.key === "mathematics") {
      return "Explorer. R\u00e9soudre. Grandir.";
    }

    if (subject.key === "science") {
      return "D\u00e9couvrir. Demander. Comprendre.";
    }

    return "Cr\u00e9er. Explorer. \u00catre pr\u00eat.";
  }

  if (subject.key === "english") {
    return "Read. Think. Communicate.";
  }

  if (subject.key === "mathematics") {
    return "Explore. Solve. Grow.";
  }

  if (subject.key === "science") {
    return "Discover. Ask. Find out.";
  }

  return "Create. Explore. Be ready.";
}

function SubjectGlyph({
  subject,
}: {
  subject: FilumireSubject;
}) {
  if (subject.key === "english") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M5 8c4-1 7-.2 11 2.2V26c-4-2.4-7-3.2-11-2.2V8Z" />
        <path d="M27 8c-4-1-7-.2-11 2.2V26c4-2.4 7-3.2 11-2.2V8Z" />
      </svg>
    );
  }

  if (subject.key === "mathematics") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="8" y="4" width="16" height="24" rx="2.5" />
        <path
          className="glyphCutout"
          d="M11 7h10v5H11zM11 15h2v2h-2zM15 15h2v2h-2zM19 15h2v2h-2zM11 19h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2zM11 23h2v2h-2zM15 23h2v2h-2zM19 23h2v2h-2z"
        />
      </svg>
    );
  }

  if (subject.key === "science") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M12 4h8v3l-2 1v5l7 10.5A2.8 2.8 0 0 1 22.7 28H9.3A2.8 2.8 0 0 1 7 23.5L14 13V8l-2-1V4Z" />
        <path
          className="glyphCutout"
          d="M11 21h10l2.3 4H8.7L11 21Z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="5" y="6" width="22" height="16" rx="2.5" />
      <rect
        className="glyphCutout"
        x="8"
        y="9"
        width="16"
        height="10"
        rx="1"
      />
      <path d="M13 24h6l2 3H11l2-3Z" />
    </svg>
  );
}

const COMPACT_TINTS: Record<string, { bg: string; accent: string }> = {
  english: { bg: "#dcecfb", accent: "#0f7cf5" },
  mathematics: { bg: "#fdf1d9", accent: "#f59a00" },
  science: { bg: "#dff6e6", accent: "#12b350" },
  computing: { bg: "#ece8fb", accent: "#8466dc" },
};

export function SubjectGrid({
  language = "en",
  subjects,
  currentSubjectId,
  compact = false,
}: SubjectGridProps) {
  return (
    <div className={`filumireSubjectGrid${compact ? " compact" : ""}`}>
      {subjects.map((subject) => {
        const current =
          Boolean(currentSubjectId) &&
          subject.subjectId === currentSubjectId;

        const cardStyle = {
          background: compact ? (COMPACT_TINTS[subject.key]?.bg ?? subject.softAccent) : subject.softAccent,
          borderColor: current
            ? subject.accent
            : "transparent",
        };
        const content = (
          <>
            <span
              className="filumireSubjectBadge"
              style={{ background: compact ? (COMPACT_TINTS[subject.key]?.accent ?? subject.accent) : subject.accent, color: compact ? (COMPACT_TINTS[subject.key]?.accent ?? subject.accent) : undefined }}
              aria-hidden="true"
            >
              <SubjectGlyph subject={subject} />
            </span>

            <span className="filumireSubjectName">
              {subjectLabel(subject.name, language)}
            </span>

            <span className="filumireSubjectAction">
              {subjectCopy(subject, language)}
            </span>
          </>
        );

        // The compact grid is the first-time setup preview. Setup must be
        // finished before a subject can open, so these cards are not links.
        return compact ? (
          <div
            key={subject.subjectId}
            className={`filumireSubjectCard subject-${subject.key}`}
            style={cardStyle}
          >
            {content}
          </div>
        ) : (
          <Link
            key={subject.subjectId}
            href={`/dashboard?lang=${language}&view=learning&subjectId=${encodeURIComponent(
              subject.subjectId,
            )}`}
            className={`filumireSubjectCard subject-${subject.key}`}
            style={cardStyle}
          >
            {content}
          </Link>
        );
      })}
      <style jsx>{`
        .filumireSubjectGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .filumireSubjectCard {
          display: grid;
          grid-template-columns: 34px 1fr;
          grid-template-rows: auto auto;
          column-gap: 8px;
          align-items: center;
          min-height: 66px;
          padding: 9px 10px;
          border: 2px solid transparent;
          border-radius: 10px;
          color: #003b71;
          text-decoration: none;
        }

        .filumireSubjectBadge {
          grid-row: 1 / 3;
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
        }

        .filumireSubjectBadge :global(svg) {
          width: 21px;
          height: 21px;
          fill: #ffffff;
        }

        .filumireSubjectBadge :global(.glyphCutout) {
          fill: currentColor;
        }

        .filumireSubjectName {
          align-self: end;
          font-size: 14px;
          line-height: 1.05;
          font-weight: 800;
          color: #003b71;
        }

        .filumireSubjectAction {
          align-self: start;
          margin-top: 2px;
          font-size: 9px;
          line-height: 1.15;
          font-weight: 500;
          color: #003b71;
        }

        .filumireSubjectGrid.compact {
          gap: 8px;
        }

        .filumireSubjectGrid.compact :global(.filumireSubjectCard) {
          display: grid;
          grid-template-columns: 28px 1fr;
          grid-template-rows: auto auto;
          align-content: center;
          align-items: center;
          column-gap: 7px;
          min-height: 56px;
          padding: 8px 8px;
          border: 0;
          border-radius: 14px;
          color: #003b71;
          text-decoration: none;
        }

        .filumireSubjectGrid.compact .filumireSubjectBadge {
          width: 28px;
          height: 28px;
          border-radius: 50%;
        }

        .filumireSubjectGrid.compact .filumireSubjectBadge :global(svg) {
          width: 18px;
          height: 18px;
        }

        .filumireSubjectGrid.compact .filumireSubjectName {
          justify-self: start;
          text-align: left;
          font-size: 13px;
        }

        .filumireSubjectGrid.compact .filumireSubjectAction {
          justify-self: start;
          text-align: left;
          margin-top: 3px;
          font-size: 8px;
        }

        @media (min-width: 768px) {
          .filumireSubjectGrid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
          }

          .filumireSubjectGrid.compact :global(.filumireSubjectCard) {
            min-height: 72px;
            padding: 12px;
          }

          .filumireSubjectGrid.compact .filumireSubjectName {
            font-size: 14px;
          }

          .filumireSubjectGrid.compact .filumireSubjectAction {
            font-size: 11px;
          }
        }

        @media (max-width: 360px) {
          .filumireSubjectCard {
            grid-template-columns: 30px 1fr;
            column-gap: 6px;
            padding: 8px;
          }

          .filumireSubjectName {
            font-size: 12px;
          }

          .filumireSubjectAction {
            font-size: 8px;
          }
        }
      `}</style>
    </div>
  );
}