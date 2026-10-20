import React from "react";
import type { EquipmentDevice, ProcessIcon } from "../../../../packages/contracts/outline-visual";

/*
 * In-house line drawings of real computer equipment for Computing lessons.
 * Geometry lives here, never in lesson data: a visual DTO can only name a
 * device and its label. Strokes use currentColor; "paper" and "accent"
 * fills come from the figure's light/dark theme tokens.
 *
 * Scene: 600 × 300 drawn in a viewBox with a margin for the markers
 * (EQUIPMENT_VIEWBOX), desktop computer seen from the front, not to scale.
 * Each device has a fixed place so no part ever hides another, and each
 * numbered marker sits beside its device, not on top of it.
 */

/** Room around the 600 × 300 scene so markers sit beside, not on, the devices. */
export const EQUIPMENT_VIEWBOX = "-24 -4 648 308";

const range = (count: number) => Array.from({ length: count }, (_, i) => i);

function Monitor() {
  return <g data-device="monitor">
    <rect x="30" y="14" width="230" height="146" rx="8" className="paper" />
    <rect x="42" y="26" width="206" height="114" rx="2" className="accent" />
    {/* An open window and the taskbar make it read as a working screen. */}
    <rect x="62" y="40" width="96" height="62" rx="2" className="paper" />
    <line x1="62" y1="50" x2="158" y2="50" />
    {[60, 68, 76, 84].map((y, i) => <line key={y} x1="70" y1={y} x2={i % 2 ? 132 : 148} y2={y} />)}
    <line x1="42" y1="128" x2="248" y2="128" />
    {[50, 64, 78].map(x => <rect key={x} x={x} y="131" width="8" height="6" rx="1" />)}
    <circle cx="145" cy="151" r="2.5" />
    <path d="M135 160 L131 184 L159 184 L155 160" className="paper" />
    <rect x="98" y="184" width="94" height="10" rx="5" className="paper" />
  </g>;
}

function SystemUnit() {
  return <g data-device="system-unit">
    <polyline points="386,20 398,28 398,214 386,220" />
    <rect x="290" y="14" width="96" height="206" rx="6" className="paper" />
    <rect x="302" y="30" width="72" height="16" rx="2" />
    <line x1="314" y1="38" x2="356" y2="38" />
    <rect x="362" y="40" width="8" height="3" rx="1" />
    <rect x="302" y="52" width="72" height="12" rx="2" />
    <circle cx="338" cy="95" r="12" className="accent" />
    <path d="M333.4 90.4 A6.5 6.5 0 1 0 342.6 90.4" />
    <line x1="338" y1="86" x2="338" y2="95" />
    <rect x="318" y="122" width="14" height="6" rx="1" />
    <rect x="344" y="122" width="14" height="6" rx="1" />
    <circle cx="324" cy="140" r="3" />
    <circle cx="336" cy="140" r="3" />
    {[176, 184, 192, 200, 208].map(y => <line key={y} x1="306" y1={y} x2="370" y2={y} />)}
  </g>;
}

function Keyboard() {
  const rows = [222, 238, 254];
  return <g data-device="keyboard">
    <rect x="30" y="212" width="240" height="76" rx="8" className="paper" />
    {rows.map((y, row) => range(11).map(i => <rect key={`${row}-${i}`} x={40 + row * 4 + i * 20} y={y} width="16" height="12" rx="2" />))}
    {[40, 60, 220, 240].map(x => <rect key={x} x={x} y="270" width="16" height="11" rx="2" />)}
    <rect x="80" y="270" width="136" height="11" rx="2" className="accent" />
  </g>;
}

function Mouse() {
  return <g data-device="mouse">
    <path d="M320 232 C338 232 342 246 342 262 C342 280 334 290 320 290 C306 290 298 280 298 262 C298 246 302 232 320 232 Z" className="paper" />
    <line x1="320" y1="232" x2="320" y2="253" />
    <path d="M299 253 Q320 258 341 253" />
    <rect x="317" y="238" width="6" height="11" rx="3" className="accent" />
  </g>;
}

function Printer() {
  return <g data-device="printer">
    <rect x="448" y="78" width="104" height="42" rx="3" />
    <rect x="458" y="66" width="84" height="52" className="paper" />
    <rect x="420" y="112" width="160" height="74" rx="10" className="paper" />
    <rect x="432" y="132" width="30" height="14" rx="2" className="accent" />
    <circle cx="476" cy="139" r="4" />
    <circle cx="490" cy="139" r="4" />
    <circle cx="562" cy="139" r="5" className="accent" />
    <rect x="448" y="160" width="104" height="6" rx="3" />
    <path d="M440 186 L428 206 L572 206 L560 186 Z" className="paper" />
    <rect x="462" y="163" width="76" height="36" className="paper" />
    {[173, 181, 189].map((y, i) => <line key={y} x1="470" y1={y} x2={i === 2 ? 508 : 530} y2={y} />)}
  </g>;
}

