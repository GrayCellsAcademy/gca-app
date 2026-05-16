import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";
import {
  genColMultiplyStage1, genColMultiplyStage2, genColMultiplyStage3,
  genLongDivision, genLongDivisionZeroMiddle,
  genRectangleArea, genSquareArea, genCompositeShapeArea,
  gradeColMultiply, gradeLongDivision, gradeRectangleArea,
  gradeSquareArea, gradeCompositeArea,
} from "./lesson03Questions";

export const LESSON03_MASTERY_TOPIC_ID = "lesson03-mastery-v1";

const MASTERY_STREAK = 3;

// - Shared UI -
function CountdownRing({ seconds, total }) {
  const r = 24, circ = 2 * Math.PI * r;
  const pct = Math.max(0, seconds / total);
  const danger = seconds <= 3, warn = seconds <= 6;
  const color = danger ? "var(--red)" : warn ? "var(--amber)" : "var(--green)";
  return (
    <div style={{ position: "relative", width: 60, height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={60} height={60} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
        <circle cx={30} cy={30} r={r} fill="none" stroke="var(--surface2)" strokeWidth={4} />
        <circle cx={30} cy={30} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }} />
      </svg>
      <span style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700, color }}>{seconds}</span>
    </div>
  );
}

function StreakDots({ current, needed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
      {Array.from({ length: needed }).map((_, i) => (
        <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: i < current ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < current ? "var(--green)" : "var(--border2)"), transition: "all 0.2s" }} />
      ))}
      <span style={{ fontSize: 12, color: "var(--text3)", marginLeft: 4 }}>{current}/{needed}</span>
    </div>
  );
}

function NumInput({ onSubmit, placeholder, disabled, isDivision }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(() => ref.current?.focus(), 80); }, [disabled]);
  const submit = () => {
    if (!val.trim()) return;
    onSubmit(val.trim());
    setVal("");
  };
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      <input ref={ref} value={val}
        onChange={e => setVal(isDivision ? e.target.value.replace(/[^0-9rR]/g, "") : e.target.value.replace(/[^0-9]/g, ""))}
        onKeyDown={e => e.key === "Enter" && submit()}
        inputMode={isDivision ? "text" : "numeric"}
        placeholder={placeholder || "?"}
        disabled={disabled}
        style={{ textAlign: "center", fontSize: 30, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: isDivision ? 140 : 120 }} />
      <button className="btn btn-primary" style={{ fontSize: 18, padding: "10px 20px" }}
        onMouseDown={e => { e.preventDefault(); submit(); }}
        onTouchEnd={e => { e.preventDefault(); submit(); }}
        disabled={disabled || !val.trim()}>OK</button>
    </div>
  );
}

// - ColumnMultiplyWork (from Lesson03Session) -
function ColumnMultiplyWork({ a, b }) {
  const bStr = String(b), aStr = String(a);
  const product = a * b;
  const maxLen = Math.max(aStr.length + bStr.length, String(product).length) + 2;
  const CW = 28, CH = 36, OW = 32;
  const W = OW + maxLen * CW + 12;
  const carryH = 22;
  const bDigitsR = bStr.split("").map(Number).reverse();
  const totalRows = 2 + bDigitsR.length + (bDigitsR.length > 1 ? 1 : 0);
  const H = carryH * bDigitsR.length + CH * totalRows + 20;
  const carryStripH = carryH * bDigitsR.length + 4;
  const rowY = (r) => carryStripH + CH * r + CH * 0.75;
  const carryY = (pi) => rowY(0) - (pi + 1) * (carryH + 2);
  const line1Y = rowY(1) + CH * 0.28;
  const lastPartialRow = 1 + bDigitsR.length;
  const line2Y = rowY(lastPartialRow) + CH * 0.28;
  const productRow = lastPartialRow + (bDigitsR.length > 1 ? 1 : 0);
  const rowText = (num, r, color) => {
    const s = String(Math.round(Math.abs(num))).padStart(maxLen, " ");
    return s.split("").map((ch, i) => ch !== " " ? (
      <text key={i} x={OW + i * CW + CW / 2} y={rowY(r)} textAnchor="middle"
        fontSize="20" fontWeight={color === "var(--green)" ? "800" : "700"}
        fill={color} fontFamily="var(--mono)">{ch}</text>
    ) : null);
  };
  return (
    <svg width={W} height={H} style={{ display: "block", margin: "0 auto" }}>
      {rowText(a, 0, "var(--text)")}
      <text x={OW - 4} y={rowY(1)} textAnchor="end" fontSize="18" fill="var(--text3)" fontFamily="var(--mono)">x</text>
      {rowText(b, 1, "var(--text)")}
      <line x1={OW} y1={line1Y} x2={OW + maxLen * CW} y2={line1Y} stroke="var(--text)" strokeWidth="2" />
      {bDigitsR.map((d, pi) => {
        const partial = a * d * Math.pow(10, pi);
        const aDigitsR = aStr.split("").map(Number).reverse();
        let carry = 0; const carries = [];
        for (let i = 0; i < aDigitsR.length; i++) {
          const prod = aDigitsR[i] * d + carry;
          carry = Math.floor(prod / 10);
          carries.push({ col: maxLen - 2 - i - pi, val: carry });
        }
        return (
          <g key={pi}>
            {carries.map((c, ci) => c.val > 0 && c.col >= 0 ? (
              <text key={ci} x={OW + c.col * CW + CW / 2} y={carryY(pi)}
                textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--blue)" fontFamily="var(--mono)">{c.val}</text>
            ) : null)}
            {rowText(partial, pi + 2, "var(--text2)")}
          </g>
        );
      })}
      {bDigitsR.length > 1 && <line x1={OW} y1={line2Y} x2={OW + maxLen * CW} y2={line2Y} stroke="var(--text)" strokeWidth="2" />}
      {rowText(product, productRow, "var(--green)")}
    </svg>
  );
}

