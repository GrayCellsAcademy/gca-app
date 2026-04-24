import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";
import {
  LESSON02_TOPICS, generateLesson02Question, gradeLesson02Answer,
} from "./lesson02Questions";

export const LESSON02_MASTERY_TOPIC_ID = "lesson02-mastery-v1";

// - Subtraction table config -
const SUB_TIMER = 10;      // seconds per question
const SUB_CORRECT_NEEDED = 2;  // correct to pass current number
const SUB_REVIEW_NEEDED = 1;   // correct to pass review questions
const TOTAL_NUMS = 9;          // 1 through 9

// - Mastery activity config -
const MASTERY_STREAK = 3;
const MASTERY_ACTIVITIES = [
  { id: "1",  label: "Segment Addition",            description: "3 connected segments - find total length with units." },
  { id: "2",  label: "Perimeter of Polygons",       description: "Irregular polygon, 3-6 sides - find perimeter with units." },
  { id: "3B", label: "Rectangle Perimeter",         description: "Rectangle with two sides labeled - find perimeter with units." },
  { id: "4",  label: "Square Perimeter",            description: "Square with one side labeled - find perimeter with units." },
  { id: "5A", label: "Summing Sides",               description: "Click all shorter sides that sum to the highlighted side." },
  { id: "5B", label: "Missing Side of Shape",       description: "L/T/U shape - click each missing side and enter its length." },
  { id: "5C", label: "Perimeter of Rectilinear Shape", description: "L/T/U shape with a missing side - find the perimeter." },
];

// - Shared helpers -
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSubQuestions(tierNum, masteredTiers) {
  // Current tier: (tierNum+1)-tierNum through (tierNum+9)-tierNum
  // e.g. tier 1: 2-1, 3-1, ..., 10-1 (9 questions, need 2 correct each)
  const current = Array.from({ length: 9 }, (_, i) => ({
    a: tierNum + 1 + i, b: tierNum,
    answer: (tierNum + 1 + i) - tierNum, // always 1..9
    streakNeeded: SUB_CORRECT_NEEDED, streak: 0, isCurrent: true,
  }));
  // Review: all previously mastered tiers, same 9 questions each, need 1 correct
  const review = masteredTiers.flatMap(t =>
    Array.from({ length: 9 }, (_, i) => ({
      a: t + 1 + i, b: t,
      answer: (t + 1 + i) - t,
      streakNeeded: SUB_REVIEW_NEEDED, streak: 0, isCurrent: false,
    }))
  );
  return shuffle([...current, ...review]);
}

// - SVG components (copied from Lesson02Session, not exported there) -

function LineSegmentsSVG({ question }) {
  const { segments, unit, angles } = question;
  const segLen = 110;
  let x = 0, y = 0, cumulAngle = 0;
  const rawPoints = [{ x, y }];
  const midpoints = [], labelAngles = [];
  for (let i = 0; i < segments.length; i++) {
    if (i > 0) cumulAngle += angles[i - 1] * (Math.PI / 180);
    const nx = x + segLen * Math.cos(cumulAngle);
    const ny = y + segLen * Math.sin(cumulAngle);
    midpoints.push({ x: (x + nx) / 2, y: (y + ny) / 2 });
    labelAngles.push(cumulAngle);
    x = nx; y = ny;
    rawPoints.push({ x, y });
  }
  const pad = 50;
  const xs = rawPoints.map(p => p.x), ys = rawPoints.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = 520, H = 200;
  const scaleX = (W - pad * 2) / (maxX - minX || 1);
  const scaleY = (H - pad * 2 - 30) / (maxY - minY || 1);
  const scale = Math.min(scaleX, scaleY, 1.5);
  const offX = (W - (maxX - minX) * scale) / 2 - minX * scale;
  const offY = (H - 20 - (maxY - minY) * scale) / 2 - minY * scale;
  const sv = rawPoints.map(p => ({ x: p.x * scale + offX, y: p.y * scale + offY }));
  const svm = midpoints.map(p => ({ x: p.x * scale + offX, y: p.y * scale + offY }));
  const pathD = sv.map((p, i) => (i === 0 ? "M" : "L") + " " + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ");
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 520, display: "block", margin: "0 auto" }}>
      <path d={pathD} stroke="var(--text)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {sv.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="5" fill="var(--blue)" />)}
      {svm.map((m, i) => {
        const angle = labelAngles[i];
        const perpX = -Math.sin(angle) * 24, perpY = Math.cos(angle) * 24;
        return (
          <g key={i}>
            <rect x={m.x + perpX - 36} y={m.y + perpY - 14} width={72} height={28} rx={5} fill="var(--bg2)" stroke="var(--border)" strokeWidth="1" />
            <text x={m.x + perpX} y={m.y + perpY + 7} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{segments[i]} {unit}</text>
          </g>
        );
      })}
      <text x={W / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="var(--text3)" fontStyle="italic">Not drawn to scale</text>
    </svg>
  );
}

