import { REVIEW_COPY, type OutlineSubject } from "./subjectCatalogue";
import { SubjectIcon } from "./SubjectIcon";

export function SubjectOutlineCards({ subjects, language }: {
  subjects: readonly OutlineSubject[];
  language: "en" | "fr";
}) {
  const copy = REVIEW_COPY[language];
  return (
    <ul className="homeSubjects homeReviewList">
      {subjects.map((subject) => (
        <li key={`${subject.grade}-${subject.key}`} className={`homeSubject review ${subject.key}`}>
          <details className="subjectOutline">
            <summary>
              <span className="homeSubjectIcon"><SubjectIcon name={subject.key} /></span>
              <span className="homeSubjectText">
                <strong>{subject.name[language]}</strong>
                <small>Basic {subject.grade} · {copy.status}</small>
                <span className="outlineAction">{copy.open}</span>
              </span>
            </summary>
            <div className="subjectOutlineBody">
              <p>{copy.unavailable}</p>
              <p>{copy.guide}</p>
              <a href={subject.outlineUrl} target="_blank" rel="noopener noreferrer">
                {copy.source}<span className="sr-only"> · {subject.name[language]} · Basic {subject.grade}</span>
              </a>
              <a href={subject.sourceIndexUrl} target="_blank" rel="noopener noreferrer">{copy.library}</a>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
