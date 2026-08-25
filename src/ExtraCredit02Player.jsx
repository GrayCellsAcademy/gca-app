import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson02-ec-v1";
const STREAK_NEEDED = 3;
const UNITS = ["cm", "mm", "m", "km", "in", "ft", "yd", "mi"];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randUnit() { return UNITS[Math.floor(Math.random() * UNITS.length)]; }

//  Staircase Generator
// 2-step staircase: steps get bigger going downward (top step narrowest/shortest)
// h1 < h2 < h3, v1 < v2 < v3 (strictly increasing)
// Long horizontal H = h1+h2+h3, Long vertical V = v1+v2+v3
// Perimeter = 2*(H+V)
function genStaircase() {
  const unit = randUnit();
  let h1, h2, h3;
  do {
    [h1, h2, h3] = [randInt(10, 30), randInt(10, 30), randInt(10, 30)].sort((a, b) => a - b);
  } while (h1 === h2 || h2 === h3);
  const H = h1 + h2 + h3;

  let v1, v2, v3;
  do {
    [v1, v2, v3] = [randInt(10, 30), randInt(10, 30), randInt(10, 30)].sort((a, b) => a - b);
  } while (v1 === v2 || v2 === v3);
  const V = v1 + v2 + v3;

  const perimeter = 2 * (H + V);
  const rotation = Math.floor(Math.random() * 4);
  const hideDir = Math.random() < 0.5 ? "h" : "v";
  return { unit, h1, h2, h3, H, v1, v2, v3, V, perimeter, rotation, hideDir };
}

// Vertices (SVG y-down, clockwise from top-left):
// P0=(0,0)           top-left
// P1=(0,V)           bottom-left
// P2=(H,V)           bottom-right
// P3=(H,V-v3)        step2 right (up v3 from bottom)
// P4=(H-h1,V-v3)     step2 corner
// P5=(H-h1,v1)       step1 right (v1 from top)
// P6=(h3,v1)         step1 corner
// P7=(h3,0)          top of step1
// Sides: long-v, long-h, short-v(v3), short-h(h1), short-v(v2), short-h(h2), short-v(v1), short-h(h3)
function buildVertices(q) {
  const { h1, h2, h3, H, v1, v2, v3, V } = q;
  return [
    { x: 0,      y: 0 },
    { x: 0,      y: V },
    { x: H,      y: V },
    { x: H,      y: V - v3 },
    { x: H - h1, y: V - v3 },
    { x: H - h1, y: v1 },
    { x: h3,     y: v1 },
    { x: h3,     y: 0 },
  ];
}

function buildSides(q) {
  const { h1, h2, h3, H, v1, v2, v3, V } = q;
  return [
    { length: V,  dir: "v", type: "long-v",  from: 0, to: 1 },
    { length: H,  dir: "h", type: "long-h",  from: 1, to: 2 },
    { length: v3, dir: "v", type: "short-v", from: 2, to: 3 },
    { length: h1, dir: "h", type: "short-h", from: 3, to: 4 },
    { length: v2, dir: "v", type: "short-v", from: 4, to: 5 },
    { length: h2, dir: "h", type: "short-h", from: 5, to: 6 },
    { length: v1, dir: "v", type: "short-v", from: 6, to: 7 },
    { length: h3, dir: "h", type: "short-h", from: 7, to: 0 },
  ];
}

function rotatePt(p, W, H, rotation) {
  switch (rotation) {
    case 1: return { x: H - p.y, y: p.x };
    case 2: return { x: W - p.x, y: H - p.y };
    case 3: return { x: p.y, y: W - p.x };
    default: return { ...p };
  }
}