// - LongDivisionWork -
function LongDivisionWork({ dividend, divisor, quotient, remainder }) {
  const dvStr = String(dividend);
  const nDigits = dvStr.length;
  const CW = 30, CH = 40, OW = 50, HEADER = 46;
  const steps = [];
  let working = 0, started = false;
  for (let i = 0; i < nDigits; i++) {
    working = working * 10 + parseInt(dvStr[i]);
    if (!started && working < divisor && i < nDigits - 1) continue;
    started = true;
    const q = Math.floor(working / divisor);
    const sub = q * divisor;
    const diff = working - sub;
    steps.push({ col: i, working, q, sub, diff });
    working = diff;
  }
  let cursor = HEADER + CH;
  const positioned = steps.map((step, si) => {
    const isFirst = si === 0;
    let pos;
    if (isFirst) {
      pos = { workY: null, subY: cursor + CH * 0.72, lineY: cursor + CH + 4, diffY: cursor + CH + CH * 0.72, advance: CH * 2 };
    } else if (step.q === 0) {
      pos = { workY: cursor + CH * 0.72, subY: null, lineY: cursor + CH + 4, diffY: cursor + CH + CH * 0.72, advance: CH * 2 };
    } else {
      pos = { workY: cursor + CH * 0.72, subY: cursor + CH + CH * 0.72, lineY: cursor + CH * 2 + 4, diffY: cursor + CH * 2 + CH * 0.72, advance: CH * 3 };
    }
    cursor += pos.advance;
    return { ...step, ...pos };
  });
  const W = OW + nDigits * CW + 50;
  const H = cursor + CH + 16;
  const cx = (col) => OW + col * CW + CW / 2;
  const rn = (num, rightCol, y, color, size, opacity) => {
    const s = String(num);
    return s.split("").map((ch, ki) => {
      const col = rightCol - s.length + 1 + ki;
      if (col < 0) return null;
      return <text key={ki} x={cx(col)} y={y} textAnchor="middle" fontSize={size} fontWeight="700" fill={color} opacity={opacity ?? 1} fontFamily="var(--mono)">{ch}</text>;
    });
  };
  const lineX = (step) => {
    const nums = [step.working, step.q > 0 ? step.sub : 0].filter(n => n > 0);
    const maxLen = Math.max(...nums.map(n => String(n).length), 1);
    return { left: cx(Math.max(0, step.col - maxLen + 1)) - 5, right: cx(step.col) + CW * 0.4 };
  };
  const lastDiffY = positioned.length > 0 ? positioned[positioned.length - 1].diffY : H - 16;
  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={W} height={H} style={{ display: "block", margin: "0 auto", minWidth: W }}>
        <text x={OW - 8} y={HEADER + CH * 0.78} textAnchor="end" fontSize="24" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{divisor}</text>
        <line x1={OW - 2} y1={HEADER + CH * 0.18} x2={OW - 2} y2={HEADER + CH} stroke="var(--text)" strokeWidth="2.5" />
        <line x1={OW - 2} y1={HEADER + CH * 0.18} x2={OW + nDigits * CW + 4} y2={HEADER + CH * 0.18} stroke="var(--text)" strokeWidth="2.5" />
        {dvStr.split("").map((ch, ci) => (
          <text key={ci} x={cx(ci)} y={HEADER + CH * 0.78} textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{ch}</text>
        ))}
        {positioned.map((step, si) => (
          <text key={si} x={cx(step.col)} y={HEADER - 8} textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--green)" fontFamily="var(--mono)">{step.q}</text>
        ))}
        {positioned.map((step, si) => {
          const isLast = si === positioned.length - 1;
          const { left: ll, right: lr } = lineX(step);
          return (
            <g key={si}>
              {step.workY !== null && rn(step.working, step.col, step.workY, "var(--text3)", 20, 0.6)}
              {step.subY !== null && rn(step.sub, step.col, step.subY, "var(--text)", 22)}
              <line x1={ll} y1={step.lineY} x2={lr} y2={step.lineY} stroke={step.q === 0 ? "var(--text2)" : "var(--text)"} strokeWidth="1.5" />
              {rn(step.q === 0 ? 0 : step.diff, step.col, step.diffY, isLast ? "var(--blue)" : "var(--text)", 20)}
            </g>
          );
        })}
        {remainder > 0 && (
          <text x={OW + nDigits * CW + 8} y={lastDiffY} fontSize="14" fontWeight="700" fill="var(--blue)" fontFamily="var(--mono)">R{remainder}</text>
        )}
      </svg>
    </div>
  );
}

