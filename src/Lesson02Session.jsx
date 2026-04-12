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

//  SVG: Line Segments 
function LineSegmentsSVG({ question }) {
  const { segments, unit, angles } = question;
  const W = 500, H = 180;
  // Build path: start at left, draw 3 segments with bend angles
  const startX = 60, startY = H / 2;
  const segLen = 120;

  let x = startX, y = startY;
  let cumulAngle = 0;
  const points = [{ x, y }];
  const midpoints = [];
  const labelAngles = [];

  for (let i = 0; i < segments.length; i++) {
    if (i > 0) cumulAngle += angles[i - 1] * (Math.PI / 180);
    const dx = segLen * Math.cos(cumulAngle);
    const dy = segLen * Math.sin(cumulAngle);
    const nx = x + dx, ny = y + dy;
    midpoints.push({ x: (x + nx) / 2, y: (y + ny) / 2 });
    labelAngles.push(cumulAngle);
    x = nx; y = ny;
    points.push({ x, y });
  }

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 500, display: "block", margin: "0 auto" }}>
      <path d={pathD} stroke="var(--text)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="5" fill="var(--blue)" />
      ))}
      {midpoints.map((m, i) => {
        const angle = labelAngles[i];
        const perpX = -Math.sin(angle) * 22;
        const perpY = Math.cos(angle) * 22;
        return (
          <g key={i}>
            <rect x={m.x + perpX - 28} y={m.y + perpY - 12} width={56} height={24} rx={6}
              fill="var(--bg2)" stroke="var(--border)" strokeWidth="1" />
            <text x={m.x + perpX} y={m.y + perpY + 5} textAnchor="middle"
              fontSize="14" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">
              {segments[i]} {unit}
            </text>
          </g>
        );
      })}
      <text x={W / 2} y={H - 12} textAnchor="middle" fontSize="13" fill="var(--text3)" fontStyle="italic">
        Not drawn to scale
      </text>
    </svg>
  );
}

//  SVG: Polygon 
function PolygonSVG({ question }) {
  const { vertices, lengths, unit } = question;
  if (!vertices || vertices.length === 0) return null;
  const W = 320, H = 320;

  // Scale vertices to fit
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scaleX = (W - 80) / (maxX - minX || 1);
  const scaleY = (H - 80) / (maxY - minY || 1);
  const scale = Math.min(scaleX, scaleY);
  const offX = (W - (maxX - minX) * scale) / 2;
  const offY = (H - (maxY - minY) * scale) / 2;
  const scaled = vertices.map(v => ({
    x: (v.x - minX) * scale + offX,
    y: (v.y - minY) * scale + offY,
  }));

  const pathD = scaled.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";

  const n = scaled.length;
  const midpoints = scaled.map((p, i) => {
    const next = scaled[(i + 1) % n];
    return { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 320, display: "block", margin: "0 auto" }}>
      <path d={pathD} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      {scaled.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--blue)" />)}
      {midpoints.map((m, i) => (
        <g key={i}>
          <rect x={m.x - 28} y={m.y - 12} width={56} height={24} rx={5}
            fill="var(--bg)" stroke="var(--border)" strokeWidth="1" />
          <text x={m.x} y={m.y + 5} textAnchor="middle"
            fontSize="12" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">
            {lengths[i]}{unit}
          </text>
        </g>
      ))}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text3)" fontStyle="italic">
        Not drawn to scale
      </text>
    </svg>
  );
}