function StaircaseSVG({ question, activityType }) {
  const { rotation, hideDir, unit } = question;
  const sides = buildSides(question);
  const rawVerts = buildVertices(question);
  const { H, V } = question;

  const rawW = H, rawH = V;
  const rotW = (rotation === 1 || rotation === 3) ? rawH : rawW;
  const rotH = (rotation === 1 || rotation === 3) ? rawW : rawH;

  const svgW = 420, svgH = 360, pad = 65;
  const scale = Math.min((svgW - pad * 2) / rotW, (svgH - pad * 2) / rotH);
  const offX = (svgW - rotW * scale) / 2;
  const offY = (svgH - rotH * scale) / 2;

  const sv = rawVerts.map(p => {
    const rp = rotatePt(p, rawW, rawH, rotation);
    return { x: rp.x * scale + offX, y: rp.y * scale + offY };
  });

  const pathD = sv.map((p, i) => (i === 0 ? "M" : "L") + " " + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ") + " Z";

  const cx = sv.reduce((s, p) => s + p.x, 0) / sv.length;
  const cy = sv.reduce((s, p) => s + p.y, 0) / sv.length;

  const isHidden = (side) => {
    if (activityType === "A") return side.type === "short-" + hideDir;
    if (activityType === "B") return side.type === "short-" + hideDir;
    if (activityType === "C") {
      const otherDir = hideDir === "h" ? "v" : "h";
      return side.type === "short-" + hideDir || side.type === "long-" + otherDir;
    }
    return false;
  };

  return (
    <svg viewBox={"0 0 " + svgW + " " + svgH} style={{ width: "100%", maxWidth: svgW, display: "block", margin: "0 auto" }}>
      <path d={pathD} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.06)" />
      {sides.map((side, i) => {
        const p1 = sv[side.from], p2 = sv[side.to];
        const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const perpX = -dy / len, perpY = dx / len;
        const outDir = (mx - cx) * perpX + (my - cy) * perpY > 0 ? 1 : -1;
        const lx = mx + perpX * outDir * 30;
        const ly = my + perpY * outDir * 30;
        const hidden = isHidden(side);
        const boxW = 72;
        return (
          <g key={i}>
            {hidden && (
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="var(--amber)" strokeWidth="3" strokeDasharray="8 4" />
            )}
            <rect x={lx - boxW / 2} y={ly - 14} width={boxW} height={28} rx={5}
              fill={hidden ? "rgba(251,191,36,0.15)" : "var(--bg2)"}
              stroke={hidden ? "var(--amber)" : "var(--border)"} strokeWidth={hidden ? 2 : 1} />
            <text x={lx} y={ly + 6} textAnchor="middle" fontSize="14" fontWeight="700"
              fill={hidden ? "var(--amber)" : "var(--text)"} fontFamily="var(--mono)">
              {hidden ? "?" : side.length + " " + unit}
            </text>
          </g>
        );
      })}
      <text x={svgW / 2} y={svgH - 8} textAnchor="middle" fontSize="11" fill="var(--text3)" fontStyle="italic">Not drawn to scale</text>
    </svg>
  );
}