// - Area SVGs -
function RectangleAreaSVG({ question }) {
  const { lengthVal, lengthUnit, widthVal, widthUnit } = question;
  const W = 340, H = 220;
  const rx = 50, ry = 30, rw = 210, rh = 140;
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 340, display: "block", margin: "0 auto" }}>
      <rect x={rx} y={ry} width={rw} height={rh} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" rx="2" />
      <polyline points={(rx+12)+","+ry+" "+(rx+12)+","+(ry+12)+" "+rx+","+(ry+12)} fill="none" stroke="var(--text3)" strokeWidth="1.5" />
      <rect x={rx+rw/2-34} y={ry-20} width={68} height={22} rx={4} fill="var(--bg2)" stroke="var(--border)" strokeWidth="1" />
      <text x={rx+rw/2} y={ry-4} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{lengthVal} {lengthUnit}</text>
      <rect x={rx+rw+4} y={ry+rh/2-12} width={68} height={22} rx={4} fill="var(--bg2)" stroke="var(--border)" strokeWidth="1" />
      <text x={rx+rw+38} y={ry+rh/2+6} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{widthVal} {widthUnit}</text>
      <text x={W/2} y={H-4} textAnchor="middle" fontSize="10" fill="var(--text3)" fontStyle="italic">Not drawn to scale</text>
    </svg>
  );
}

function SquareAreaSVG({ question }) {
  const { s, unit } = question;
  const W = 260, H = 260;
  const sx = 40, sy = 40, sw = 170;
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 260, display: "block", margin: "0 auto" }}>
      <rect x={sx} y={sy} width={sw} height={sw} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      <polyline points={(sx+12)+","+sy+" "+(sx+12)+","+(sy+12)+" "+sx+","+(sy+12)} fill="none" stroke="var(--text3)" strokeWidth="1.5" />
      <rect x={sx+sw/2-26} y={sy-18} width={52} height={20} rx={4} fill="var(--bg2)" stroke="var(--border)" strokeWidth="1" />
      <text x={sx+sw/2} y={sy-4} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{s} {unit}</text>
    </svg>
  );
}