//  SVG: Rectangle 
function RectangleSVG({ question, mode, selectedSides, onSideClick }) {
  const { w, h, unit } = question;
  const W = 360, H = 260;
  const rx = 70, ry = 45, rw = 220, rh = 170;
  // Sides: 0=top, 1=right, 2=bottom, 3=left
  const sides = [
    { x1: rx, y1: ry, x2: rx+rw, y2: ry, mx: rx+rw/2, my: ry-22, label: w },
    { x1: rx+rw, y1: ry, x2: rx+rw, y2: ry+rh, mx: rx+rw+38, my: ry+rh/2, label: h },
    { x1: rx+rw, y1: ry+rh, x2: rx, y2: ry+rh, mx: rx+rw/2, my: ry+rh+22, label: w },
    { x1: rx, y1: ry+rh, x2: rx, y2: ry, mx: rx-38, my: ry+rh/2, label: h },
  ];

  // For 3B mode: only show top and right labels (two perpendicular sides)
  const showLabelForSide = (i) => {
    if (mode === "3B") return i === 0 || i === 1;
    return false; // 3A: no labels shown
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 360, display: "block", margin: "0 auto" }}>
      <rect x={rx} y={ry} width={rw} height={rh}
        stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" rx="2" />
      <polyline points={`${rx+14},${ry} ${rx+14},${ry+14} ${rx},${ry+14}`}
        fill="none" stroke="var(--text3)" strokeWidth="1.5" />
      {sides.map((s, i) => {
        const isSelected = selectedSides?.includes(i);
        return (
          <g key={i} style={{ cursor: mode === "equal-sides" ? "pointer" : "default" }}
            onClick={() => mode === "equal-sides" && onSideClick && onSideClick(i)}>
            <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
              stroke={isSelected ? "var(--green)" : "var(--blue)"}
              strokeWidth={isSelected ? 5 : 2.5} />
            {showLabelForSide(i) && (
              <g>
                <rect x={s.mx-28} y={s.my-12} width={56} height={24} rx={5}
                  fill="var(--bg)" stroke="var(--border)" strokeWidth="1" />
                <text x={s.mx} y={s.my+5} textAnchor="middle"
                  fontSize="13" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">
                  {s.label}{unit}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

//  SVG: Square 
function SquareSVG({ question }) {
  const { s, unit } = question;
  const W = 260, H = 260;
  const sx = 40, sy = 40, sw = 180;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 260, display: "block", margin: "0 auto" }}>
      <rect x={sx} y={sy} width={sw} height={sw}
        stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      <polyline points={`${sx+14},${sy} ${sx+14},${sy+14} ${sx},${sy+14}`}
        fill="none" stroke="var(--text3)" strokeWidth="1.5" />
      <text x={sx + sw/2} y={sy - 14} textAnchor="middle"
        fontSize="15" fontWeight="800" fill="var(--text)" fontFamily="var(--mono)">
        {s} {unit}
      </text>
    </svg>
  );
}

//  SVG: Rectilinear Shape 
function RectilinearSVG({ question, selectedSides, onSideClick, highlightSideIdx, revealCorrect }) {
  const { vertices, sides, unit, hideIdx, activityType, correctSideIndices } = question;
  if (!vertices) return null;

  const W = 400, H = 360;
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scaleX = (W - 120) / (maxX - minX || 1);
  const scaleY = (H - 120) / (maxY - minY || 1);
  const scale = Math.min(scaleX, scaleY);
  const offX = (W - (maxX - minX) * scale) / 2;
  const offY = (H - (maxY - minY) * scale) / 2;
  const sv = vertices.map(v => ({
    x: (v.x - minX) * scale + offX,
    y: (v.y - minY) * scale + offY,
  }));

  const n = sv.length;
  const cx = sv.reduce((s, p) => s + p.x, 0) / n;
  const cy = sv.reduce((s, p) => s + p.y, 0) / n;

  const edgeMidpoints = sv.map((p, i) => {
    const next = sv[(i + 1) % n];
    return { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 };
  });

  const pathD = sv.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";

  // 5A: no labels at all
  // 5B/5C: show labels for all sides EXCEPT the hidden one, no question mark
  const showLabels = activityType !== "5A";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 400, display: "block", margin: "0 auto" }}>
      <path d={pathD} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      {sv.map((p, i) => {
        const next = sv[(i + 1) % n];
        const isHighlight = i === highlightSideIdx;
        const isSelected = selectedSides?.includes(i);
        const isCorrect = revealCorrect && correctSideIndices?.includes(i);
        const isHidden = i === hideIdx;
        const m = edgeMidpoints[i];

        // Calculate perpendicular offset for label
        const edgeX = next.x - p.x;
        const edgeY = next.y - p.y;
        const edgeLen = Math.sqrt(edgeX*edgeX + edgeY*edgeY) || 1;
        const perpX = -edgeY / edgeLen;
        const perpY = edgeX / edgeLen;
        const outDir = (m.x - cx) * perpX + (m.y - cy) * perpY > 0 ? 1 : -1;
        const dist = 42;
        const lx = m.x + perpX * outDir * dist;
        const ly = m.y + perpY * outDir * dist;

        // Side color
        let strokeColor = "var(--blue)";
        let strokeW = 2.5;
        if (isHighlight) { strokeColor = "var(--amber)"; strokeW = 5; }
        else if (isCorrect) { strokeColor = "var(--green)"; strokeW = 5; }
        else if (isSelected) { strokeColor = "var(--green)"; strokeW = 4; }

        return (
          <g key={i} style={{ cursor: activityType === "5A" && !isHighlight ? "pointer" : "default" }}
            onClick={() => activityType === "5A" && !isHighlight && onSideClick && onSideClick(i)}>
            <line x1={p.x} y1={p.y} x2={next.x} y2={next.y}
              stroke={strokeColor} strokeWidth={strokeW} />
            {showLabels && !isHidden && (
              <g>
                <rect x={lx-24} y={ly-12} width={48} height={24} rx={5}
                  fill="var(--bg2)" stroke="var(--border)" strokeWidth="1" />
                <text x={lx} y={ly+5} textAnchor="middle"
                  fontSize="12" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">
                  {sides[i]?.length}{unit}
                </text>
              </g>
            )}
          </g>
        );
      })}
      <text x={W/2} y={H-8} textAnchor="middle" fontSize="11" fill="var(--text3)" fontStyle="italic">
        Not drawn to scale
      </text>
    </svg>
  );
}) {
  const { vertices, sides, unit, hideIdx, activityType } = question;
  if (!vertices) return null;

  const W = 360, H = 320;
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scaleX = (W - 100) / (maxX - minX || 1);
  const scaleY = (H - 100) / (maxY - minY || 1);
  const scale = Math.min(scaleX, scaleY);
  const offX = (W - (maxX - minX) * scale) / 2;
  const offY = (H - (maxY - minY) * scale) / 2;
  const sv = vertices.map(v => ({
    x: (v.x - minX) * scale + offX,
    y: (v.y - minY) * scale + offY,
  }));

  const n = sv.length;
  const edgeMidpoints = sv.map((p, i) => {
    const next = sv[(i + 1) % n];
    return { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 };
  });

  const pathD = sv.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";

  // For label offset: push label away from shape center
  const cx = sv.reduce((s, p) => s + p.x, 0) / n;
  const cy = sv.reduce((s, p) => s + p.y, 0) / n;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: 360, display: "block", margin: "0 auto" }}>
      <path d={pathD} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      {sv.map((p, i) => {
        const next = sv[(i + 1) % n];
        const isHidden = i === hideIdx;
        const isHighlight = i === highlightSideIdx;
        const isSelected = selectedSides?.includes(i);
        const m = edgeMidpoints[i];
        // Calculate edge direction to offset label perpendicularly
        const edgeX = next.x - p.x;
        const edgeY = next.y - p.y;
        const edgeLen = Math.sqrt(edgeX*edgeX + edgeY*edgeY) || 1;
        // Perpendicular direction (rotated 90deg)
        const perpX = -edgeY / edgeLen;
        const perpY = edgeX / edgeLen;
        // Push away from center
        const outDir = (m.x - cx) * perpX + (m.y - cy) * perpY > 0 ? 1 : -1;
        const labelOffX = perpX * outDir * 38;
        const labelOffY = perpY * outDir * 38;
        const lx = m.x + labelOffX;
        const ly = m.y + labelOffY;
        const sideLen = isHidden ? "?" : sides[i]?.length;
        const showLabel = !isHidden || activityType === "5B" || activityType === "5C";

        return (
          <g key={i} style={{ cursor: activityType === "5A" ? "pointer" : "default" }}
            onClick={() => activityType === "5A" && !isHighlight && onSideClick && onSideClick(i)}>
            <line x1={p.x} y1={p.y} x2={next.x} y2={next.y}
              stroke={isHighlight ? "var(--amber)" : isSelected ? "var(--green)" : "var(--blue)"}
              strokeWidth={isHighlight || isSelected ? 5 : 2.5} />
            {showLabel && (
              <>
                <rect x={lx - 22} y={ly - 12} width={44} height={24} rx={5}
                  fill={isHidden ? "rgba(251,191,36,0.15)" : isHighlight ? "rgba(251,191,36,0.2)" : "var(--bg)"}
                  stroke={isHidden ? "var(--amber)" : isHighlight ? "var(--amber)" : "var(--border)"}
                  strokeWidth="1" />
                <text x={lx} y={ly + 5} textAnchor="middle"
                  fontSize="12" fontWeight="800"
                  fill={isHidden ? "var(--amber)" : "var(--text)"}
                  fontFamily="var(--mono)">
                  {isHidden ? "?" : `${sideLen}${unit}`}
                </text>
              </>
            )}
          </g>
        );
      })}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text3)" fontStyle="italic">
        Not drawn to scale
      </text>
    </svg>
  );
}