function PolygonSVG({ question }) {
  const { vertices, lengths, unit } = question;
  if (!vertices || vertices.length === 0) return null;
  const W = 320, H = 320;
  const xs = vertices.map(v => v.x), ys = vertices.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((W - 80) / (maxX - minX || 1), (H - 80) / (maxY - minY || 1));
  const offX = (W - (maxX - minX) * scale) / 2;
  const offY = (H - (maxY - minY) * scale) / 2;
  const sv = vertices.map(v => ({ x: (v.x - minX) * scale + offX, y: (v.y - minY) * scale + offY }));
  const n = sv.length;
  const pathD = sv.map((p, i) => (i === 0 ? "M" : "L") + " " + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ") + " Z";
  const mids = sv.map((p, i) => ({ x: (p.x + sv[(i + 1) % n].x) / 2, y: (p.y + sv[(i + 1) % n].y) / 2 }));
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 320, display: "block", margin: "0 auto" }}>
      <path d={pathD} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      {sv.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--blue)" />)}
      {mids.map((m, i) => (
        <g key={i}>
          <rect x={m.x - 34} y={m.y - 14} width={68} height={28} rx={5} fill="var(--bg)" stroke="var(--border)" strokeWidth="1" />
          <text x={m.x} y={m.y + 6} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{lengths[i]}{unit}</text>
        </g>
      ))}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text3)" fontStyle="italic">Not drawn to scale</text>
    </svg>
  );
}