function CompositeAreaSVG({ question }) {
  const { vertices, sides, unit } = question;
  if (!vertices) return null;
  const W = 360, H = 320;
  const xs = vertices.map(v => v.x), ys = vertices.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((W - 110) / (maxX - minX || 1), (H - 110) / (maxY - minY || 1));
  const offX = (W - (maxX - minX) * scale) / 2;
  const offY = (H - (maxY - minY) * scale) / 2;
  const sv = vertices.map(v => ({ x: (v.x - minX) * scale + offX, y: (v.y - minY) * scale + offY }));
  const n = sv.length;
  const cx2 = sv.reduce((s, p) => s + p.x, 0) / n;
  const cy2 = sv.reduce((s, p) => s + p.y, 0) / n;
  const mids = sv.map((p, i) => ({ x: (p.x + sv[(i + 1) % n].x) / 2, y: (p.y + sv[(i + 1) % n].y) / 2 }));
  const pathD = sv.map((p, i) => (i === 0 ? "M" : "L") + " " + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ") + " Z";
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 360, display: "block", margin: "0 auto" }}>
      <path d={pathD} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      {sv.map((p, i) => {
        const next = sv[(i + 1) % n];
        const m = mids[i];
        const ex = next.x - p.x, ey = next.y - p.y;
        const el = Math.sqrt(ex * ex + ey * ey) || 1;
        const perpX = -ey / el, perpY = ex / el;
        const outDir = (m.x - cx2) * perpX + (m.y - cy2) * perpY > 0 ? 1 : -1;
        const lx = m.x + perpX * outDir * 18;
        const ly = m.y + perpY * outDir * 18;
        return (
          <g key={i}>
            <line x1={p.x} y1={p.y} x2={next.x} y2={next.y} stroke="var(--blue)" strokeWidth="2.5" />
            <rect x={lx - 28} y={ly - 12} width={56} height={24} rx={4} fill="var(--bg2)" stroke="var(--border)" strokeWidth="1" />
            <text x={lx} y={ly + 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">
              {sides[i]?.length}{unit}
            </text>
          </g>
        );
      })}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--text3)" fontStyle="italic">Not drawn to scale</text>
    </svg>
  );
}

// - Area answer input -
function AreaAnswerInput({ question, onSubmit, submitted }) {
  const [value, setValue] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const ref = useRef(null);
  useEffect(() => { setValue(""); setSelectedUnit(null); setTimeout(() => ref.current?.focus(), 100); }, [question?.type]);

  let unitChoices;
  if (question.type === "rectangle-area") {
    unitChoices = question.areaYd !== null ? ["sq ft", "sq yd"] : ["sq ft"];
  } else {
    unitChoices = ["sq " + question.unit];
  }

  const handleSubmit = () => {
    if (!value.trim() || !selectedUnit) return;
    onSubmit(JSON.stringify({ value: parseInt(value.replace(/,/g, "")), unit: selectedUnit.replace(/\s+/g, "") }));
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
        {question.type === "rectangle-area" ? "Convert if needed, then enter area and choose units." : "Enter area and choose units."}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input ref={ref} value={value} onChange={e => setValue(e.target.value.replace(/[^0-9,]/g, ""))}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          inputMode="numeric" placeholder="Area" disabled={submitted}
          style={{ flex: 1, fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px 12px" }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        {unitChoices.map(u => (
          <button key={u} onClick={() => setSelectedUnit(u)} disabled={submitted}
            className={"btn btn-sm " + (selectedUnit === u ? "btn-primary" : "btn-ghost")}
            style={{ fontSize: 13 }}>
            {u}
          </button>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleSubmit}
        disabled={submitted || !value.trim() || !selectedUnit}>Submit</button>
    </div>
  );
}

// - Phase 1: Skip Count -
function SkipCountPhase({ n, onComplete }) {
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SKIP_COUNT_TIME);
  const [input, setInput] = useState("");
  const [idx, setIdx] = useState(0); // which multiple we expect next (0-based)
  const [errors, setErrors] = useState(0);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [wrongAnim, setWrongAnim] = useState(false);
  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const target = n * 10; // count to n*10 (e.g. 20 for 2s, 30 for 3s)
  const sequence = Array.from({ length: 9 }, (_, i) => n * (i + 1)); // n,2n,...,9n
  const expected = sequence[idx];

  useEffect(() => {
    if (started && !done && !failed) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setFailed(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [started, done, failed]);

  const handleSubmit = () => {
    const val = parseInt(input.trim(), 10);
    setInput("");
    if (val === expected) {
      if (idx === sequence.length - 1) {
        clearInterval(timerRef.current);
        setDone(true);
        onComplete();
      } else {
        setIdx(i => i + 1);
      }
    } else {
      setErrors(e => e + 1);
      setWrongAnim(true);
      setTimeout(() => setWrongAnim(false), 400);
    }
  };

  if (!started) return (
    <div className="card" style={{ textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ fontSize: 40, fontWeight: 900, color: "var(--blue)", marginBottom: 8 }}>x{n}</div>
      <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Skip Count by {n}s</h3>
      <p style={{ color: "var(--text2)", fontSize: 14, marginBottom: 20 }}>
        Enter each multiple of {n} in order: {n}, {n*2}, {n*3}... up to {n*9}. You have {SKIP_COUNT_TIME} seconds.
      </p>
      <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={() => { setStarted(true); setTimeout(() => inputRef.current?.focus(), 100); }}>
        Start
      </button>
    </div>
  );

  if (failed) return (
    <div className="card" style={{ textAlign: "center", maxWidth: 480, margin: "0 auto", animation: "popIn 0.3s ease" }}>
      <div style={{ fontSize: 36, fontWeight: 900, color: "var(--red)", marginBottom: 8 }}>Time's up!</div>
      <p style={{ color: "var(--text2)", marginBottom: 8 }}>You got to {sequence[idx - 1] || 0}. The next was <strong>{expected}</strong>.</p>
      <div style={{ color: "var(--text3)", fontSize: 13, marginBottom: 20 }}>Sequence: {sequence.join(", ")}</div>
      <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => { setStarted(false); setIdx(0); setErrors(0); setTimeLeft(SKIP_COUNT_TIME); setFailed(false); }}>
        Try again
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text2)" }}>
          Skip count by {n}s - enter {expected} next
        </div>
        <CountdownRing seconds={timeLeft} total={SKIP_COUNT_TIME} />
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
        {sequence.map((v, i) => (
          <div key={i} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 14, fontWeight: 700, fontFamily: "var(--mono)", background: i < idx ? "rgba(16,185,129,0.15)" : i === idx ? "rgba(232,99,10,0.15)" : "var(--surface)", color: i < idx ? "var(--green)" : i === idx ? "var(--blue)" : "var(--text3)", border: "1px solid " + (i < idx ? "rgba(16,185,129,0.3)" : i === idx ? "rgba(232,99,10,0.3)" : "var(--border)") }}>
            {i < idx ? v : i === idx ? "?" : "..."}
          </div>
        ))}
      </div>
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, fontFamily: "var(--mono)", fontWeight: 900, color: wrongAnim ? "var(--red)" : "var(--text)", marginBottom: 16, transition: "color 0.2s" }}>
          {idx > 0 ? sequence[idx - 1] : n + " x 1 = ?"}, <span style={{ color: "var(--amber)" }}>?</span>
        </div>
        <input ref={inputRef} value={input}
          onChange={e => setInput(e.target.value.replace(/\D/g, ""))}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          inputMode="numeric" placeholder="Next multiple..."
          style={{ textAlign: "center", fontSize: 28, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", marginBottom: 10, width: "100%", maxWidth: 180 }} />
        <button className="btn btn-primary" style={{ width: "100%", maxWidth: 180, fontSize: 18 }}
          onMouseDown={e => { e.preventDefault(); handleSubmit(); }}
          onTouchEnd={e => { e.preventDefault(); handleSubmit(); }}>
          OK
        </button>
      </div>
    </div>
  );
}

