import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";
import { genRectilinearShape } from "./lesson02Questions";

export const TOPIC_ID = "lesson03-warmup-v1";
const STREAK_NEEDED = 2;

//  RectilinearSVG - copied from Lesson02Session for 5B activity display
function RectilinearSVG({ question, onSideClick, revealedAnswers }) {
  const { vertices, sides, unit, hideIndices, hideIdx, activeMissingIdx } = question;
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
  return (
    <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: 400, display: "block", margin: "0 auto" }}>
      <path d={pathD} stroke="var(--blue)" strokeWidth="2.5" fill="rgba(59,130,246,0.07)" />
      {sv.map((p, i) => {
        const next = sv[(i + 1) % n];
        const isHidden = hiddenSet.has(i);
        const isActiveMissing = activeMissingIdx === i;
        const m = mids[i];
        const ex = next.x - p.x, ey = next.y - p.y;
        const el = Math.sqrt(ex * ex + ey * ey) || 1;
        const perpX = -ey / el, perpY = ex / el;
        const outDir = (m.x - cx) * perpX + (m.y - cy) * perpY > 0 ? 1 : -1;
        const lx = m.x + perpX * outDir * 18;
        const ly = m.y + perpY * outDir * 18;
        return (
          <g key={i} style={{ cursor: isHidden ? "pointer" : "default" }}
            onClick={() => isHidden && onSideClick && onSideClick(i)}>
            <line x1={p.x} y1={p.y} x2={next.x} y2={next.y}
              stroke="var(--blue)" strokeWidth="2.5" />
            <g style={{ cursor: isHidden ? "pointer" : "default" }}>
              <rect x={lx - 38} y={ly - 14} width={76} height={28} rx={5}
                fill={isActiveMissing ? "rgba(59,130,246,0.3)" : isHidden ? "rgba(251,191,36,0.15)" : "var(--bg2)"}
                stroke={isActiveMissing ? "var(--blue)" : isHidden ? "var(--amber)" : "var(--border)"}
                strokeWidth={isActiveMissing ? 2 : 1} />
              <text x={lx} y={ly + 6} textAnchor="middle" fontSize="14" fontWeight="700"
                fill={isActiveMissing ? "var(--blue)" : (isHidden && !revealedAnswers) ? "#7c3aed" : isHidden ? "var(--green)" : "var(--text)"}
                fontFamily="var(--mono)">
                {isHidden && !revealedAnswers ? "?" : sides[i]?.length + unit}
              </text>
            </g>
          </g>
        );
      })}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text3)" fontStyle="italic">Not drawn to scale</text>
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
export default function Lesson03WarmupPlayer({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Warmup 3 (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState("question"); // question | correct | wrong | done
  const [activeMissingIdx, setActiveMissingIdx] = useState(null);
  const [enteredAnswers, setEnteredAnswers] = useState({});
  const [inputVal, setInputVal] = useState("");
  const [revealedAnswers, setRevealedAnswers] = useState(false);
  const [wrongSides, setWrongSides] = useState([]);
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
    const q = genRectilinearShape("5B");
    setProblem({ ...q, activeMissingIdx: null });
    setActiveMissingIdx(null);
    setEnteredAnswers({});
    setInputVal("");
    setRevealedAnswers(false);
    setWrongSides([]);
  };

  const handleSideClick = (sideIdx) => {
    if (phase !== "question") return;
    setActiveMissingIdx(sideIdx);
    setInputVal(enteredAnswers[sideIdx] !== undefined ? String(enteredAnswers[sideIdx]) : "");
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleInputConfirm = () => {
    if (activeMissingIdx === null || !inputVal.trim()) return;
    const num = parseInt(inputVal.replace(/\D/g, ""), 10);
    if (isNaN(num)) return;
    setEnteredAnswers(prev => ({ ...prev, [activeMissingIdx]: num }));
    // Move to next missing side if any unfilled
    const missing = problem.hideIndices || [problem.hideIdx];
    const nextUnfilled = missing.find(idx => idx !== activeMissingIdx && enteredAnswers[idx] === undefined);
    if (nextUnfilled !== undefined) {
      setActiveMissingIdx(nextUnfilled);
      setInputVal("");
    } else {
      setActiveMissingIdx(null);
      setInputVal("");
    }
  };

  const allFilled = () => {
    if (!problem) return false;
    const missing = problem.hideIndices || [problem.hideIdx];
    return missing.every(idx => enteredAnswers[idx] !== undefined);
  };

  const handleSubmit = async () => {
    if (!problem || !allFilled()) return;
    const missing = problem.missingAnswers;
    const wrong = [];
    let allCorrect = true;
    missing.forEach(ma => {
      if (enteredAnswers[ma.idx] !== ma.length) {
        wrong.push(ma.idx);
        allCorrect = false;
      }
    });

    if (allCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setPhase("correct");
      const done = newStreak >= STREAK_NEEDED;
      await saveProgress(user.id, topicId, {
        started: true, completed: done,
        percentComplete: done ? 100 : 50,
        data: { streak: newStreak, completed: done },
      });
    } else {
      setStreak(0);
      setWrongSides(wrong);
      setRevealedAnswers(true);
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

  const handleWrongContinue = () => {
    setPhase("question");
    newProblem();
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
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Warmup Complete!</h2>
        <p style={{ color: "var(--text2)", fontSize: 19, marginBottom: 24 }}>
          You've mastered finding missing sides - ready for Classwork 3!
        </p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>
           Back to Home
        </button>
      </div>
    </div>
  );

  const missing = problem?.hideIndices || (problem?.hideIdx !== undefined ? [problem.hideIdx] : []);
  const filled = missing.filter(idx => enteredAnswers[idx] !== undefined).length;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 2 }}>Warmup 3 - Missing Sides</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--blue)" }}>L/T/U shape - find the missing side lengths</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        <p style={{ fontSize: 18, color: "var(--text2)", fontWeight: 600, marginBottom: 12, textAlign: "center" }}>
          Click each missing side and enter its length.
        </p>

        <div style={{ marginBottom: 16 }}>
          {problem && (
            <RectilinearSVG
              question={{ ...problem, activeMissingIdx, activityType: "5B" }}
              onSideClick={handleSideClick}
              revealedAnswers={revealedAnswers}
            />
          )}
        </div>

        {/* Input for active missing side */}
        {phase === "question" && activeMissingIdx !== null && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12, animation: "fadeUp 0.2s ease" }}>
            <input
              ref={inputRef}
              value={inputVal}
              onChange={e => setInputVal(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && handleInputConfirm()}
              inputMode="numeric"
              placeholder="length?"
              style={{ textAlign: "center", fontSize: 26, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 120 }}
            />
            <button className="btn btn-primary" style={{ fontSize: 18, padding: "10px 20px" }}
              onMouseDown={e => { e.preventDefault(); handleInputConfirm(); }}
              disabled={!inputVal.trim()}>
              OK
            </button>
          </div>
        )}

        {/* Progress indicator */}
        {phase === "question" && (
          <div style={{ fontSize: 18, color: "var(--text3)", textAlign: "center", marginBottom: 12 }}>
            {filled}/{missing.length} sides entered
          </div>
        )}

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
            <div style={{ fontSize: 19, fontWeight: 700, color: "#fca5a5", marginBottom: 8, textAlign: "center" }}>
              Not quite! Streak reset.
            </div>
            <div style={{ fontSize: 18, color: "var(--text2)", textAlign: "center", marginBottom: 16 }}>
              Missing sides: {problem?.missingAnswers?.map(ma => (
                <span key={ma.idx} style={{ color: wrongSides.includes(ma.idx) ? "var(--red)" : "var(--green)", fontWeight: 700, marginLeft: 8 }}>
                  {ma.length}{problem.unit}
                </span>
              ))}
            </div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }}
              onClick={handleWrongContinue}>
              Got it - try again
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20, padding: "14px" }}
            onClick={handleSubmit} disabled={!allFilled()}>
            Submit
          </button>
        )}
      </div>
    </div>
  );
}