function RectangleSVG({ question, revealCorrect }) {
  const { w, h, unit } = question;
  const W = 360, H = 260;
  const rx = 70, ry = 45, rw = 220, rh = 170;
  const sides = [
    { x1: rx, y1: ry, x2: rx + rw, y2: ry, mx: rx + rw / 2, my: ry - 22, label: w },
    { x1: rx + rw, y1: ry, x2: rx + rw, y2: ry + rh, mx: rx + rw + 38, my: ry + rh / 2, label: h },
    { x1: rx + rw, y1: ry + rh, x2: rx, y2: ry + rh, mx: rx + rw / 2, my: ry + rh + 22, label: w },
    { x1: rx, y1: ry + rh, x2: rx, y2: ry, mx: rx - 38, my: ry + rh / 2, label: h },
  ];
  const showLabel = (i) => i === 0 || i === 1 || revealCorrect;
  const isRevealed = (i) => revealCorrect && !(i === 0 || i === 1);
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 360, display: "block", margin: "0 auto" }}>
      <rect x={rx} y={ry} width={rw} height={rh} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" rx="2" />
      <polyline points={(rx + 14) + "," + ry + " " + (rx + 14) + "," + (ry + 14) + " " + rx + "," + (ry + 14)} fill="none" stroke="var(--text3)" strokeWidth="1.5" />
      {sides.map((s, i) => (
        <g key={i}>
          <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="var(--blue)" strokeWidth="2.5" />
          {showLabel(i) && (
            <g>
              <rect x={s.mx - 34} y={s.my - 14} width={68} height={28} rx={5} fill="var(--bg)" stroke="var(--border)" strokeWidth="1" />
              <text x={s.mx} y={s.my + 7} textAnchor="middle" fontSize="15" fontWeight="700" fill={isRevealed(i) ? "var(--green)" : "var(--text)"} fontFamily="var(--mono)">{s.label}{unit}</text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}

function SquareSVG({ question, revealCorrect }) {
  const { s, unit } = question;
  const W = 280, H = 280;
  const sx = 50, sy = 50, sw = 180;
  const labels = [
    { x: sx + sw / 2, y: sy - 14, anchor: "middle" },
    { x: sx + sw + 16, y: sy + sw / 2, anchor: "start" },
    { x: sx + sw / 2, y: sy + sw + 20, anchor: "middle" },
    { x: sx - 16, y: sy + sw / 2, anchor: "end" },
  ];
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }}>
      <rect x={sx} y={sy} width={sw} height={sw} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      <polyline points={(sx + 14) + "," + sy + " " + (sx + 14) + "," + (sy + 14) + " " + sx + "," + (sy + 14)} fill="none" stroke="var(--text3)" strokeWidth="1.5" />
      {labels.map((lbl, i) => {
        const isGiven = i === 0;
        if (!isGiven && !revealCorrect) return null;
        return (
          <g key={i}>
            <rect x={lbl.x - 28} y={lbl.y - 12} width={56} height={24} rx={5} fill="var(--bg)" stroke={isGiven ? "var(--border)" : "var(--green)"} strokeWidth="1" />
            <text x={lbl.x} y={lbl.y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={isGiven ? "var(--text)" : "var(--green)"} fontFamily="var(--mono)">{s} {unit}</text>
          </g>
        );
      })}
    </svg>
  );
}

function RectilinearSVG({ question, selectedSides, onSideClick, revealCorrect, activeMissingIdx, revealedAnswers }) {
  const { vertices, sides, unit, hideIndices, activityType, correctSideIndices } = question;
  const hiddenSet = new Set(hideIndices || []);
  if (!vertices) return null;
  const W = 400, H = 360;
  const xs = vertices.map(v => v.x), ys = vertices.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((W - 120) / (maxX - minX || 1), (H - 120) / (maxY - minY || 1));
  const offX = (W - (maxX - minX) * scale) / 2;
  const offY = (H - (maxY - minY) * scale) / 2;
  const sv = vertices.map(v => ({ x: (v.x - minX) * scale + offX, y: (v.y - minY) * scale + offY }));
  const n = sv.length;
  const cx = sv.reduce((s, p) => s + p.x, 0) / n;
  const cy = sv.reduce((s, p) => s + p.y, 0) / n;
  const mids = sv.map((p, i) => ({ x: (p.x + sv[(i + 1) % n].x) / 2, y: (p.y + sv[(i + 1) % n].y) / 2 }));
  const pathD = sv.map((p, i) => (i === 0 ? "M" : "L") + " " + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ") + " Z";
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 400, display: "block", margin: "0 auto" }}>
      <path d={pathD} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      {sv.map((p, i) => {
        const next = sv[(i + 1) % n];
        const isHL = i === question.highlightSideIdx;
        const isSel = selectedSides?.includes(i);
        const isCorrect = revealCorrect && correctSideIndices?.includes(i);
        const isHidden = hiddenSet.has(i);
        const isActiveMissing = activeMissingIdx === i;
        const m = mids[i];
        const ex = next.x - p.x, ey = next.y - p.y;
        const el = Math.sqrt(ex * ex + ey * ey) || 1;
        const perpX = -ey / el, perpY = ex / el;
        const outDir = (m.x - cx) * perpX + (m.y - cy) * perpY > 0 ? 1 : -1;
        const lx = m.x + perpX * outDir * 18;
        const ly = m.y + perpY * outDir * 18;
        let strokeColor = "var(--blue)", strokeW = 2.5;
        if (isHL) { strokeColor = "#7c3aed"; strokeW = 5; }
        else if (isCorrect) { strokeColor = "var(--green)"; strokeW = 5; }
        else if (isSel) { strokeColor = "var(--green)"; strokeW = 4; }
        const showLabels = activityType !== "5A";
        return (
          <g key={i} style={{ cursor: (activityType === "5A" && !isHL) || (activityType === "5B" && isHidden) ? "pointer" : "default" }}
            onClick={() => {
              if (activityType === "5A" && !isHL) onSideClick && onSideClick(i);
              if (activityType === "5B" && isHidden) onSideClick && onSideClick(i);
            }}>
            <line x1={p.x} y1={p.y} x2={next.x} y2={next.y} stroke={strokeColor} strokeWidth={strokeW} />
            {showLabels && (!isHidden || activityType === "5B" || (activityType === "5C" && revealedAnswers)) && (
              <g>
                <rect x={lx - 32} y={ly - 14} width={64} height={28} rx={5}
                  fill={isActiveMissing ? "rgba(59,130,246,0.3)" : isHidden ? "rgba(251,191,36,0.15)" : "var(--bg2)"}
                  stroke={isActiveMissing ? "var(--blue)" : isHidden ? "var(--amber)" : "var(--border)"} strokeWidth={isActiveMissing ? 2 : 1} />
                <text x={lx} y={ly + 6} textAnchor="middle" fontSize="14" fontWeight="700"
                  fill={isActiveMissing ? "var(--blue)" : (isHidden && !revealedAnswers) ? "#7c3aed" : isHidden ? "var(--green)" : "var(--text)"} fontFamily="var(--mono)">
                  {isHidden && !revealedAnswers ? "?" : sides[i]?.length + unit}
                </text>
              </g>
            )}
          </g>
        );
      })}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text3)" fontStyle="italic">Not drawn to scale</text>
    </svg>
  );
}