//  Question Display 
function QuestionDisplay({ question, selectedSides, onSideClick, revealCorrect }) {
  if (!question) return null;
  switch (question.type) {
    case "line-segments":
      return <LineSegmentsSVG question={question} />;
    case "polygon":
      return <PolygonSVG question={question} />;
    case "rectangle-equal-sides":
      return <RectangleSVG question={question} mode="equal-sides" selectedSides={selectedSides} onSideClick={onSideClick} />;
    case "rectangle-perimeter":
      return <RectangleSVG question={question} mode="3B" />;
    case "square-perimeter":
      return <SquareSVG question={question} />;
    case "rectilinear-5A":
    case "rectilinear-5B":
    case "rectilinear-5C":
      return <RectilinearSVG question={question} selectedSides={selectedSides} onSideClick={onSideClick}
        highlightSideIdx={question.type === "rectilinear-5A" ? question.highlightSideIdx : undefined}
        revealCorrect={revealCorrect} />;
    default:
      return null;
  }
}

//  Answer Input 
function AnswerInput({ question, onSubmit, submitted, selectedSides }) {
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [question?.type, question?.segments?.join?.("")]);

  const isClickType = question?.type === "rectangle-equal-sides" || question?.type === "rectilinear-5A";

  if (isClickType) {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 8 }}>
          {question.type === "rectangle-equal-sides"
            ? `Click sides to select pairs. Selected: ${selectedSides?.length || 0}/4`
            : `Click all sides that sum to the highlighted side. Selected: ${selectedSides?.length || 0}`}
        </div>
        <button className="btn btn-primary" style={{ width: "100%" }}
          onClick={() => onSubmit((selectedSides || []).slice().sort((a,b)=>a-b).join(","))}
          disabled={submitted}>
          Submit
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 6 }}>
        Include units (e.g. 45cm, 120 ft)
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onSubmit(input)}
          placeholder="e.g. 150cm" disabled={submitted}
          style={{ flex: 1, fontSize: 20, fontFamily: "var(--mono)", padding: "10px 14px" }} />
        <button className="btn btn-primary" onClick={() => onSubmit(input)}
          disabled={submitted || !input.trim()}>
          Submit
        </button>
      </div>
    </div>
  );
}

