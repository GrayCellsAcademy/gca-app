import { useState, useEffect, useRef } from "react";
import { setDoc, doc, updateDoc } from "firebase/firestore";
import {
  createClassworkSession, onSessionChange, onClassworkAnswersChange,
  getTeacherClasses, addToScore, db,
} from "./core/firebase";
import {
  LESSON02_TOPICS, generateLesson02Question, gradeLesson02Answer,
} from "./lesson02Questions";

const POINTS = 5;

function LineSegmentsSVG({ question }) {
  const { segments, unit, angles } = question;
  const segLen = 110;
  // Build raw points
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
  // Scale and center to fit in viewBox
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
        const perpX = -Math.sin(angle) * 24;
        const perpY = Math.cos(angle) * 24;
        return (
          <g key={i}>
            <rect x={m.x + perpX - 32} y={m.y + perpY - 13} width={64} height={26} rx={5} fill="var(--bg2)" stroke="var(--border)" strokeWidth="1" />
            <text x={m.x + perpX} y={m.y + perpY + 6} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{segments[i]} {unit}</text>
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
          <rect x={m.x - 28} y={m.y - 12} width={56} height={24} rx={5} fill="var(--bg)" stroke="var(--border)" strokeWidth="1" />
          <text x={m.x} y={m.y + 5} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{lengths[i]}{unit}</text>
        </g>
      ))}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text3)" fontStyle="italic">Not drawn to scale</text>
    </svg>
  );
}

