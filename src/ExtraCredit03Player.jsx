import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson03-ec-v1";
const STREAK_NEEDED = 3;
const AREA_UNITS = ["sq cm", "sq m", "sq in", "sq ft", "sq yd"];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

//  Generator
// Hexagon = rectangle with one corner cut, divided into 4 regions by internal lines
function genRegionProblem() {
  let attempts = 0;
  while (attempts < 1000) {
    attempts++;
    const unit = AREA_UNITS[Math.floor(Math.random() * AREA_UNITS.length)];
    const W = randInt(60, 100);
    const H = randInt(60, 100);
    const dx = randInt(22, W - 22);
    const dy = randInt(22, H - 22);
    const cx = randInt(8, Math.min(W - dx - 8, 22));
    const cy = randInt(8, Math.min(dy - 8, 22));
    const totalArea = W * H - cx * cy;
    const r0 = dx * dy;                          // top-left
    const r1 = (W - dx) * dy - cx * cy;          // top-right (L-shaped due to cut)
    const r2 = dx * (H - dy);                    // bottom-left
    const r3 = (W - dx) * (H - dy);              // bottom-right
    if (r1 <= 0 || r0 <= 0 || r2 <= 0 || r3 <= 0) continue;
    if (r0 + r1 + r2 + r3 !== totalArea) continue;
    const hiddenIdx = Math.floor(Math.random() * 4);
    return { W, H, dx, dy, cx, cy, totalArea, regions: [r0, r1, r2, r3], hiddenIdx, unit };
  }
  throw new Error("genRegionProblem: failed after 1000 attempts");
}

//  Shape SVG
// Outer hexagon vertices (cut top-right corner):
// (0,H), (W,H), (W,dy-cy... wait - cut is at top right
// Vertices clockwise from bottom-left:
// (0,H) -> (W,H) -> (W,cy) -> (W-cx,cy) -> (W-cx,0) -> (0,0) -> (0,H)
// Internal lines: vertical at x=dx, horizontal at y=dy
// Region labels placed at centroid of each region