// - Phase 2 & 3: Times Table Questions -
function buildOrderedQuestions(n) {
  return Array.from({ length: 9 }, (_, i) => ({
    a: n, b: i + 1, answer: n * (i + 1),
    streakNeeded: TT_CORRECT, streak: 0, isCurrent: true,
  }));
}

function buildRandomQuestions(n, masteredTables) {
  const current = Array.from({ length: 9 }, (_, i) => ({
    a: n, b: i + 1, answer: n * (i + 1),
    streakNeeded: TT_CORRECT, streak: 0, isCurrent: true,
  }));
  const review = masteredTables.flatMap(t =>
    Array.from({ length: 9 }, (_, i) => ({
      a: t, b: i + 1, answer: t * (i + 1),
      streakNeeded: TT_REVIEW_CORRECT, streak: 0, isCurrent: false,
    }))
  );
  return shuffle([...current, ...review]);
}

function TimesTablePhase({ n, phaseNum, masteredTables, onComplete }) {
  const [questions, setQuestions] = useState(() =>
    phaseNum === 2 ? buildOrderedQuestions(n) : buildRandomQuestions(n, masteredTables)
  );
  const [qIdx, setQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TT_TIMER);
  const [showCorrect, setShowCorrect] = useState(null);
  const timerRef = useRef(null);
  const currentQ = questions[qIdx % Math.max(1, questions.length)];

  useEffect(() => {
    if (!currentQ) return;
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [qIdx, questions.length]);

  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimeLeft(TT_TIMER);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleWrong(); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const allDone = (qs) => qs.every(q => q.streak >= q.streakNeeded);

  const handleAnswer = (val) => {
    clearInterval(timerRef.current);
    const parsed = parseInt(val, 10);
    if (parsed === currentQ.answer) {
      const updated = questions.map((q, i) =>
        i === (qIdx % questions.length) ? { ...q, streak: q.streak + 1 } : q
      );
      setQuestions(updated);
      setShowCorrect(null);
      if (allDone(updated)) { onComplete(); return; }
      setQIdx(i => i + 1);
    } else {
      handleWrong();
    }
  };

  const handleWrong = () => {
    clearInterval(timerRef.current);
    const updated = questions.map((q, i) =>
      i === (qIdx % questions.length) ? { ...q, streak: 0, streakNeeded: q.streakNeeded + 1 } : q
    );
    setQuestions(updated);
    setShowCorrect(currentQ.answer);
  };

  const handleWrongContinue = () => {
    setShowCorrect(null);
    setQIdx(i => i + 1);
    startTimer();
  };

  if (!currentQ) return null;

  const totalQ = questions.length;
  const doneQ = questions.filter(q => q.streak >= q.streakNeeded).length;

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>
            {phaseNum === 2 ? "In-order" : "Random"} - {n}x table
          </div>
          {phaseNum === 3 && masteredTables.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Includes review: x{masteredTables.join(", x")}</div>
          )}
        </div>
        <CountdownRing seconds={timeLeft} total={TT_TIMER} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>
          <span>Cleared</span><span>{doneQ}/{totalQ}</span>
        </div>
        <div style={{ height: 5, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: (totalQ > 0 ? doneQ / totalQ * 100 : 0) + "%", background: "var(--green)", borderRadius: 99, transition: "width 0.3s" }} />
        </div>
      </div>
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 50, fontWeight: 900, color: "var(--text)", marginBottom: 16, letterSpacing: "-1px" }}>
          {currentQ.a} x {currentQ.b} = ?
        </div>
        {!currentQ.isCurrent && (
          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Review</div>
        )}
        <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 14 }}>
          {Array.from({ length: currentQ.streakNeeded }).map((_, i) => (
            <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: i < currentQ.streak ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < currentQ.streak ? "var(--green)" : "var(--border2)") }} />
          ))}
        </div>
        {showCorrect !== null ? (
          <div style={{ animation: "popIn 0.25s ease" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--red)", marginBottom: 6 }}>Not quite!</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 44, fontWeight: 900, color: "var(--green)", marginBottom: 16 }}>{showCorrect}</div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 16 }}
              onMouseDown={e => { e.preventDefault(); handleWrongContinue(); }}
              onTouchEnd={e => { e.preventDefault(); handleWrongContinue(); }}>
              Got it - next
            </button>
          </div>
        ) : (
          <NumInput onSubmit={handleAnswer} disabled={false} />
        )}
      </div>
    </div>
  );
}