function RectangleSVG({ question, mode, selectedSides, onSideClick, revealCorrect }) {
  const { w, h, unit } = question;
  const W = 360, H = 260;
  const rx = 70, ry = 45, rw = 220, rh = 170;
  const sides = [
    { x1: rx, y1: ry, x2: rx + rw, y2: ry, mx: rx + rw / 2, my: ry - 22, label: w },
    { x1: rx + rw, y1: ry, x2: rx + rw, y2: ry + rh, mx: rx + rw + 38, my: ry + rh / 2, label: h },
    { x1: rx + rw, y1: ry + rh, x2: rx, y2: ry + rh, mx: rx + rw / 2, my: ry + rh + 22, label: w },
    { x1: rx, y1: ry + rh, x2: rx, y2: ry, mx: rx - 38, my: ry + rh / 2, label: h },
  ];
  const showLabel = (i) => mode === "3B" && (i === 0 || i === 1 || revealCorrect);
  const isRevealed = (i) => revealCorrect && !(i === 0 || i === 1);
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 360, display: "block", margin: "0 auto" }}>
      <rect x={rx} y={ry} width={rw} height={rh} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" rx="2" />
      <polyline points={(rx + 14) + "," + ry + " " + (rx + 14) + "," + (ry + 14) + " " + rx + "," + (ry + 14)} fill="none" stroke="var(--text3)" strokeWidth="1.5" />
      {sides.map((s, i) => {
        const isSel = selectedSides?.includes(i);
        return (
          <g key={i} style={{ cursor: mode === "equal-sides" ? "pointer" : "default" }}
            onClick={() => mode === "equal-sides" && onSideClick && onSideClick(i)}>
            <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={isSel ? "var(--green)" : "var(--blue)"} strokeWidth={isSel ? 5 : 2.5} />
            {showLabel(i) && (
              <g>
                <rect x={s.mx - 28} y={s.my - 12} width={56} height={24} rx={5} fill="var(--bg)" stroke="var(--border)" strokeWidth="1" />
                <text x={s.mx} y={s.my + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={isRevealed(i) ? "var(--green)" : "var(--text)"} fontFamily="var(--mono)">{s.label}{unit}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function SquareSVG({ question, revealCorrect }) {
  const { s, unit } = question;
  const W = 320, H = 300;
  const sx = 70, sy = 50, sw = 180;
  const labels = [
    { x: sx + sw/2, y: sy - 16, given: true },
    { x: sx + sw + 42, y: sy + sw/2 },
    { x: sx + sw/2, y: sy + sw + 28 },
    { x: sx - 42, y: sy + sw/2 },
  ];
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 320, display: "block", margin: "0 auto" }}>
      <rect x={sx} y={sy} width={sw} height={sw} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      <polyline points={(sx+14)+","+sy+" "+(sx+14)+","+(sy+14)+" "+sx+","+(sy+14)} fill="none" stroke="var(--text3)" strokeWidth="1.5" />
      {labels.map((lbl, i) => {
        if (!lbl.given && !revealCorrect) return null;
        return (
          <g key={i}>
            <rect x={lbl.x - 28} y={lbl.y - 13} width={56} height={26} rx={5}
              fill="var(--bg)" stroke={lbl.given ? "var(--border)" : "var(--green)"} strokeWidth="1.5" />
            <text x={lbl.x} y={lbl.y + 5} textAnchor="middle" fontSize="13" fontWeight="700"
              fill={lbl.given ? "var(--text)" : "var(--green)"} fontFamily="var(--mono)">{s} {unit}</text>
          </g>
        );
      })}
    </svg>
  );
}

function RectilinearSVG({ question, selectedSides, onSideClick, highlightSideIdx, revealCorrect, revealedAnswers }) {
  const { vertices, sides, unit, hideIdx, hideIndices, activityType, correctSideIndices, activeMissingIdx } = question;
  const hiddenSet = new Set(hideIndices || (hideIdx !== undefined ? [hideIdx] : []));
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
  const showLabels = activityType !== "5A";
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 400, display: "block", margin: "0 auto" }}>
      <path d={pathD} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      {sv.map((p, i) => {
        const next = sv[(i + 1) % n];
        const isHL = i === highlightSideIdx;
        const isSel = selectedSides?.includes(i);
        const isCorrect = revealCorrect && correctSideIndices?.includes(i);
        const isHidden = hiddenSet.has(i);
        const isActiveMissing = activeMissingIdx === i;
        const m = mids[i];
        const ex = next.x - p.x, ey = next.y - p.y;
        const el = Math.sqrt(ex * ex + ey * ey) || 1;
        const perpX = -ey / el, perpY = ex / el;
        const outDir = (m.x - cx) * perpX + (m.y - cy) * perpY > 0 ? 1 : -1;
        // Place label at midpoint with small offset just enough to not overlap the line
        const lx = m.x + perpX * outDir * 18;
        const ly = m.y + perpY * outDir * 18;
        let strokeColor = "var(--blue)", strokeW = 2.5;
        if (isHL) { strokeColor = "#7c3aed"; strokeW = 5; }
        else if (isCorrect) { strokeColor = "var(--green)"; strokeW = 5; }
        else if (isSel) { strokeColor = "var(--green)"; strokeW = 4; }
        return (
          <g key={i} style={{ cursor: activityType === "5A" && !isHL ? "pointer" : "default" }}
            onClick={() => activityType === "5A" && !isHL && onSideClick && onSideClick(i)}>
            <line x1={p.x} y1={p.y} x2={next.x} y2={next.y} stroke={strokeColor} strokeWidth={strokeW} />
            {showLabels && (!isHidden || activityType === "5B") && (
              <g style={{ cursor: activityType === "5B" && isHidden ? "pointer" : "default" }}
                onClick={() => activityType === "5B" && isHidden && onSideClick && onSideClick(i)}>
                <rect x={lx - 24} y={ly - 12} width={48} height={24} rx={5}
                  fill={isActiveMissing ? "rgba(59,130,246,0.3)" : isHidden ? "rgba(251,191,36,0.15)" : "var(--bg2)"}
                  stroke={isActiveMissing ? "var(--blue)" : isHidden ? "var(--amber)" : "var(--border)"} strokeWidth={isActiveMissing ? 2 : 1} />
                <text x={lx} y={ly + 5} textAnchor="middle" fontSize="12" fontWeight="700"
                  fill={isActiveMissing ? "var(--blue)" : isHidden ? "var(--amber)" : "var(--text)"} fontFamily="var(--mono)">
                  {isHidden ? "?" : sides[i]?.length + unit}
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


function ColumnAdditionReveal({ numbers, label }) {
  if (!numbers || numbers.length === 0) return null;
  const maxLen = Math.max(...numbers.map(n => String(n).length));
  const total = numbers.reduce((a, b) => a + b, 0);

  // Compute carries right to left
  const carries = Array(maxLen).fill(0);
  for (let pos = 0; pos < maxLen; pos++) {
    let colSum = pos > 0 ? carries[pos - 1] : 0;
    for (const n of numbers) {
      const s = String(n);
      const digitIdx = s.length - 1 - pos;
      if (digitIdx >= 0) colSum += parseInt(s[digitIdx]);
    }
    carries[pos] = Math.floor(colSum / 10);
  }
  // carries[pos] is carry INTO column pos (from right, 0-indexed)
  // We want carry displayed ABOVE column pos from LEFT
  // carryAbove[colFromLeft] = carry going into that column
  const carryAbove = Array(maxLen).fill(0);
  for (let pos = 0; pos < maxLen - 1; pos++) {
    carryAbove[maxLen - 2 - pos] = carries[pos];
  }

  const CW = 28; // cell width
  const CH = 36; // cell height
  const OW = 28; // operator column width
  const totalW = OW + maxLen * CW + 8;
  const carryH = 20;
  const lineY = carryH + numbers.length * CH + 6;
  const totalH = lineY + CH + 8;

  const getDigit = (n, colFromLeft) => {
    const s = String(n);
    const idx = colFromLeft - (maxLen - s.length);
    return idx >= 0 && idx < s.length ? s[idx] : null;
  };

  const totalStr = String(total);

  return (
    <div style={{ marginTop: 10, display: "inline-block" }}>
      {label && <div style={{ fontSize: 14, color: "var(--text3)", marginBottom: 6, fontWeight: 600 }}>{label}</div>}
      <svg width={totalW} height={totalH} style={{ display: "block", overflow: "visible" }}>
        {/* Carry row */}
        {carryAbove.map((c, ci) => c > 0 && (
          <text key={"c" + ci}
            x={OW + ci * CW + CW / 2} y={carryH - 4}
            textAnchor="middle" fontSize="13" fontWeight="800"
            fill="var(--blue)" fontFamily="var(--mono)">
            {c}
          </text>
        ))}
        {/* Number rows */}
        {numbers.map((n, ri) => (
          <g key={"r" + ri}>
            {ri === numbers.length - 1 && (
              <text x={OW - 4} y={carryH + ri * CH + CH * 0.68}
                textAnchor="end" fontSize="20" fill="var(--text3)" fontFamily="var(--mono)">+</text>
            )}
            {Array.from({ length: maxLen }, (_, ci) => {
              const d = getDigit(n, ci);
              return d ? (
                <text key={"d" + ci}
                  x={OW + ci * CW + CW / 2} y={carryH + ri * CH + CH * 0.68}
                  textAnchor="middle" fontSize="24" fontWeight="700"
                  fill="var(--text)" fontFamily="var(--mono)">{d}</text>
              ) : null;
            })}
          </g>
        ))}
        {/* Line */}
        <line x1={OW} y1={lineY} x2={OW + maxLen * CW} y2={lineY}
          stroke="var(--text)" strokeWidth="2.5" />
        {/* Total */}
        {totalStr.split("").map((ch, ci) => {
          const colFromLeft = maxLen - totalStr.length + ci;
          return (
            <text key={"t" + ci}
              x={OW + colFromLeft * CW + CW / 2} y={lineY + CH * 0.72}
              textAnchor="middle" fontSize="24" fontWeight="800"
              fill="var(--green)" fontFamily="var(--mono)">{ch}</text>
          );
        })}
      </svg>
    </div>
  );
}


function MissingSideCalc({ side, allSides, unit }) {
  // For a missing side, show either addition (if it equals sum of parallel sides)
  // or subtraction (if it equals long - other short sides)
  if (!side || !allSides) return null;
  const sameDirSides = allSides.filter((s, si) => s.dir === side.dir);
  const maxLen = Math.max(...sameDirSides.map(s => s.length));
  const isLong = side.length === maxLen;
  const otherSameDirSides = sameDirSides.filter(s => s.length !== side.length || s.label !== side.label);

  if (isLong) {
    // Long side = sum of shorter parallel sides (addition)
    const nums = otherSameDirSides.map(s => s.length);
    return <ColumnAdditionReveal numbers={nums} label={"= " + side.length + unit + " (sum of opposite sides)"} />;
  } else {
    // Short side = long side - other short sides (subtraction style)
    const longSide = sameDirSides.find(s => s.length === maxLen);
    const otherShorts = otherSameDirSides.filter(s => s.length !== maxLen).map(s => s.length);
    const subtracted = otherShorts.reduce((a, b) => a - b, longSide?.length || 0);
    return (
      <div style={{ marginTop: 10, padding: "10px 14px", background: "var(--bg3)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", display: "inline-block" }}>
        <div style={{ fontSize: 14, color: "var(--text3)", marginBottom: 6, fontWeight: 600 }}>
          {"= " + side.length + unit + " (long side minus other shorts)"}
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 20, color: "var(--text)" }}>
          {longSide?.length}{unit} - {otherShorts.join(" - ")} = <strong style={{ color: "var(--green)" }}>{side.length}{unit}</strong>
        </div>
      </div>
    );
  }
}

function RevealCalculation({ question }) {
  if (!question) return null;

  if (question.type === "line-segments") {
    return <ColumnAdditionReveal numbers={question.segments} label={"Total: " + question.displayAnswer} />;
  }
  if (question.type === "polygon") {
    return <ColumnAdditionReveal numbers={question.lengths} label={"Perimeter: " + question.displayAnswer} />;
  }
  if (question.type === "rectangle-perimeter") {
    return <ColumnAdditionReveal numbers={[question.w, question.h, question.w, question.h]} label={"Perimeter = w + h + w + h = " + question.displayAnswer} />;
  }

  if (question.type === "square-perimeter") {
    return <ColumnAdditionReveal numbers={[question.s, question.s, question.s, question.s]} label={"Perimeter = 4 x " + question.s + question.unit + " = " + question.displayAnswer} />;
  }
  if (question.type === "rectilinear-5B" && question.missingAnswers && question.sides) {
    return (
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
        {question.missingAnswers.map((ma, i) => {
          const side = { ...question.sides[ma.idx], length: ma.length };
          return (
            <div key={i}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text3)", marginBottom: 4 }}>Missing side {i + 1}:</div>
              <MissingSideCalc side={side} allSides={question.sides} unit={question.unit} />
            </div>
          );
        })}
      </div>
    );
  }
  if (question.type === "rectilinear-5C" && question.hideIndices && question.sides) {
    const allSides = question.sides;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
        {question.hideIndices.map((hidIdx, i) => {
          const side = allSides[hidIdx];
          return (
            <div key={i}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text3)", marginBottom: 4 }}>Missing side {i + 1}:</div>
              <MissingSideCalc side={side} allSides={allSides} unit={question.unit} />
            </div>
          );
        })}
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text3)", marginBottom: 4 }}>Perimeter (all sides):</div>
          <ColumnAdditionReveal numbers={allSides.map(s => s.length)} label={"= " + question.displayAnswer} />
        </div>
      </div>
    );
  }
  return null;
}

function QuestionDisplay({ question, selectedSides, onSideClick, revealCorrect, activeMissingIdx, revealedAnswers }) {
  if (!question) return null;
  switch (question.type) {
    case "line-segments": return <LineSegmentsSVG question={question} />;
    case "polygon": return <PolygonSVG question={question} />;
    case "rectangle-perimeter": return <RectangleSVG question={question} mode="3B" revealCorrect={revealCorrect} />;
    case "square-perimeter": return <SquareSVG question={question} revealCorrect={revealCorrect} />;
    case "rectilinear-5A":
    case "rectilinear-5B":
    case "rectilinear-5C":
      return <RectilinearSVG
        question={{ ...question, activeMissingIdx }}
        selectedSides={selectedSides} onSideClick={onSideClick}
        highlightSideIdx={question.type === "rectilinear-5A" ? question.highlightSideIdx : undefined}
        revealCorrect={revealCorrect}
        revealedAnswers={revealedAnswers} />;
    default: return null;
  }
}

function AnswerInput({ question, onSubmit, submitted, selectedSides, onSideClick, activeMissingIdx }) {
  const [input, setInput] = useState("");
  const [enteredSides, setEnteredSides] = useState({});
  const inputRef = useRef(null);

  useEffect(() => {
    setInput(""); setEnteredSides({});
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [question?.type, question?.id]);

  // For 5B: click side -> enter length -> confirm -> next side
  if (question?.type === "rectilinear-5B") {
    const missingAnswers = question.missingAnswers || [];
    const allEntered = missingAnswers.every(ma => enteredSides[ma.idx] !== undefined);
    // activeMissingIdx is passed from parent (set when SVG ? is clicked)
    const currentActive = activeMissingIdx;

    const handleConfirm = () => {
      if (currentActive === null || !input.trim()) return;
      const newEntered = { ...enteredSides, [currentActive]: input.trim() };
      setEnteredSides(newEntered);
      setInput("");
      // Move to next unentered missing side
      const next = missingAnswers.find(ma => newEntered[ma.idx] === undefined);
      onSideClick && onSideClick(next ? next.idx : null);
    };

    useEffect(() => {
      if (currentActive !== null) {
        setInput("");
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }, [currentActive]);

    return (
      <div>
        <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>
          {currentActive !== null
            ? "Enter the length for the highlighted side (include units)"
            : allEntered ? "All sides entered - ready to submit!"
            : "Click a ? side to select it, then enter its length"}
        </div>
        {currentActive !== null && (
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
          disabled={submitted || !allEntered}>
          Submit All
        </button>
      </div>
    );
  }

  const isClick = question?.type === "rectilinear-5A";
  if (isClick) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>
          {"Click sides that sum to the highlighted side. Selected: " + (selectedSides?.length || 0)}
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => onSubmit((selectedSides || []).slice().sort((a, b) => a - b).join(","))} disabled={submitted}>Submit</button>
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

function TimerBar({ endsAt, totalSeconds, onExpired }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const expiredRef = useRef(false);
  useEffect(() => {
    expiredRef.current = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !expiredRef.current) { expiredRef.current = true; onExpired?.(); }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endsAt]);
  const pct = Math.max(0, (remaining / totalSeconds) * 100);
  const color = remaining <= 5 ? "var(--red)" : remaining <= 10 ? "var(--amber)" : "var(--green)";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>
        <span>Time remaining</span>
        <span style={{ fontWeight: 700, color, fontSize: 16 }}>{remaining}s</span>
      </div>
      <div style={{ height: 7, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 99, transition: "width 0.5s linear" }} />
      </div>
    </div>
  );
}

function TeacherLesson02({ session, sessionId, uid }) {
  const [answers, setAnswers] = useState([]);
  const [timerInput, setTimerInput] = useState(90);
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0);
  const revealedRef = useRef(false);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const totalStudents = Object.keys(participants).length;
  const currentTopic = LESSON02_TOPICS[currentTopicIdx];

  useEffect(() => {
    if (!question?.id) return;
    setAnswers([]);
    revealedRef.current = false;
    const unsub = onClassworkAnswersChange(sessionId, question.id, setAnswers);
    return () => unsub();
  }, [question?.id]);

  const handleGenerate = async () => {
    const q = generateLesson02Question(currentTopic.id);
    const qId = "q_" + Date.now().toString(36);
    q.id = qId; q.points = POINTS;
    revealedRef.current = false;
    setAnswers([]);
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "question", currentQuestion: q,
      timerSeconds: timerInput, timerEndsAt: Date.now() + timerInput * 1000,
      questionCount: (session.questionCount || 0) + 1,
    });
  };

  const handleReveal = async () => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    for (const ans of answers) {
      if (ans.answer !== undefined && gradeLesson02Answer(ans.answer, question)) {
        await addToScore(sessionId, ans.uid, POINTS);
      }
    }
    await updateDoc(doc(db, "sessions", sessionId), { status: "revealing" });
  };

  const handleTimerExpired = async () => {
    if (session.status === "question" && !revealedRef.current) await handleReveal();
  };

  const handleNextTopic = async () => {
    const nextIdx = Math.min(currentTopicIdx + 1, LESSON02_TOPICS.length - 1);
    setCurrentTopicIdx(nextIdx);
    const q = generateLesson02Question(LESSON02_TOPICS[nextIdx].id);
    const qId = "q_" + Date.now().toString(36);
    q.id = qId; q.points = POINTS;
    revealedRef.current = false;
    setAnswers([]);
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "question", currentQuestion: q,
      timerSeconds: timerInput, timerEndsAt: Date.now() + timerInput * 1000,
      questionCount: (session.questionCount || 0) + 1,
    });
  };

  const handleEnd = async () => {
    if (confirm("End the session?")) await updateDoc(doc(db, "sessions", sessionId), { status: "ended" });
  };

  const submittedCount = answers.length;
  const correctCount = answers.filter(a => gradeLesson02Answer(a.answer, question)).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 2 }}>Join Code</div>
            <div style={{ fontSize: 36, fontWeight: 900, fontFamily: "var(--mono)", color: "var(--blue)", letterSpacing: "0.15em" }}>{session.joinCode}</div>
            <div style={{ fontSize: 13, color: "var(--text3)" }}>{totalStudents} student{totalStudents !== 1 ? "s" : ""} joined</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 13, color: "var(--text2)" }}>Seconds:</label>
              <input type="number" min={10} max={300} value={timerInput}
                onChange={e => setTimerInput(Number(e.target.value))}
                style={{ width: 70, padding: "6px 10px", fontSize: 14, textAlign: "center" }} />
            </div>
            {session.status === "question" && <button className="btn btn-ghost" onClick={handleReveal}>Reveal</button>}
            {session.status === "revealing" && (
              <>
                <button className="btn btn-ghost" onClick={handleGenerate}>Repeat Topic</button>
                {currentTopicIdx < LESSON02_TOPICS.length - 1 && (
                  <button className="btn btn-primary" onClick={handleNextTopic}>
                    Next: {LESSON02_TOPICS[currentTopicIdx + 1].label}
                  </button>
                )}
              </>
            )}
            <button className="btn btn-ghost" style={{ color: "var(--red)" }} onClick={handleEnd}>End</button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Topic</div>
          {LESSON02_TOPICS.map((t, i) => {
            const isActive = i === currentTopicIdx;
            const isDone = i < currentTopicIdx;
            return (
              <button key={t.id} onClick={() => setCurrentTopicIdx(i)}
                style={{ background: isActive ? "rgba(59,130,246,0.15)" : "var(--surface)", border: "2px solid " + (isActive ? "var(--blue)" : isDone ? "rgba(16,185,129,0.3)" : "var(--border)"), borderRadius: "var(--radius)", padding: "8px 12px", cursor: "pointer", textAlign: "left", fontFamily: "var(--font)" }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: isActive ? "var(--blue)" : isDone ? "var(--green)" : "var(--text)" }}>
                  {isDone ? "done " : isActive ? "now " : (i + 1) + ". "}{t.label}
                </div>
                <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{t.description}</div>
              </button>
            );
          })}
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={handleGenerate} disabled={session.status === "question"}>Generate Question</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {session.status === "waiting" && (
            <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Waiting for students</h3>
              <p style={{ color: "var(--blue)", fontFamily: "var(--mono)", fontSize: 24, fontWeight: 900 }}>{session.joinCode}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 12 }}>
                {Object.values(participants).map(p => (
                  <div key={p.name} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 12px", fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                ))}
              </div>
            </div>
          )}

          {question && (session.status === "question" || session.status === "revealing") && (
            <>
              <div className="card">
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8 }}>
                  {currentTopic.label} - {submittedCount}/{totalStudents} submitted - {correctCount} correct
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{question.prompt}</div>
                <QuestionDisplay question={question} revealCorrect={session.status === "revealing"} revealedAnswers={session.status === "revealing" ? question.missingAnswers : null} />
                {session.status === "question" && session.timerEndsAt && (
                  <div style={{ marginTop: 12 }}>
                    <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} onExpired={handleTimerExpired} />
                  </div>
                )}
                {session.status === "revealing" && (
                  <div style={{ marginTop: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--radius-sm)", padding: "12px 16px" }}>
                    <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 6 }}>Correct answer</div>
                    {question.displayAnswer && question.type !== "rectilinear-5B" && (
                      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", fontFamily: "var(--mono)", marginBottom: 8 }}>{question.displayAnswer}</div>
                    )}
                    <RevealCalculation question={question} />
                  </div>
                )}
                <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden", marginTop: 12 }}>
                  <div style={{ height: "100%", width: (totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0) + "%", background: "var(--blue)", borderRadius: 99, transition: "width 0.3s" }} />
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Student Answers</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 280, overflowY: "auto" }}>
                  {Object.entries(participants).map(([pUid, p]) => {
                    const ans = answers.find(a => a.uid === pUid);
                    const has = ans?.answer !== undefined && ans?.answer !== null && ans?.answer !== "";
                    const correct = has && gradeLesson02Answer(ans.answer, question);
                    return (
                      <div key={pUid} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "7px 12px", border: "1px solid " + (has ? (correct ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)") : "var(--border)") }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                        {has ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {session.status === "revealing" && <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text2)" }}>{ans.answer}</span>}
                            <span style={{ fontWeight: 700, color: correct ? "var(--green)" : "var(--red)" }}>{correct ? "+" + POINTS : "X"}</span>
                          </div>
                        ) : <span style={{ fontSize: 12, color: "var(--text3)" }}>thinking...</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentLesson02({ session, sessionId, uid }) {
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [lastQId, setLastQId] = useState(null);
  const [selectedSides, setSelectedSides] = useState([]);
  const [activeMissingIdx, setActiveMissingIdx] = useState(null);
  const question = session.currentQuestion;
  const participants = session.participants || {};
  const myScore = participants[uid]?.totalScore || 0;

  useEffect(() => {
    if (question?.id && question.id !== lastQId) {
      setSubmitted(false); setResult(null); setLastQId(question.id); setSelectedSides([]);
    }
  }, [question?.id]);

  const handleSideClick = (idx) => {
    if (question?.type === "rectilinear-5B") {
      setActiveMissingIdx(idx);
    } else if (idx !== null) {
      setSelectedSides(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
    }
  };

  const handleSubmit = async (inputVal) => {
    if (!question || submitted) return;
    const ans = String(inputVal).trim();
    if (!ans) return;
    const correct = gradeLesson02Answer(ans, question);
    await setDoc(doc(db, "sessions", sessionId, "answers", uid + "_" + question.id), {
      uid, questionId: question.id, answer: ans, correct, submittedAt: Date.now(),
    });
    if (correct) await addToScore(sessionId, uid, POINTS);
    setResult({ correct, answer: ans });
    setSubmitted(true);
  };

  if (session.status === "waiting") return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Waiting for teacher...</h2>
      <p style={{ color: "var(--text2)" }}>Lesson 2 - Geometry session is about to begin!</p>
    </div>
  );

  if (session.status === "ended") return (
    <div className="card" style={{ maxWidth: 400, margin: "0 auto", textAlign: "center", padding: "32px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Session Complete!</h2>
      <div style={{ fontSize: 26, fontWeight: 900, color: "var(--blue)" }}>{myScore} pts</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 580, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: "var(--text3)" }}>{question ? (LESSON02_TOPICS.find(t => t.id === question.topicId)?.label || "") : ""}</div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 12px", fontSize: 13, fontWeight: 700 }}>Score: {myScore} pts</div>
      </div>
      <div className="card" key={question?.id}>
        {session.status === "question" && session.timerEndsAt && !submitted && (
          <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
        )}
        {question && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>{question.prompt}</div>
            <QuestionDisplay question={question} selectedSides={selectedSides} onSideClick={handleSideClick} revealCorrect={session.status === "revealing"} activeMissingIdx={activeMissingIdx} revealedAnswers={session.status === "revealing" ? question.missingAnswers : null} />
          </>
        )}
        {session.status === "revealing" ? (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            {result ? (
              <>
                <div style={{ fontSize: 20, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 6 }}>
                  {result.correct ? "Correct! +" + POINTS + " pts" : "Incorrect"}
                </div>
                <div style={{ fontSize: 13, color: "var(--text2)" }}>
                  Your answer: <strong style={{ fontFamily: "var(--mono)" }}>
                    {question?.type === "rectilinear-5B" ? (() => { try { return JSON.parse(result.answer).map(a => a.value).join(", "); } catch { return result.answer; } })() : result.answer}
                  </strong>
                </div>
                {!result.correct && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ color: "var(--green)", fontSize: 16, marginBottom: 6 }}>
                      Correct: <strong style={{ fontFamily: "var(--mono)" }}>
                        {question?.type === "rectilinear-5B" && question.missingAnswers
                          ? question.missingAnswers.map(ma => ma.length + question.unit).join(", ")
                          : question?.displayAnswer}
                      </strong>
                    </div>
                    <RevealCalculation question={question} />
                  </div>
                )}
              </>
            ) : (
              <div>
                <div style={{ color: "var(--text3)", marginBottom: 4 }}>No answer submitted.</div>
                {question?.displayAnswer && <div style={{ color: "var(--green)", fontSize: 16, marginBottom: 8 }}>Correct: <strong style={{ fontFamily: "var(--mono)" }}>{question.displayAnswer}</strong></div>}
                <RevealCalculation question={question} />
              </div>
            )}
          </div>
        ) : submitted ? (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>Submitted!</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Waiting for teacher to reveal...</div>
          </div>
        ) : question ? (
          <div style={{ marginTop: 14 }}>
            <AnswerInput question={question} onSubmit={handleSubmit} submitted={submitted} selectedSides={selectedSides} onSideClick={handleSideClick} activeMissingIdx={activeMissingIdx} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CreateLesson02Session({ user, onCreated }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [timer, setTimer] = useState(90);
  const [loading, setLoading] = useState(false);
  useEffect(() => { getTeacherClasses(user.id).then(setClasses); }, []);
  const handleCreate = async () => {
    setLoading(true);
    try {
      const { sessionId } = await createClassworkSession(user.id, selectedClass, timer);
      await updateDoc(doc(db, "sessions", sessionId), { type: "lesson02" });
      onCreated(sessionId);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="card">
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Lesson 2 - Geometry</h2>
        <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 16 }}>Line segments, polygon perimeters, rectangles, squares, and composite rectilinear shapes.</p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 5 }}>Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 14 }}>
            <option value="">Select a class...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 5 }}>Default seconds per question</label>
          <input type="number" min={30} max={300} value={timer} onChange={e => setTimer(Number(e.target.value))} style={{ width: "100%", padding: "10px 12px", fontSize: 14 }} />
        </div>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={handleCreate} disabled={loading || !selectedClass}>
          {loading ? "Creating..." : "Start Session"}
        </button>
      </div>
    </div>
  );
}

export default function Lesson02Session({ user, onHome }) {
  const [view, setView] = useState("create");
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  useEffect(() => {
    if (!sessionId) return;
    const unsub = onSessionChange(sessionId, setSession);
    return () => unsub();
  }, [sessionId]);
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--cyan))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>L2</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>GCA</div>
              <div style={{ color: "var(--text3)", fontSize: 12 }}>Lesson 2 - Geometry</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        {view === "create" && <CreateLesson02Session user={user} onCreated={(sid) => { setSessionId(sid); setView("session"); }} />}
        {view === "session" && session && (
          user.role === "teacher"
            ? <TeacherLesson02 session={session} sessionId={sessionId} uid={user.id} />
            : <StudentLesson02 session={session} sessionId={sessionId} uid={user.id} />
        )}
        {view === "session" && !session && (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>
        )}
      </div>
    </div>
  );
}

export { TeacherLesson02 as Lesson02TeacherView, StudentLesson02 as Lesson02StudentView };