function RegionSVG({ problem, revealCorrect }) {
  const { W, H, dx, dy, cx, cy, totalArea, regions, hiddenIdx, unit } = problem;

  const svgW = 440, svgH = 380, pad = 60;
  const scaleX = (svgW - pad * 2) / W;
  const scaleY = (svgH - pad * 2) / H;
  const scale = Math.min(scaleX, scaleY);
  const offX = (svgW - W * scale) / 2;
  const offY = (svgH - H * scale) / 2;

  const sx = x => x * scale + offX;
  const sy = y => y * scale + offY;

  // Outer shape vertices (y-down SVG coords)
  const outerPath = [
    [0, H], [W, H], [W, cy], [W - cx, cy], [W - cx, 0], [0, 0]
  ].map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(" ");

  // Internal divider lines (clipped to shape)
  // Vertical at x=dx: from y=0 to y=H
  // Horizontal at y=dy: from x=0 to x=W (but clipped at top-right cut)

  // Region centroids for label placement
  // Region 0 (top-left):    x in [0,dx], y in [0,dy]
  // Region 1 (top-right):   x in [dx,W], y in [0,dy] minus cut corner
  //   Centroid approx: weighted by sub-rectangles
  //   Full rect (W-dx)*dy minus cx*cy cut
  //   Full centroid: ((dx+(W-dx)/2), dy/2) weighted by (W-dx)*dy
  //   Cut centroid: ((W-cx/2), cy/2) weighted by cx*cy
  //   Combined centroid:
  const r1full = (W - dx) * dy;
  const r1cut = cx * cy;
  const r1area = r1full - r1cut;
  const r1cx = ((dx + (W - dx) / 2) * r1full - (W - cx / 2) * r1cut) / r1area;
  const r1cy_v = (dy / 2 * r1full - cy / 2 * r1cut) / r1area;

  const centroids = [
    { x: dx / 2, y: dy / 2 },                           // r0 top-left
    { x: r1cx, y: r1cy_v },                              // r1 top-right
    { x: dx / 2, y: dy + (H - dy) / 2 },                // r2 bottom-left
    { x: dx + (W - dx) / 2, y: dy + (H - dy) / 2 },    // r3 bottom-right
  ];

  // Region colors
  const colors = [
    "rgba(59,130,246,0.08)",
    "rgba(16,185,129,0.08)",
    "rgba(245,158,11,0.08)",
    "rgba(168,85,247,0.08)",
  ];
  const borderColors = [
    "rgba(59,130,246,0.4)",
    "rgba(16,185,129,0.4)",
    "rgba(245,158,11,0.4)",
    "rgba(168,85,247,0.4)",
  ];

  // Draw each region as a filled polygon
  // Region 0: (0,0),(dx,0),(dx,dy),(0,dy)
  // Region 1: (dx,0),(W-cx,0),(W-cx,cy),(W,cy),(W,dy),(dx,dy)
  // Region 2: (0,dy),(dx,dy),(dx,H),(0,H)
  // Region 3: (dx,dy),(W,dy),(W,H),(dx,H)
  const regionPaths = [
    [[0,0],[dx,0],[dx,dy],[0,dy]],
    [[dx,0],[W-cx,0],[W-cx,cy],[W,cy],[W,dy],[dx,dy]],
    [[0,dy],[dx,dy],[dx,H],[0,H]],
    [[dx,dy],[W,dy],[W,H],[dx,H]],
  ].map(pts => pts.map(([x,y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(" "));

  const labelBoxW = 100, labelBoxH = 32;

  return (
    <svg viewBox={"0 0 " + svgW + " " + svgH} style={{ width: "100%", maxWidth: svgW, display: "block", margin: "0 auto" }}>
      {/* Region fills */}
      {regionPaths.map((pts, i) => (
        <polygon key={i} points={pts} fill={colors[i]} stroke={borderColors[i]} strokeWidth="1.5" />
      ))}

      {/* Outer shape border */}
      <polygon points={outerPath} fill="none" stroke="var(--text)" strokeWidth="2.5" />

      {/* Internal divider lines */}
      <line x1={sx(dx)} y1={sy(0)} x2={sx(dx)} y2={sy(H)} stroke="var(--text2)" strokeWidth="1.5" strokeDasharray="6 3" />
      <line x1={sx(0)} y1={sy(dy)} x2={sx(W)} y2={sy(dy)} stroke="var(--text2)" strokeWidth="1.5" strokeDasharray="6 3" />

      {/* Region labels */}
      {centroids.map((c, i) => {
        const isHidden = i === hiddenIdx;
        const lx = sx(c.x), ly = sy(c.y);
        const show = !isHidden || revealCorrect;
        return (
          <g key={i}>
            <rect x={lx - labelBoxW/2} y={ly - labelBoxH/2} width={labelBoxW} height={labelBoxH} rx={6}
              fill={isHidden ? "rgba(251,191,36,0.2)" : "var(--bg)"}
              stroke={isHidden ? "var(--amber)" : borderColors[i]}
              strokeWidth={isHidden ? 2 : 1.5} />
            <text x={lx} y={ly + 6} textAnchor="middle" fontSize="13" fontWeight="700"
              fill={isHidden ? (revealCorrect ? "var(--green)" : "var(--amber)") : "var(--text)"}
              fontFamily="var(--mono)">
              {show ? regions[i] + " " + unit : "? " + unit}
            </text>
          </g>
        );
      })}

      {/* Total area label at top */}
      <rect x={svgW/2 - 90} y={4} width={180} height={28} rx={6}
        fill="var(--bg)" stroke="var(--border)" strokeWidth="1" />
      <text x={svgW/2} y={22} textAnchor="middle" fontSize="13" fontWeight="700"
        fill="var(--text)" fontFamily="var(--mono)">
        Total: {totalArea} {unit}
      </text>

      <text x={svgW/2} y={svgH - 6} textAnchor="middle" fontSize="11" fill="var(--text3)" fontStyle="italic">Not drawn to scale</text>
    </svg>
  );
}

//  Streak Dots
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

//  Main Player
export default function ExtraCredit03Player({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Classwork 3 EC (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("question"); // question | correct | wrong | done
  const [loading, setLoading] = useState(true);
  const [revealCorrect, setRevealCorrect] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { streak: st, completed } = prog.data;
        if (completed) { setPhase("done"); setLoading(false); return; }
        setStreak(st || 0);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading && phase === "question") newProblem();
  }, [loading]);

  const newProblem = () => {
    setProblem(genRegionProblem());
    setInput("");
    setRevealCorrect(false);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleSubmit = async () => {
    if (!problem || phase !== "question") return;
    const val = parseInt(input.trim(), 10);
    if (isNaN(val)) return;
    const correct = problem.regions[problem.hiddenIdx];
    if (val === correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setPhase("correct");
      const done = newStreak >= STREAK_NEEDED;
      await saveProgress(user.id, topicId, {
        started: true, completed: done, percentComplete: done ? 100 : Math.round((newStreak / STREAK_NEEDED) * 100),
        data: { streak: newStreak, completed: done },
      });
    } else {
      setStreak(0);
      setRevealCorrect(true);
      setPhase("wrong");
      await saveProgress(user.id, topicId, {
        started: true, completed: false, percentComplete: 0,
        data: { streak: 0, completed: false },
      });
    }
  };

  const handleNext = () => {
    if (streak >= STREAK_NEEDED) {
      setPhase("done");
    } else {
      setPhase("question");
      newProblem();
    }
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
          You've mastered finding missing region areas!
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>
           Back to Home
        </button>
      </div>
    </div>
  );

  const knownSum = problem ? problem.regions.reduce((s, r, i) => i === problem.hiddenIdx ? s : s + r, 0) : 0;
  const correctAnswer = problem ? problem.regions[problem.hiddenIdx] : 0;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 19, color: "var(--amber)", marginBottom: 2, fontWeight: 700 }}>Extra Credit</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>Missing Region Area</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        <p style={{ fontSize: 18, fontWeight: 600, color: "var(--text2)", marginBottom: 14, textAlign: "center" }}>
          The shape is divided into 4 regions. Three areas are labeled. Find the area of the highlighted region. Enter the number only.
        </p>

        <div style={{ marginBottom: 20 }}>
          {problem && <RegionSVG problem={problem} revealCorrect={revealCorrect} />}
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
              Not quite! Streak reset.
            </div>
            <div style={{ background: "rgba(59,130,246,0.07)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 18, color: "var(--text2)", lineHeight: 1.8, fontFamily: "var(--mono)" }}>
              {problem && <>
                Total: {problem.totalArea} {problem.unit}<br />
                Known regions: {knownSum} {problem.unit}<br />
                Missing: {problem.totalArea} - {knownSum} = <strong style={{ color: "var(--green)" }}>{correctAnswer} {problem.unit}</strong>
              </>}
            </div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }}
              onClick={() => { setPhase("question"); newProblem(); }}>
              Got it - try again
            </button>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              inputMode="numeric"
              placeholder="?"
              style={{ textAlign: "center", fontSize: 34, fontFamily: "var(--mono)", fontWeight: 700, padding: "12px", marginBottom: 12 }}
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
    </div>
  );
}