// - Times Tables Section -
function TimesTableSection({ ttData, onComplete, onSave }) {
  const { tableIdx, tablePhase, masteredTables } = ttData;
  const n = TABLES[tableIdx];

  const advance = async () => {
    let newIdx = tableIdx, newPhase = tablePhase + 1, newMastered = [...masteredTables];
    if (newPhase > 3) {
      newMastered = [...masteredTables, n];
      newIdx = tableIdx + 1;
      newPhase = 1;
      if (newIdx >= TABLES.length) {
        await onSave({ tableIdx: newIdx, tablePhase: 0, masteredTables: newMastered }, true);
        onComplete();
        return;
      }
    }
    await onSave({ tableIdx: newIdx, tablePhase: newPhase, masteredTables: newMastered }, false);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {TABLES.map((t, i) => {
          const done = i < tableIdx || (i === tableIdx && tablePhase > 3);
          const active = i === tableIdx;
          return (
            <div key={t} style={{ padding: "6px 14px", borderRadius: 99, fontSize: 13, fontWeight: 700, background: done ? "rgba(16,185,129,0.12)" : active ? "rgba(232,99,10,0.12)" : "var(--surface)", color: done ? "var(--green)" : active ? "var(--blue)" : "var(--text3)", border: "1px solid " + (done ? "rgba(16,185,129,0.3)" : active ? "rgba(232,99,10,0.3)" : "var(--border)") }}>
              x{t} {done ? "done" : active ? ("Phase " + tablePhase + "/3") : ""}
            </div>
          );
        })}
      </div>
      {tablePhase === 1 && <SkipCountPhase key={n + "-skip"} n={n} onComplete={advance} />}
      {tablePhase === 2 && <TimesTablePhase key={n + "-ordered"} n={n} phaseNum={2} masteredTables={masteredTables} onComplete={advance} />}
      {tablePhase === 3 && <TimesTablePhase key={n + "-random"} n={n} phaseNum={3} masteredTables={masteredTables} onComplete={advance} />}
    </div>
  );
}