//  Timer Bar 
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
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.5s linear" }} />
      </div>
    </div>
  );
}

//  Teacher View 
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
    q.id = qId;
    q.points = POINTS;
    revealedRef.current = false;
    setAnswers([]);
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "question",
      currentQuestion: q,
      timerSeconds: timerInput,
      timerEndsAt: Date.now() + timerInput * 1000,
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
    const nextTopic = LESSON02_TOPICS[nextIdx];
    const q = generateLesson02Question(nextTopic.id);
    const qId = "q_" + Date.now().toString(36);
    q.id = qId; q.points = POINTS;
    revealedRef.current = false;
    setAnswers([]);
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "question",
      currentQuestion: q,
      timerSeconds: timerInput,
      timerEndsAt: Date.now() + timerInput * 1000,
      questionCount: (session.questionCount || 0) + 1,
    });
  };

  const handleEnd = async () => {
    if (confirm("End the session?")) {
      await updateDoc(doc(db, "sessions", sessionId), { status: "ended" });
    }
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
            {session.status === "question" && (
              <button className="btn btn-ghost" onClick={handleReveal}>Reveal</button>
            )}
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
                style={{
                  background: isActive ? "rgba(59,130,246,0.15)" : "var(--surface)",
                  border: "2px solid " + (isActive ? "var(--blue)" : isDone ? "rgba(16,185,129,0.3)" : "var(--border)"),
                  borderRadius: "var(--radius)", padding: "8px 12px",
                  cursor: "pointer", textAlign: "left", fontFamily: "var(--font)",
                }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: isActive ? "var(--blue)" : isDone ? "var(--green)" : "var(--text)" }}>
                  {isDone ? " " : isActive ? " " : `${i+1}. `}{t.label}
                </div>
                <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>{t.description}</div>
              </button>
            );
          })}
          <button className="btn btn-primary" style={{ marginTop: 8 }}
            onClick={handleGenerate} disabled={session.status === "question"}>
            Generate Question
          </button>
          {session.status === "waiting" && (
            <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", marginTop: 8 }}>
              Select a topic and generate the first question.
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {session.status === "waiting" && (
            <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Waiting for students</h3>
              <p style={{ color: "var(--blue)", fontFamily: "var(--mono)", fontSize: 24, fontWeight: 900 }}>{session.joinCode}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 12 }}>
                {Object.values(participants).map(p => (
                  <div key={p.name} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 12px", fontSize: 13, fontWeight: 600 }}>
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {question && (session.status === "question" || session.status === "revealing") && (
            <>
              <div className="card">
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8 }}>
                  {LESSON02_TOPICS.find(t => t.id === (question.topicId || currentTopic.id))?.label || currentTopic.label}
                  {" - "}{submittedCount}/{totalStudents} submitted - {correctCount} correct
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
                  {question.prompt}
                </div>
                <QuestionDisplay question={question} revealCorrect={session.status === "revealing"} />
                {session.status === "question" && session.timerEndsAt && (
                  <div style={{ marginTop: 12 }}>
                    <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} onExpired={handleTimerExpired} />
                  </div>
                )}
                {session.status === "revealing" && question.displayAnswer && (
                  <div style={{ marginTop: 12, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                    <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>Correct answer</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "var(--green)", fontFamily: "var(--mono)" }}>{question.displayAnswer}</div>
                  </div>
                )}
                <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden", marginTop: 12 }}>
                  <div style={{ height: "100%", width: `${totalStudents > 0 ? (submittedCount / totalStudents) * 100 : 0}%`, background: "var(--blue)", borderRadius: 99, transition: "width 0.3s" }} />
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Student Answers</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 280, overflowY: "auto" }}>
                  {Object.entries(participants).map(([pUid, p]) => {
                    const ans = answers.find(a => a.uid === pUid);
                    const hasSubmitted = ans?.answer !== undefined && ans?.answer !== null && ans?.answer !== "";
                    const isCorrect = hasSubmitted && gradeLesson02Answer(ans.answer, question);
                    return (
                      <div key={pUid} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "7px 12px",
                        border: "1px solid " + (hasSubmitted ? (isCorrect ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)") : "var(--border)"),
                      }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                        {hasSubmitted ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {session.status === "revealing" && (
                              <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text2)" }}>{ans.answer}</span>
                            )}
                            <span style={{ fontWeight: 700, color: isCorrect ? "var(--green)" : "var(--red)" }}>
                              {isCorrect ? `+${POINTS}` : "X"}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--text3)" }}>thinking...</span>
                        )}
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

//  Student View 
function StudentLesson02({ session, sessionId, uid }) {
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [lastQId, setLastQId] = useState(null);
  const [selectedSides, setSelectedSides] = useState([]);

  const question = session.currentQuestion;
  const participants = session.participants || {};
  const myScore = participants[uid]?.totalScore || 0;

  useEffect(() => {
    if (question?.id && question.id !== lastQId) {
      setSubmitted(false); setResult(null); setLastQId(question.id); setSelectedSides([]);
    }
  }, [question?.id]);

  const handleSideClick = (idx) => {
    setSelectedSides(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
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
      <p style={{ color: "var(--text2)" }}>Lesson 2  Geometry session is about to begin!</p>
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
        <div style={{ fontSize: 13, color: "var(--text3)" }}>
          {question ? (LESSON02_TOPICS.find(t => t.id === question.topicId)?.label || "") : ""}
        </div>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "5px 12px", fontSize: 13, fontWeight: 700 }}>
          Score: {myScore} pts
        </div>
      </div>

      <div className="card" key={question?.id}>
        {session.status === "question" && session.timerEndsAt && !submitted && (
          <TimerBar endsAt={session.timerEndsAt} totalSeconds={session.timerSeconds} />
        )}
        {question && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>{question.prompt}</div>
            <QuestionDisplay question={question} selectedSides={selectedSides} onSideClick={handleSideClick} revealCorrect={session.status === "revealing"} />
          </>
        )}

        {session.status === "revealing" ? (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            {result ? (
              <>
                <div style={{ fontSize: 20, fontWeight: 800, color: result.correct ? "var(--green)" : "var(--red)", marginBottom: 6 }}>
                  {result.correct ? `Correct! +${POINTS} pts` : "Incorrect"}
                </div>
                <div style={{ fontSize: 13, color: "var(--text2)" }}>
                  Your answer: <strong style={{ fontFamily: "var(--mono)" }}>{result.answer}</strong>
                </div>
                {!result.correct && question?.displayAnswer && (
                  <div style={{ color: "var(--green)", fontSize: 14, marginTop: 4 }}>
                    Correct: <strong style={{ fontFamily: "var(--mono)" }}>{question.displayAnswer}</strong>
                  </div>
                )}
              </>
            ) : (
              <div>
                <div style={{ color: "var(--text3)", marginBottom: 4 }}>No answer submitted.</div>
                {question?.displayAnswer && (
                  <div style={{ color: "var(--green)", fontSize: 14 }}>
                    Correct: <strong style={{ fontFamily: "var(--mono)" }}>{question.displayAnswer}</strong>
                  </div>
                )}
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
            <AnswerInput question={question} onSubmit={handleSubmit} submitted={submitted} selectedSides={selectedSides} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

//  Create Session 
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
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Lesson 2  Geometry</h2>
        <p style={{ color: "var(--text2)", fontSize: 13, marginBottom: 16 }}>
          Line segments, polygon perimeters, rectangles, squares, and composite rectilinear shapes.
        </p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 5 }}>Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 14 }}>
            <option value="">Select a class...</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", display: "block", marginBottom: 5 }}>Default seconds per question</label>
          <input type="number" min={30} max={300} value={timer}
            onChange={e => setTimer(Number(e.target.value))}
            style={{ width: "100%", padding: "10px 12px", fontSize: 14 }} />
        </div>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }}
          onClick={handleCreate} disabled={loading || !selectedClass}>
          {loading ? "Creating..." : "Start Session"}
        </button>
      </div>
    </div>
  );
}

//  Main Export 
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