function QuestionDisplay({ question, selectedSides, onSideClick, revealCorrect, activeMissingIdx, revealedAnswers }) {
  if (!question) return null;
  switch (question.type) {
    case "line-segments": return <LineSegmentsSVG question={question} />;
    case "polygon": return <PolygonSVG question={question} />;
    case "rectangle-perimeter": return <RectangleSVG question={question} revealCorrect={revealCorrect} />;
    case "square-perimeter": return <SquareSVG question={question} revealCorrect={revealCorrect} />;
    case "rectilinear-5A":
    case "rectilinear-5B":
    case "rectilinear-5C":
      return <RectilinearSVG question={question} selectedSides={selectedSides} onSideClick={onSideClick}
        revealCorrect={revealCorrect} activeMissingIdx={activeMissingIdx} revealedAnswers={revealedAnswers} />;
    default: return null;
  }
}

// - Subtraction drill answer input -

function SubAnswerInput({ onSubmit, disabled }) {
  const [val, setVal] = useState("");
  const ref = useRef(null);
  useEffect(() => { setVal(""); setTimeout(() => ref.current?.focus(), 80); }, [disabled]);
  const submit = () => {
    const n = parseInt(val, 10);
    if (!isNaN(n)) { onSubmit(n); setVal(""); }
  };
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      <input ref={ref} value={val} onChange={e => setVal(e.target.value.replace(/\D/g, ""))}
        onKeyDown={e => e.key === "Enter" && submit()}
        inputMode="numeric" placeholder="?" disabled={disabled}
        style={{ textAlign: "center", fontSize: 34, fontFamily: "var(--mono)", fontWeight: 700, padding: "12px", width: 120 }} />
      <button className="btn btn-primary" style={{ fontSize: 20, padding: "12px 24px" }}
        onMouseDown={e => { e.preventDefault(); submit(); }}
        onTouchEnd={e => { e.preventDefault(); submit(); }}
        disabled={disabled || !val.trim()}>
        OK
      </button>
    </div>
  );
}

// - Geometry mastery answer input -