// - Mastery Activities -
// globalStep maps to: 0-2=mul topics, 3-4=div topics, 5-7=area topics
const MASTERY_STEPS = [
  { label: "Column Multiplication", sublabel: "2-3 digit x 1 digit",  group: "mul", subIdx: 0 },
  { label: "Column Multiplication", sublabel: "2-3 digit x 2 digit",  group: "mul", subIdx: 1 },
  { label: "Column Multiplication", sublabel: "3-4 digit x 3 digit",  group: "mul", subIdx: 2 },
  { label: "Long Division",         sublabel: "Standard",              group: "div", subIdx: 0 },
  { label: "Long Division",         sublabel: "Zero in Middle",        group: "div", subIdx: 1 },
  { label: "Area",                  sublabel: "Rectangle",             group: "area", subIdx: 0 },
  { label: "Area",                  sublabel: "Square",                group: "area", subIdx: 1 },
  { label: "Area",                  sublabel: "Composite Shape",       group: "area", subIdx: 2 },
];

function genMasteryQuestion(step) {
  const s = MASTERY_STEPS[step];
  if (s.group === "mul") {
    if (s.subIdx === 0) return genColMultiplyStage1();
    if (s.subIdx === 1) return genColMultiplyStage2();
    return genColMultiplyStage3();
  }
  if (s.group === "div") {
    return s.subIdx === 0 ? genLongDivision() : genLongDivisionZeroMiddle();
  }
  // area
  if (s.subIdx === 0) return genRectangleArea();
  if (s.subIdx === 1) return genSquareArea();
  return genCompositeShapeArea();
}

function gradeMasteryAnswer(input, question) {
  if (!question) return false;
  const t = question.type;
  if (t === "col-multiply-1" || t === "col-multiply-2" || t === "col-multiply-3") return gradeColMultiply(input, question);
  if (t === "long-division" || t === "long-division-zero") return gradeLongDivision(input, question);
  if (t === "rectangle-area") return gradeRectangleArea(input, question);
  if (t === "square-area") return gradeSquareArea(input, question);
  if (t === "composite-area") {
    try { const ans = JSON.parse(input); return parseInt(ans.area) === question.area; }
    catch { return parseInt(String(input).replace(/[^0-9]/g,""), 10) === question.area; }
  }
  return false;
}

function wrongResetStep(step) {
  const s = MASTERY_STEPS[step];
  if (s.group === "mul") return step - s.subIdx; // back to start of mul group
  if (s.group === "div") return 3; // back to standard division
  if (s.subIdx === 2) return 7; // composite wrong -> back to composite
  return 5; // rectangle or square wrong -> back to rectangle
}