const ACTIVITIES = [
  {
    id: "A",
    label: "Staircase - Sum of Short Sides",
    prompt: () => "The highlighted sides are missing their labels. What is their total length? Include units.",
    getAnswer: (q) => (q.hideDir === "h" ? q.H : q.V) + q.unit,
    getExplanation: (q) => {
      const val = q.hideDir === "h" ? q.H : q.V;
      const dir = q.hideDir === "h" ? "horizontal" : "vertical";
      return `The short ${dir} sides together span the same distance as the long ${dir} side, so they must sum to ${val} ${q.unit}.`;
    },
  },
  {
    id: "B",
    label: "Staircase - Perimeter",
    prompt: () => "Find the perimeter of the shape. The highlighted sides are unlabeled but can be worked out. Include units.",
    getAnswer: (q) => q.perimeter + q.unit,
    getExplanation: (q) => {
      const shortSum = q.hideDir === "h" ? q.H : q.V;
      const longOther = q.hideDir === "h" ? q.V : q.H;
      const dir = q.hideDir === "h" ? "horizontal" : "vertical";
      return `The short ${dir} sides sum to ${shortSum} ${q.unit}. Perimeter = ${shortSum} + ${shortSum} + ${longOther} + ${longOther} = ${q.perimeter} ${q.unit}.`;
    },
  },
  {
    id: "C",
    label: "Staircase - Perimeter (harder)",
    prompt: (q) => {
      const dir = q.hideDir === "h" ? "horizontal" : "vertical";
      const oppDir = q.hideDir === "h" ? "vertical" : "horizontal";
      return `The short ${dir} sides and the long ${oppDir} side are all unlabeled. Work out the missing lengths and find the perimeter. Include units.`;
    },
    getAnswer: (q) => q.perimeter + q.unit,
    getExplanation: (q) => {
      const shortDir = q.hideDir === "h" ? "horizontal" : "vertical";
      const longDir = q.hideDir === "h" ? "vertical" : "horizontal";
      const shortSum = q.hideDir === "h" ? q.H : q.V;
      const longHidden = q.hideDir === "h" ? q.V : q.H;
      return `Short ${shortDir} sides sum to ${shortSum} ${q.unit} (same as the long ${shortDir} side). Long ${longDir} side = ${longHidden} ${q.unit} (sum of the short ${longDir} sides). Perimeter = ${shortSum} + ${shortSum} + ${longHidden} + ${longHidden} = ${q.perimeter} ${q.unit}.`;
    },
  },
];

function StreakDots({ current, needed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 20, color: "var(--text3)" }}>Streak:</span>
      {Array.from({ length: needed }).map((_, i) => (
        <div key={i} style={{
          width: 13, height: 13, borderRadius: "50%",
          background: i < current ? "var(--green)" : "var(--surface2)",
          border: `2px solid ${i < current ? "var(--green)" : "var(--border2)"}`,
          transition: "all 0.2s",
        }} />
      ))}
      <span style={{ fontSize: 20, color: "var(--text3)" }}>{current}/{needed}</span>
    </div>
  );
}