function GeoAnswerInput({ question, onSubmit, submitted, selectedSides, onSideClick, activeMissingIdx, setActiveMissingIdx }) {
  const [input, setInput] = useState("");
  const [enteredSides, setEnteredSides] = useState({});
  const inputRef = useRef(null);

  useEffect(() => {
    setInput(""); setEnteredSides({});
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [question?.type]);

  // For 5B: refocus when active missing side changes
  useEffect(() => {
    if (question?.type === "rectilinear-5B" && activeMissingIdx !== null) {
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeMissingIdx, question?.type]);

  if (question?.type === "rectilinear-5B") {
    const missingAnswers = question.missingAnswers || [];
    const allEntered = missingAnswers.every(ma => enteredSides[ma.idx] !== undefined);
    const handleConfirm = () => {
      if (activeMissingIdx === null || !input.trim()) return;
      const newEntered = { ...enteredSides, [activeMissingIdx]: input.trim() };
      setEnteredSides(newEntered);
      setInput("");
      const next = missingAnswers.find(ma => newEntered[ma.idx] === undefined);
      setActiveMissingIdx(next ? next.idx : null);
    };
    return (
      <div>
        <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>
          {activeMissingIdx !== null ? "Enter the length for the highlighted side (include units)" : allEntered ? "All sides entered - ready to submit!" : "Click a ? side to select it, then enter its length"}
        </div>
        {activeMissingIdx !== null && (
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleConfirm()}
              placeholder={"e.g. 35" + (question.unit || "")}
              style={{ flex: 1, fontSize: 20, fontFamily: "var(--mono)", padding: "10px 14px" }} />
            <button className="btn btn-primary" onClick={handleConfirm} disabled={!input.trim()}>OK</button>
          </div>
        )}
        {Object.entries(enteredSides).length > 0 && (
          <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 8 }}>
            {Object.entries(enteredSides).map(([idx, val]) => (
              <span key={idx} style={{ marginRight: 12 }}>Side: <strong style={{ fontFamily: "var(--mono)" }}>{val}</strong></span>
            ))}
          </div>
        )}
        <button className="btn btn-primary" style={{ width: "100%" }}
          onClick={() => onSubmit(JSON.stringify(missingAnswers.map(ma => ({ idx: ma.idx, value: enteredSides[ma.idx]?.replace(/[^0-9]/g, "") || "" }))))}
          disabled={submitted || !allEntered}>Submit All</button>
      </div>
    );
  }

  if (question?.type === "rectilinear-5A") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>
          {"Click sides that sum to the highlighted side. Selected: " + (selectedSides?.length || 0)}
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }}
          onClick={() => onSubmit((selectedSides || []).slice().sort((a, b) => a - b).join(","))}
          disabled={submitted}>Submit</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 6 }}>Include units (e.g. 45cm, 120ft)</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onSubmit(input)}
          placeholder="e.g. 150cm" disabled={submitted}
          style={{ flex: 1, fontSize: 20, fontFamily: "var(--mono)", padding: "10px 14px" }} />
        <button className="btn btn-primary" onClick={() => onSubmit(input)} disabled={submitted || !input.trim()}>Submit</button>
      </div>
    </div>
  );
}

// - Countdown ring -
function CountdownRing({ seconds, total }) {
  const r = 24, circ = 2 * Math.PI * r;
  const pct = seconds / total;
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

// - Streak dots -
function StreakDots({ current, needed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 13, color: "var(--text3)" }}>Streak:</span>
      {Array.from({ length: needed }).map((_, i) => (
        <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: i < current ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < current ? "var(--green)" : "var(--border2)"), transition: "all 0.2s" }} />
      ))}
      <span style={{ fontSize: 13, color: "var(--text3)" }}>{current}/{needed}</span>
    </div>
  );
}