function MasterySection({ masteryData, onSave, onComplete }) {
  const { globalStep, streak } = masteryData;
  const [currentStreak, setCurrentStreak] = useState(streak || 0);
  const [question, setQuestion] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null); // null | { correct }

  const step = MASTERY_STEPS[globalStep];

  useEffect(() => { newQuestion(); }, [globalStep]);

  const newQuestion = () => {
    setQuestion(genMasteryQuestion(globalStep));
    setSubmitted(false);
    setResult(null);
  };

  const handleSubmit = async (input) => {
    if (!question || submitted) return;
    setSubmitted(true);
    const correct = gradeMasteryAnswer(input, question);
    if (correct) {
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      if (newStreak >= MASTERY_STREAK) {
        const nextStep = globalStep + 1;
        if (nextStep >= MASTERY_STEPS.length) {
          await onSave({ globalStep: nextStep, streak: 0 });
          onComplete();
        } else {
          await onSave({ globalStep: nextStep, streak: 0 });
        }
      } else {
        await onSave({ globalStep, streak: newStreak });
        setResult({ correct: true });
      }
    } else {
      const resetStep = wrongResetStep(globalStep);
      setCurrentStreak(0);
      setResult({ correct: false });
      await onSave({ globalStep: resetStep, streak: 0 });
    }
  };

  if (!question || !step) return <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><div className="spinner" /></div>;

  const isArea = step.group === "area";
  const isMul = step.group === "mul";
  const isDiv = step.group === "div";

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Step roadmap */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
        {MASTERY_STEPS.map((s, i) => {
          const done = i < globalStep;
          const active = i === globalStep;
          return (
            <div key={i} style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: done ? "rgba(16,185,129,0.12)" : active ? "rgba(232,99,10,0.12)" : "var(--surface)", color: done ? "var(--green)" : active ? "var(--blue)" : "var(--text3)", border: "1px solid " + (done ? "rgba(16,185,129,0.3)" : active ? "rgba(232,99,10,0.3)" : "var(--border)") }}>
              {done ? "done" : s.sublabel}
            </div>
          );
        })}
      </div>

      <div className="card">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{step.label}</div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{step.sublabel}</div>
        </div>
        <StreakDots current={currentStreak} needed={MASTERY_STREAK} />
        <div style={{ fontSize: 14, color: "var(--text2)", marginBottom: 12 }}>{question.prompt}</div>

        {/* Question display */}
        {isMul && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700 }}>
            {question.a} x {question.b} = ?
          </div>
        )}
        {isDiv && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <svg viewBox="0 0 240 70" style={{ width: "100%", maxWidth: 240, display: "block", margin: "0 auto" }}>
              <text x={52} y={50} fontSize="28" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{question.divisor}</text>
              <line x1={72} y1={12} x2={72} y2={58} stroke="var(--text)" strokeWidth="2.5" />
              <line x1={72} y1={12} x2={76 + String(question.dividend).length * 20} y2={12} stroke="var(--text)" strokeWidth="2.5" />
              <text x={78} y={50} fontSize="28" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{question.dividend}</text>
            </svg>
          </div>
        )}
        {isArea && question.type === "rectangle-area" && <RectangleAreaSVG question={question} />}
        {isArea && question.type === "square-area" && <SquareAreaSVG question={question} />}
        {isArea && question.type === "composite-area" && <CompositeAreaSVG question={question} />}

        {/* Answer / result */}
        {result ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ textAlign: "center", fontSize: 18, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>
              {result.correct ? "Correct! " + currentStreak + "/" + MASTERY_STREAK : "Incorrect - streak reset"}
            </div>
            {/* Show worked solution on wrong */}
            {!result.correct && (
              <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--radius-sm)", padding: "12px", marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>Worked solution</div>
                {isMul && <ColumnMultiplyWork a={question.a} b={question.b} />}
                {isDiv && <LongDivisionWork dividend={question.dividend} divisor={question.divisor} quotient={question.quotient} remainder={question.remainder} />}
                {isArea && (
                  <div style={{ fontSize: 14, color: "var(--green)", fontFamily: "var(--mono)", fontWeight: 700 }}>
                    {question.displayAnswer}
                    {question.type === "rectangle-area" && question.areaYd !== null && " or " + question.areaYd + " sq yd"}
                  </div>
                )}
              </div>
            )}
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={newQuestion}>
              {result.correct ? "Next question" : "Try again"}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            {isArea ? (
              <AreaAnswerInput question={question} onSubmit={handleSubmit} submitted={submitted} />
            ) : (
              <NumInput onSubmit={handleSubmit} disabled={submitted}
                placeholder={isDiv ? "e.g. 86r1" : "Answer"}
                isDivision={isDiv} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}


// - Main Player -
export default function Lesson03MasteryPlayer({ user, topic, onHome }) {
  useActivityTracking(user, "lesson03-mastery-v1", "HW 3 (019)");
  const topicId = topic?.id || LESSON03_MASTERY_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [masteryData, setMasteryData] = useState({ globalStep: 0, streak: 0 });
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const d = prog.data;
        if (d.completed) { setCompleted(true); setLoading(false); return; }
        if (d.masteryData) setMasteryData(d.masteryData);
      }
      setLoading(false);
    };
    load();
  }, []);

  const save = async (newMd, done) => {
    const pct = done ? 100 : Math.round((newMd.globalStep / MASTERY_STEPS.length) * 100);
    await fbSaveProgress(user.id, topicId, { started: true, completed: done, percentComplete: Math.min(100, pct), data: { masteryData: newMd, completed: done } });
    setMasteryData(newMd);
    if (done) setCompleted(true);
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", animation: "fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Mastery Complete!</h2>
        <p style={{ color: "var(--text2)", fontSize: 15, marginBottom: 24 }}>
          Column multiplication, long division, and area mastered!
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--purple))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>L3</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>HW 3 (019): Multiply, Divide & Area Mastery</div>
              <div style={{ color: "var(--text3)", fontSize: 12 }}>3 correct in a row to advance each topic</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        <MasterySection
          key={masteryData.globalStep}
          masteryData={masteryData}
          onSave={(newMd) => save(newMd, newMd.globalStep >= MASTERY_STEPS.length)}
          onComplete={() => save({ globalStep: MASTERY_STEPS.length, streak: 0 }, true)}
        />
      </div>
    </div>
  );
}