export default function ExtraCredit02Player({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "HW 2 EC (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [actIdx, setActIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const pendingNext = useRef(null);

  const currentActivity = ACTIVITIES[actIdx];

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { actIdx: ai, streak: st, completed } = prog.data;
        if (completed) { setPhase("done"); setLoading(false); return; }
        setActIdx(Math.min(ai || 0, ACTIVITIES.length - 1));
        setStreak(st || 0);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading && actIdx < ACTIVITIES.length) {
      newProblem();
    }
  }, [actIdx, loading]);

  const newProblem = () => {
    setProblem(genStaircase());
    setInput("");
    setPhase("question");
    pendingNext.current = null;
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const normalizeAnswer = (s) => String(s).toLowerCase().replace(/\s+/g, "").trim();

  const handleSubmit = async () => {
    if (!problem || phase !== "question") return;
    const correct = currentActivity.getAnswer(problem);
    const isCorrect = normalizeAnswer(input) === normalizeAnswer(correct);

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setPhase("correct");
      if (newStreak >= STREAK_NEEDED) {
        const nextAi = actIdx + 1;
        if (nextAi >= ACTIVITIES.length) {
          pendingNext.current = "done";
          await saveProgress(user.id, topicId, {
            started: true, completed: true, percentComplete: 100,
            data: { actIdx: nextAi, streak: 0, completed: true },
          });
        } else {
          pendingNext.current = "next";
          await saveProgress(user.id, topicId, {
            started: true, completed: false,
            percentComplete: Math.round((nextAi / ACTIVITIES.length) * 100),
            data: { actIdx: nextAi, streak: 0, completed: false },
          });
        }
      } else {
        pendingNext.current = "stay";
        await saveProgress(user.id, topicId, {
          started: true, completed: false,
          percentComplete: Math.round((actIdx / ACTIVITIES.length) * 100),
          data: { actIdx, streak: newStreak, completed: false },
        });
      }
    } else {
      setStreak(0);
      setPhase("wrong");
      await saveProgress(user.id, topicId, {
        started: true, completed: false,
        percentComplete: Math.round((actIdx / ACTIVITIES.length) * 100),
        data: { actIdx, streak: 0, completed: false },
      });
    }
  };

  const handleNext = () => {
    const p = pendingNext.current;
    if (p === "done") { setPhase("done"); }
    else if (p === "next") { setActIdx(ai => ai + 1); setStreak(0); }
    else { newProblem(); }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div className="spinner" />
    </div>
  );

  if (phase === "done") return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", animation: "fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize: 64, marginBottom: 16 }}></div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Extra Credit Complete!</h2>
        <p style={{ color: "var(--text2)", fontSize: 19, marginBottom: 24 }}>
          You've mastered all 3 staircase activities!
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>
           Back to Home
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 19, color: "var(--amber)", marginBottom: 2, fontWeight: 700 }}>
            Extra Credit  Activity {actIdx + 1} of {ACTIVITIES.length}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
            {currentActivity?.label}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>
          <span>Progress</span>
          <span>{actIdx}/{ACTIVITIES.length} activities</span>
        </div>
        <div style={{ height: 5, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(actIdx / ACTIVITIES.length) * 100}%`, background: "linear-gradient(90deg,var(--amber),#f97316)", borderRadius: 99 }} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        {problem && (
          <p style={{ fontSize: 18, fontWeight: 600, color: "var(--text2)", marginBottom: 14, textAlign: "center" }}>
            {currentActivity.prompt(problem)}
          </p>
        )}

        <div style={{ marginBottom: 20 }}>
          {problem && <StaircaseSVG question={problem} activityType={currentActivity.id} />}
        </div>

        {phase === "correct" ? (
          <div style={{ animation: "popIn 0.25s ease", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}></div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", marginBottom: 6 }}>Correct!</div>
            <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 20 }}>
              Streak: {streak}/{STREAK_NEEDED}
            </div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }}
              onClick={handleNext}>
               Next problem
            </button>
          </div>
        ) : phase === "wrong" ? (
          <div style={{ animation: "popIn 0.25s ease" }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#fca5a5", marginBottom: 12, textAlign: "center" }}>
              Not quite!
            </div>
            <div style={{ background: "rgba(59,130,246,0.07)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 18, color: "var(--text2)", lineHeight: 1.6 }}>
              {problem && currentActivity.getExplanation(problem)}
            </div>
            <div style={{ fontSize: 19, color: "var(--text3)", textAlign: "center", marginBottom: 16 }}>
              The answer was: <strong>{problem && currentActivity.getAnswer(problem)}</strong>
            </div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }}
              onClick={newProblem}>
              Got it - try again
            </button>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder={"e.g. 45" + (problem?.unit || "cm")}
              style={{ textAlign: "center", fontSize: 28, fontFamily: "var(--mono)", fontWeight: 700, padding: "12px", marginBottom: 12 }}
            />
            <button className="btn btn-primary" style={{ width: "100%", fontSize: 20, padding: "14px" }}
              onMouseDown={e => { e.preventDefault(); handleSubmit(); }}
              onTouchEnd={e => { e.preventDefault(); handleSubmit(); }}
              disabled={!input.trim()}>
              Submit
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        {ACTIVITIES.map((a, i) => {
          const done = i < actIdx;
          const active = i === actIdx;
          return (
            <div key={a.id} style={{
              fontSize: 19, fontWeight: 700, padding: "4px 14px", borderRadius: 99,
              background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(245,158,11,0.15)" : "var(--surface)",
              color: done ? "var(--green)" : active ? "var(--amber)" : "var(--text3)",
              border: `1px solid ${done ? "rgba(16,185,129,0.3)" : active ? "rgba(245,158,11,0.3)" : "var(--border)"}`,
            }}>
              {done ? " " : active ? " " : ""}Activity {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