const DEVICES: Record<EquipmentDevice, { draw: () => React.ReactElement; marker: [number, number]; plug?: string }> = {
  monitor: { draw: Monitor, marker: [12, 40], plug: "M260 112 C274 112 278 104 290 104" },
  "system-unit": { draw: SystemUnit, marker: [418, 30] },
  keyboard: { draw: Keyboard, marker: [12, 250], plug: "M262 212 C272 202 280 198 290 198" },
  mouse: { draw: Mouse, marker: [366, 268], plug: "M320 232 C320 226 328 224 330 220" },
  printer: { draw: Printer, marker: [598, 44], plug: "M398 150 C408 150 410 166 420 166" },
};

/** The devices in lesson order; cables appear only when the system unit is shown. */
export function EquipmentScene({ devices }: { devices: readonly EquipmentDevice[] }) {
  const tower = devices.includes("system-unit");
  return <g className="equipmentScene">
    {tower && devices.map(d => DEVICES[d].plug && <path key={`cable-${d}`} d={DEVICES[d].plug} className="cable" />)}
    {devices.map(d => { const Draw = DEVICES[d].draw; return <Draw key={d} />; })}
    {devices.map((d, i) => <g key={`marker-${d}`} className="marker">
      <circle cx={DEVICES[d].marker[0]} cy={DEVICES[d].marker[1]} r="17" className="paper" />
      <text x={DEVICES[d].marker[0]} y={DEVICES[d].marker[1] + 8} textAnchor="middle" className="markerText">{i + 1}</text>
    </g>)}
  </g>;
}

/* Process icons, drawn in a 100 × 80 box. */
function SmallMonitor({ children }: { children?: React.ReactNode }) {
  return <>
    <rect x="10" y="2" width="80" height="56" rx="4" className="paper" />
    <rect x="16" y="8" width="68" height="44" rx="1" className="accent" />
    {children}
    <line x1="50" y1="58" x2="50" y2="68" />
    <line x1="34" y1="70" x2="66" y2="70" />
  </>;
}
function Page({ x, y, width, height, lines = 4 }: { x: number; y: number; width: number; height: number; lines?: number }) {
  return <>
    <rect x={x} y={y} width={width} height={height} className="paper" />
    {range(lines).map(i => <line key={i} x1={x + 5} y1={y + 7 + i * 7} x2={x + width - (i % 2 ? 12 : 5)} y2={y + 7 + i * 7} />)}
  </>;
}
const ICONS: Record<ProcessIcon, () => React.ReactElement> = {
  "open-page": () => <SmallMonitor><Page x={34} y={12} width={32} height={36} /></SmallMonitor>,
  "print-shortcut": () => <>
    <rect x="2" y="20" width="44" height="38" rx="6" className="paper" />
    <text x="24" y="45" textAnchor="middle" className="iconText">Ctrl</text>
    <text x="54" y="46" textAnchor="middle" className="iconText">+</text>
    <rect x="62" y="20" width="36" height="38" rx="6" className="paper" />
    <text x="80" y="46" textAnchor="middle" className="iconText">P</text>
  </>,
  "print-preview": () => <SmallMonitor>
    <rect x="30" y="12" width="30" height="36" className="paper" strokeDasharray="3 3" />
    <Page x={34} y={16} width={22} height={26} lines={3} />
    <circle cx="66" cy="36" r="8" className="paper" />
    <line x1="72" y1="42" x2="80" y2="50" />
  </SmallMonitor>,
  "print-settings": () => <>
    <rect x="6" y="4" width="88" height="68" rx="4" className="paper" />
    <line x1="6" y1="15" x2="94" y2="15" />
    <line x1="84" y1="7" x2="89" y2="12" /><line x1="89" y1="7" x2="84" y2="12" />
    <rect x="14" y="22" width="56" height="11" rx="2" />
    <polyline points="62,26 65,29 68,26" />
    <rect x="14" y="40" width="22" height="11" rx="2" />
    <line x1="42" y1="45" x2="70" y2="45" />
    <rect x="58" y="56" width="30" height="11" rx="3" className="accent" />
  </>,
  "printer-output": () => <>
    <rect x="30" y="2" width="40" height="22" className="paper" />
    <rect x="12" y="22" width="76" height="34" rx="6" className="paper" />
    <line x1="26" y1="46" x2="74" y2="46" />
    <circle cx="78" cy="32" r="3" className="accent" />
    <Page x={32} y={48} width={36} height={30} lines={3} />
  </>,
};

/** A step icon scaled into one process box (the box keeps its number badge). */
export function ProcessStepIcon({ icon, x, y, width, height }: { icon: ProcessIcon; x: number; y: number; width: number; height: number }) {
  const scale = Math.min(width / 100, height / 80);
  const Icon = ICONS[icon];
  return <g data-icon={icon} transform={`translate(${x + (width - 100 * scale) / 2} ${y + (height - 80 * scale) / 2}) scale(${scale})`}><Icon /></g>;
}
