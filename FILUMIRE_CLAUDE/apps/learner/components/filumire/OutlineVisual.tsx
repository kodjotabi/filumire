import React, { useId } from "react";
import { validOutlineVisual, type OutlineVisual as Visual, type VisualStage } from "../../../../packages/contracts/outline-visual";
import { EQUIPMENT_VIEWBOX, EquipmentScene, ProcessStepIcon } from "./EquipmentDrawings";

/** Only safe DTOs, never authored content, metadata, assessment keys or raw SVG. */
export function OutlineVisual({ visual }: { visual: Visual }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  if (!validOutlineVisual(visual)) return null;
  const model = visual.model;
  const rows = model.kind === "part-whole" ? model.fractions.length : 0;
  const stepIcons = model.kind === "process" && model.icons ? model.icons : undefined;
  const height = rows ? rows * 86 + 10 : model.kind === "number-line" ? 110 : model.kind === "process" ? (model.icons ? 146 : 100) : model.kind === "sentence-strip" ? 220 : 300;
  return <figure className="outlineFigure" lang={visual.language} data-outline-id={visual.id} data-outline-stage={visual.stage}>
    <svg className={stepIcons ? "stepRow" : undefined} viewBox={model.kind === "equipment" ? EQUIPMENT_VIEWBOX : `0 0 600 ${height}`} role="img" aria-labelledby={`${uid}-title ${uid}-desc`} preserveAspectRatio="xMidYMid meet">
      <title id={`${uid}-title`}>{visual.title}</title><desc id={`${uid}-desc`}>{visual.description}</desc>
      <defs><pattern id={`${uid}-hatch`} width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 10 L10 0" className="hatch" /></pattern></defs>
      {model.kind === "part-whole" && model.fractions.map((f, row) => <g key={row} data-fraction={`${f.numerator}/${f.denominator}`}>
        <rect x="70" y={12 + row * 86} width="460" height="46" className="paper" />
        {Array.from({ length: f.numerator }, (_, index) => <rect key={index} data-shaded-part="true" x={70 + index * 460 / f.denominator} y={12 + row * 86} width={460 / f.denominator} height="46" className="accent" />)}
        <rect x="70" y={12 + row * 86} width={460 * f.numerator / f.denominator} height="46" fill={`url(#${uid}-hatch)`} stroke="none" />
        {Array.from({ length: f.denominator - 1 }, (_, i) => <line key={i} x1={70 + (i + 1) * 460 / f.denominator} x2={70 + (i + 1) * 460 / f.denominator} y1={12 + row * 86} y2={58 + row * 86} />)}
        <rect x="70" y={12 + row * 86} width="460" height="46" fill="none" />
        <text x="300" y={82 + row * 86} textAnchor="middle">{f.numerator}/{f.denominator}</text>
      </g>)}
      {model.kind === "number-line" && <>
        <line x1="45" x2="555" y1="45" y2="45" />
        {Array.from({ length: model.divisions + 1 }, (_, i) => <g key={i}>
          <line x1={45 + i * 510 / model.divisions} x2={45 + i * 510 / model.divisions} y1="34" y2="56" />
          {(i === 0 || i === model.divisions || i === model.marked) && <text x={45 + i * 510 / model.divisions} y="90" textAnchor="middle">{model.format === "fraction"
            ? i === 0 ? "0" : i === model.divisions ? "1" : `${i}/${model.divisions}`
            : new Intl.NumberFormat(visual.language, { maximumFractionDigits: 2 }).format(model.start + i * (model.end - model.start) / model.divisions)}</text>}
        </g>)}
        <circle cx={45 + model.marked * 510 / model.divisions} cy="45" r="9" className="accent" />
      </>}
      {model.kind === "labelled-diagram" && <>
        {model.shapes.map((s, i) => s.kind === "rect" ? <rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} className={s.accent ? "accent" : "paper"} />
          : s.kind === "ellipse" ? <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} className={s.accent ? "accent" : "paper"} />
            : s.kind === "line" ? <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
              : <polyline key={i} points={s.points.map(p => `${p.x},${p.y}`).join(" ")} fill="none" />)}
        {model.labels.map((label, i) => <g key={i}><circle cx={label.x} cy={label.y} r="20" className="paper" /><text x={label.x} y={label.y + 9} textAnchor="middle">{i + 1}</text></g>)}
      </>}
      {model.kind === "sentence-strip" && model.parts.map((part, i) => <g key={i}>
        <rect x={15 + i * 570 / model.parts.length} y="70" width={550 / model.parts.length} height="120" rx="10" className={i === 0 ? "accent" : "paper"} />
        <text x={15 + i * 570 / model.parts.length + 275 / model.parts.length} y="50" textAnchor="middle">{part.label}</text>
        <text x={15 + i * 570 / model.parts.length + 275 / model.parts.length} y="140" textAnchor="middle" lang={part.language}>{part.text}</text>
      </g>)}
      {model.kind === "process" && model.steps.map((_, i) => <g key={i}>
        {model.icons ? <>
          <rect x={10 + i * 580 / model.steps.length} y="10" width={480 / model.steps.length} height="126" rx="8" className="paper" />
          <ProcessStepIcon icon={model.icons[i]} x={14 + i * 580 / model.steps.length} y={46} width={480 / model.steps.length - 8} height={86} />
          <circle cx={28 + i * 580 / model.steps.length} cy="28" r="15" className="accent" />
          <text x={28 + i * 580 / model.steps.length} y="36" textAnchor="middle" className="markerText">{i + 1}</text>
        </> : <>
          <rect x={10 + i * 580 / model.steps.length} y="20" width={480 / model.steps.length} height="60" rx="8" className="paper" />
          <text x={10 + i * 580 / model.steps.length + 240 / model.steps.length} y="56" textAnchor="middle">{i + 1}</text>
        </>}
        {i < model.steps.length - 1 && <path d={`M${10 + i * 580 / model.steps.length + 480 / model.steps.length} ${model.icons ? 73 : 50} h${100 / model.steps.length - 5} m-5 -5 l5 5 l-5 5`} fill="none" />}
      </g>)}
      {model.kind === "equipment" && <EquipmentScene devices={model.devices.map(d => d.device)} />}
    </svg>
    <figcaption><strong>{visual.title}</strong><p>{visual.description}</p></figcaption>
    {model.kind === "labelled-diagram" && <ol>{model.labels.map((label, i) => <li key={i}>{label.text}</li>)}</ol>}
    {model.kind === "equipment" && <ol>{model.devices.map((d, i) => <li key={d.device}>{d.label}</li>)}</ol>}
    {model.kind === "sentence-strip" && <ol className="sentenceParts">{model.parts.map((part, i) => <li key={i}><strong>{part.label}</strong><span lang={part.language}>{part.text}</span></li>)}</ol>}
    {model.kind === "process" && <ol className="processSteps">{model.steps.map((step, i) => <li key={i}>
      {/* On phones the row is too small, so each step shows its own drawing here instead. */}
      <div className="stepBody">
        {stepIcons && <svg className="stepIcon" viewBox="0 0 100 80" aria-hidden="true" focusable="false"><ProcessStepIcon icon={stepIcons[i]} x={0} y={0} width={100} height={80} /></svg>}
        <span>{step}</span>
      </div>
    </li>)}</ol>}
    <style jsx>{`
      .outlineFigure { margin: 16px 0; padding: 16px; border: 1px solid var(--filumire-border, #dfe8ef); border-radius: 12px; color: var(--filumire-text, #12304a); background: var(--filumire-surface, #fff); min-width: 0; max-width: 100%; }
      svg { display: block; width: 100%; max-width: 640px; height: auto; margin: auto; overflow: visible; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      svg :global(line), svg :global(rect), svg :global(ellipse), svg :global(circle), svg :global(path), svg :global(polyline) { vector-effect: non-scaling-stroke; }
      svg :global(text) { fill: currentColor; stroke: none; font: 28px sans-serif; }
      svg :global(.paper) { fill: var(--filumire-surface, #fff); }
      svg :global(.accent) { fill: var(--filumire-blue-soft, #eaf7fd); }
      svg :global(.hatch) { stroke: var(--filumire-navy, #003b71); stroke-width: 1; }
      svg :global(.markerText) { font-size: 24px; font-weight: 700; }
      svg :global(.iconText) { font-size: 15px; font-weight: 700; }
      svg :global(.cable) { stroke-dasharray: 6 5; }
      figcaption, p, li { overflow-wrap: break-word; line-height: 1.5; font-size: 16px; }
      p { margin: 6px 0; } ol { padding-left: 26px; margin-bottom: 0; } li { margin: 6px 0; }
      .sentenceParts, .processSteps { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); }
      .sentenceParts li span { display: block; }
      :global(.learnerUi[data-appearance="dark"]) .outlineFigure { --filumire-text: #e5efff; --filumire-surface: #203752; --filumire-blue-soft: #315577; --filumire-border: #839fbe; --filumire-navy: #d5ebff; }
      .stepIcon { display: none; }
      @media (max-width: 480px) {
        .outlineFigure { padding: 12px; }
        svg.stepRow { display: none; }
        .processSteps:has(.stepIcon) { list-style: none; padding-left: 0; counter-reset: step; }
        .stepBody:has(.stepIcon) { display: flex; align-items: center; gap: 10px; }
        .stepBody:has(.stepIcon)::before { counter-increment: step; content: counter(step) "."; font-weight: 700; min-width: 1.4em; }
        .stepIcon { display: block; flex: 0 0 88px; width: 88px; height: auto; margin: 0; }
        .stepIcon :global(.iconText) { font-size: 16px; }
      }
    `}</style>
  </figure>;
}
export function OutlineVisuals({ visuals, competencyId, contentId, contentVersion, language, stage }: {
  visuals?: Visual[]; competencyId: string; contentId?: string; contentVersion?: string; language: "en" | "fr"; stage: VisualStage;
}) {
  if (!Array.isArray(visuals) || visuals.length > 8) return null;
  return <>{visuals?.filter(v => validOutlineVisual(v) && v.competencyId === competencyId && (!contentId || v.contentId === contentId) && (!contentVersion || v.contentVersion === contentVersion) && v.language === language && v.stage === stage)
    .map(v => <OutlineVisual key={`${v.id}/${v.contentId}/${v.language}`} visual={v} />)}</>;
}
export function ActivityOutlineVisuals({ visuals, content, decision, language }: {
  visuals?: Visual[];
  content?: { id: string; version?: string; type: string; competencyId: string; language?: string; assessmentItemId?: string };
  decision: { action: string; competencyId: string }; language: "en" | "fr";
}) {
  if (!content || !content.version || content.assessmentItemId || content.competencyId !== decision.competencyId || content.language !== language ||
    !["lesson", "example", "scaffold", "remediation"].includes(content.type) || !["teach", "remediate"].includes(decision.action)) return null;
  return <OutlineVisuals visuals={visuals} contentId={content.id} contentVersion={content.version} competencyId={decision.competencyId} language={language} stage="Understand" />;
}