// - Subtraction Drill Screen -
function SubtractionDrill({ subData, onComplete, onSaveProgress }) {
  const { tierNum, masteredTiers } = subData;
  const [questions, setQuestions] = useState(() => buildSubQuestions(tierNum, masteredTiers));
  const [qIdx, setQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SUB_TIMER);
  const [showCorrect, setShowCorrect] = useState(null);
  const timerRef = useRef(null);

  const currentQ = questions[qIdx % questions.length] || questions[0];

  useEffect(() => {
    if (!currentQ) return;
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [qIdx, questions.length]);

  if (!currentQ) return <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><div className="spinner" /></div>;

  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimeLeft(SUB_TIMER);
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
    if (val === currentQ.answer) {
      const updated = questions.map((q, i) =>
        i === (qIdx % questions.length) ? { ...q, streak: q.streak + 1 } : q
      );
      setQuestions(updated);
      setShowCorrect(null);
      if (allDone(updated)) {
        advanceTier();
      } else {
        setQIdx(i => i + 1);
      }
    } else {
      handleWrong();
    }
  };

  const handleWrong = () => {
    clearInterval(timerRef.current);
    const updated = questions.map((q, i) =>
      i === (qIdx % questions.length)
        ? { ...q, streak: 0, streakNeeded: q.streakNeeded + 1 }
        : q
    );
    setQuestions(updated);
    setShowCorrect(currentQ.answer);
  };

  const handleWrongContinue = () => {
    setShowCorrect(null);
    setQIdx(i => i + 1);
    startTimer();
  };

  const advanceTier = async () => {
    const newMastered = [...masteredTiers, tierNum];
    const nextTier = tierNum + 1;
    if (nextTier > TOTAL_NUMS) {
      await onSaveProgress({ phase: "mastery", subtractionData: { tierNum: nextTier, masteredTiers: newMastered }, masteryData: { activityIdx: 0, streak: 0 } });
      onComplete();
    } else {
      const newData = { tierNum: nextTier, masteredTiers: newMastered };
      await onSaveProgress({ phase: "subtraction", subtractionData: newData, masteryData: { activityIdx: 0, streak: 0 } });
      setQuestions(buildSubQuestions(nextTier, newMastered));
      setQIdx(0);
      setShowCorrect(null);
    }
  };

  const totalQ = questions.length;
  const doneQ = questions.filter(q => q.streak >= q.streakNeeded).length;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Subtracting {tierNum}s</div>
          <div style={{ fontSize: 13, color: "var(--text3)" }}>
            {masteredTiers.length > 0 ? "Review included: -" + masteredTiers.join(", -") : ""}
          </div>
        </div>
        <CountdownRing seconds={timeLeft} total={SUB_TIMER} />
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>
          <span>Questions cleared</span><span>{doneQ}/{totalQ}</span>
        </div>
        <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: (totalQ > 0 ? doneQ / totalQ * 100 : 0) + "%", background: "var(--green)", borderRadius: 99, transition: "width 0.3s" }} />
        </div>
      </div>

      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 52, fontWeight: 900, color: "var(--text)", marginBottom: 24, letterSpacing: "-1px" }}>
          {currentQ.a} - {currentQ.b} = ?
        </div>

        {!currentQ.isCurrent && (
          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Review</div>
        )}

        {/* Streak dots for this question */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16 }}>
          {Array.from({ length: currentQ.streakNeeded }).map((_, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: i < currentQ.streak ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < currentQ.streak ? "var(--green)" : "var(--border2)"), transition: "all 0.2s" }} />
          ))}
        </div>

        {showCorrect !== null ? (
          <div style={{ animation: "popIn 0.25s ease" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--red)", marginBottom: 8 }}>Not quite!</div>
            <div style={{ fontSize: 15, color: "var(--text2)", marginBottom: 6 }}>The answer is</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 48, fontWeight: 900, color: "var(--green)", marginBottom: 20 }}>
              {currentQ.answer}
            </div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 18 }}
              onMouseDown={e => { e.preventDefault(); handleWrongContinue(); }}
              onTouchEnd={e => { e.preventDefault(); handleWrongContinue(); }}>
              Got it - next
            </button>
          </div>
        ) : (
          <SubAnswerInput onSubmit={handleAnswer} disabled={false} />
        )}
      </div>

      {/* Tier roadmap */}
      <div style={{ marginTop: 14, display: "flex", gap: 5, flexWrap: "wrap" }}>
        {Array.from({ length: TOTAL_NUMS }, (_, i) => {
          const n = i + 1;
          const done = masteredTiers.includes(n);
          const active = n === tierNum;
          return (
            <div key={n} style={{ fontSize: 13, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(232,99,10,0.15)" : "var(--surface)", color: done ? "var(--green)" : active ? "var(--blue)" : "var(--text3)", border: "1px solid " + (done ? "rgba(16,185,129,0.3)" : active ? "rgba(232,99,10,0.3)" : "var(--border)") }}>
              -{n}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// - Geometry Mastery Screen -
function GeometryMastery({ masteryData, onSaveProgress, onComplete }) {
  const { activityIdx, streak } = masteryData;
  const [currentStreak, setCurrentStreak] = useState(streak);
  const [question, setQuestion] = useState(null);
  const [phase, setPhase] = useState("question"); // question | wrong
  const [selectedSides, setSelectedSides] = useState([]);
  const [activeMissingIdx, setActiveMissingIdx] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const activity = MASTERY_ACTIVITIES[activityIdx];

  useEffect(() => {
    newQuestion();
  }, [activityIdx]);

  const newQuestion = () => {
    const q = generateLesson02Question(MASTERY_ACTIVITIES[activityIdx].id);
    q.id = Date.now().toString(36);
    setQuestion(q);
    setPhase("question");
    setSelectedSides([]);
    setActiveMissingIdx(null);
    setSubmitted(false);
  };

  const handleSideClick = (idx) => {
    if (question.type === "rectilinear-5A") {
      setSelectedSides(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
    } else if (question.type === "rectilinear-5B") {
      setActiveMissingIdx(idx);
    }
  };

  const handleSubmit = async (input) => {
    if (!question || submitted) return;
    setSubmitted(true);
    const correct = gradeLesson02Answer(input, question);
    if (correct) {
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      if (newStreak >= MASTERY_STREAK) {
        const nextIdx = activityIdx + 1;
        if (nextIdx >= MASTERY_ACTIVITIES.length) {
          await onSaveProgress({ phase: "complete", subtractionData: null, masteryData: { activityIdx: nextIdx, streak: 0 } });
          onComplete();
        } else {
          await onSaveProgress({ phase: "mastery", subtractionData: null, masteryData: { activityIdx: nextIdx, streak: 0 } });
          setCurrentStreak(0);
          // activityIdx change handled by parent
        }
      } else {
        await onSaveProgress({ phase: "mastery", subtractionData: null, masteryData: { activityIdx, streak: newStreak } });
        setTimeout(() => newQuestion(), 800);
      }
    } else {
      setCurrentStreak(0);
      setPhase("wrong");
      await onSaveProgress({ phase: "mastery", subtractionData: null, masteryData: { activityIdx, streak: 0 } });
    }
  };

  const handleWrongContinue = () => {
    newQuestion();
  };

  if (!question) return <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
          Activity {activityIdx + 1} of {MASTERY_ACTIVITIES.length}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{activity.label}</div>
        <div style={{ fontSize: 13, color: "var(--text2)" }}>{activity.description}</div>
      </div>

      {/* Activity roadmap */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
        {MASTERY_ACTIVITIES.map((a, i) => {
          const done = i < activityIdx;
          const active = i === activityIdx;
          return (
            <div key={a.id} style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(232,99,10,0.15)" : "var(--surface)", color: done ? "var(--green)" : active ? "var(--blue)" : "var(--text3)", border: "1px solid " + (done ? "rgba(16,185,129,0.3)" : active ? "rgba(232,99,10,0.3)" : "var(--border)") }}>
              {done ? "done" : active ? a.label : a.label}
            </div>
          );
        })}
      </div>

      <div className="card">
        <StreakDots current={currentStreak} needed={MASTERY_STREAK} />

        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text2)", marginBottom: 12 }}>{question.prompt}</div>

        <QuestionDisplay
          question={question}
          selectedSides={selectedSides}
          onSideClick={handleSideClick}
          revealCorrect={phase === "wrong"}
          activeMissingIdx={activeMissingIdx}
          revealedAnswers={phase === "wrong" ? (question.missingAnswers || question.hideIndices?.map(i => ({ idx: i, length: question.sides?.[i]?.length }))) : null}
        />

        {phase === "wrong" ? (
          <div style={{ marginTop: 16, animation: "popIn 0.25s ease" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--red)", marginBottom: 6, textAlign: "center" }}>Not quite! Streak reset.</div>
            {question.displayAnswer && (
              <div style={{ textAlign: "center", color: "var(--green)", fontSize: 16, marginBottom: 12 }}>
                Correct: <strong style={{ fontFamily: "var(--mono)" }}>{question.displayAnswer}</strong>
              </div>
            )}
            {question.type === "rectilinear-5B" && question.missingAnswers && (
              <div style={{ textAlign: "center", color: "var(--green)", fontSize: 15, marginBottom: 12 }}>
                Missing sides: <strong style={{ fontFamily: "var(--mono)" }}>{question.missingAnswers.map(ma => ma.length + question.unit).join(", ")}</strong>
              </div>
            )}
            <button className="btn btn-success" style={{ width: "100%", fontSize: 17 }} onClick={handleWrongContinue}>
              Got it - try again
            </button>
          </div>
        ) : submitted ? (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)" }}>Correct! {currentStreak}/{MASTERY_STREAK}</div>
          </div>
        ) : (
          <div style={{ marginTop: 16 }}>
            <GeoAnswerInput
              question={question}
              onSubmit={handleSubmit}
              submitted={submitted}
              selectedSides={selectedSides}
              onSideClick={handleSideClick}
              activeMissingIdx={activeMissingIdx}
              setActiveMissingIdx={setActiveMissingIdx}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// - Main Player -
export default function Lesson02MasteryPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || LESSON02_MASTERY_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState("subtraction"); // subtraction | mastery | complete
  const [subData, setSubData] = useState({ tierNum: 1, masteredTiers: [] });
  const [masteryData, setMasteryData] = useState({ activityIdx: 0, streak: 0 });

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { phase: p, subtractionData, masteryData: md } = prog.data;
        if (p) setPhase(p);
        if (subtractionData) setSubData({ tierNum: subtractionData.tierNum || 1, masteredTiers: subtractionData.masteredTiers || [] });
        if (md) setMasteryData(md);
      }
      setLoading(false);
    };
    load();
  }, []);

  const saveProgress = async (data) => {
    const { phase: p, subtractionData, masteryData: md } = data;
    const totalSteps = TOTAL_NUMS + MASTERY_ACTIVITIES.length;
    const subDone = (subtractionData?.masteredTiers?.length || (p === "mastery" || p === "complete" ? TOTAL_NUMS : 0));
    const masteryDone = md?.activityIdx || 0;
    const pct = Math.round(((subDone + masteryDone) / totalSteps) * 100);
    await fbSaveProgress(user.id, topicId, {
      started: true,
      completed: p === "complete",
      percentComplete: pct,
      data,
    });
    if (p) setPhase(p);
    if (subtractionData) setSubData(subtractionData);
    if (md) setMasteryData(md);
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  if (phase === "complete") return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", animation: "fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize: 64, marginBottom: 16, color: "var(--amber)", fontWeight: 900 }}>100%</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Geometry Mastery Complete!</h2>
        <p style={{ color: "var(--text2)", fontSize: 16, marginBottom: 24 }}>
          You have mastered subtraction tables and all 7 geometry activities.
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>L2</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>Geometry Mastery</div>
              <div style={{ color: "var(--text3)", fontSize: 12 }}>
                {phase === "subtraction" ? "Part 1: Subtraction Tables" : "Part 2: Geometry Activities"}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>

        {/* Phase indicator */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["Subtraction Tables", "Geometry Mastery"].map((label, i) => {
            const isActive = (i === 0 && phase === "subtraction") || (i === 1 && phase === "mastery");
            const isDone = (i === 0 && phase !== "subtraction");
            return (
              <div key={i} style={{ flex: 1, padding: "8px 14px", borderRadius: "var(--radius-sm)", background: isDone ? "rgba(16,185,129,0.1)" : isActive ? "rgba(232,99,10,0.1)" : "var(--surface)", border: "1px solid " + (isDone ? "rgba(16,185,129,0.3)" : isActive ? "rgba(232,99,10,0.3)" : "var(--border)"), textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: isDone ? "var(--green)" : isActive ? "var(--blue)" : "var(--text3)" }}>
                  {isDone ? "Done - " : isActive ? "Now - " : ""}{label}
                </div>
              </div>
            );
          })}
        </div>

        {phase === "subtraction" && (
          <SubtractionDrill
            subData={subData}
            onComplete={() => setPhase("mastery")}
            onSaveProgress={saveProgress}
          />
        )}

        {phase === "mastery" && (
          <GeometryMastery
            key={masteryData.activityIdx}
            masteryData={masteryData}
            onSaveProgress={saveProgress}
            onComplete={() => setPhase("complete")}
          />
        )}
      </div>
    </div>
  );
}
