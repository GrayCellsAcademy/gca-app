import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson06-warmup-v1";
const STREAK_NEEDED = 2;

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

//  Activity 1: Signed Number Arithmetic
// Two base numbers a and b; expressions use +a/-a and +b/-b with + or - between them
function genSignedArith() {
  let a, b;
  do { a = randInt(2, 15); b = randInt(2, 15); } while (a === b);
  let sign1, sign2, op;
  do {
    sign1 = Math.random() < 0.5 ? 1 : -1;
    sign2 = Math.random() < 0.5 ? 1 : -1;
    op = Math.random() < 0.5 ? "+" : "-";
  } while (sign1 === 1 && sign2 === 1); // at least one negative

  const v1 = sign1 * a;
  const v2 = sign2 * b;
  const answer = op === "+" ? v1 + v2 : v1 - v2;

  // Build display string
  const s1 = v1 >= 0 ? String(v1) : "(" + v1 + ")";
  const s2 = v2 >= 0 ? String(v2) : "(" + v2 + ")";
  const display = s1 + " " + op + " " + s2;

  return { type: "signed-arith", v1, v2, op, answer, display };
}

//  Activity 2: Rewrite as Repeated Multiplication
function genRepeatedMult() {
  const base = randInt(2, 9);
  const exp = randInt(2, 6);
  const correctParts = Array(exp).fill(String(base));
  return { type: "repeated-mult", base, exp, correctParts };
}

function gradeRepeatedMult(input, problem) {
  const { base, exp } = problem;
  const cleaned = input.trim().replace(/\s+/g, "");
  const parts = cleaned.split(/[*x\u00d7\u00d7]/).map(p => p.trim());
  if (parts.length !== exp) return false;
  return parts.every(p => parseInt(p, 10) === base && p !== "");
}

//  Streak Dots
function StreakDots({ current, needed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 20, color: "var(--text3)" }}>Streak:</span>
      {Array.from({ length: needed }).map((_, i) => (
        <div key={i} style={{ width: 13, height: 13, borderRadius: "50%",
          background: i < current ? "var(--green)" : "var(--surface2)",
          border: `2px solid ${i < current ? "var(--green)" : "var(--border2)"}`,
          transition: "all 0.2s" }} />
      ))}
      <span style={{ fontSize: 20, color: "var(--text3)" }}>{current}/{needed}</span>
    </div>
  );
}

//  Repeated Mult Input Component
function RepeatedMultInput({ problem, onSubmit }) {
  const [val, setVal] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { setVal(""); setTimeout(() => inputRef.current?.focus(), 80); }, [problem]);

  const insertMult = () => {
    setVal(v => v + "\u00d7");
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter") { onSubmit(val); setVal(""); }
    if (e.key === "*" || e.key === "x") { e.preventDefault(); setVal(v => v + "\u00d7"); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <input
          ref={inputRef}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={handleKey}
          placeholder={"e.g. " + problem.base + "\u00d7" + problem.base + "..."}
          style={{ textAlign: "center", fontSize: 26, fontFamily: "var(--mono)", fontWeight: 700,
            padding: "10px 12px", flex: 1, maxWidth: 340 }}
        />
        <button onClick={insertMult}
          style={{ fontSize: 28, fontWeight: 800, padding: "10px 18px",
            borderRadius: "var(--radius-sm)", border: "2px solid var(--blue)",
            background: "rgba(59,130,246,0.1)", color: "var(--blue)", cursor: "pointer",
            fontFamily: "var(--mono)" }}>
          \u00d7
        </button>
      </div>
      <p style={{ textAlign: "center", fontSize: 17, color: "var(--text3)", marginBottom: 12 }}>
        Type {problem.base}, press \u00d7, type {problem.base}, repeat {problem.exp} times total
      </p>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20, padding: "14px" }}
        onMouseDown={e => { e.preventDefault(); onSubmit(val); setVal(""); }}
        onTouchEnd={e => { e.preventDefault(); onSubmit(val); setVal(""); }}
        disabled={!val.trim()}>
        Submit
      </button>
    </div>
  );
}

const TOPICS = [
  { id: "signed-arith", label: "Signed Number Arithmetic", subLabel: "Compute the result", gen: genSignedArith },
  { id: "repeated-mult", label: "Repeated Multiplication", subLabel: "Rewrite the power as multiplication", gen: genRepeatedMult },
];

export default function Lesson06WarmupPlayer({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Warmup 6 (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [topicIdx, setTopicIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  const pendingProgress = useRef(null);

  const currentTopic = TOPICS[topicIdx];

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { topicIdx: ti, streak: st } = prog.data;
        setTopicIdx(Math.min(ti || 0, TOPICS.length - 1));
        setStreak(st || 0);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading) newProblem(topicIdx);
  }, [topicIdx, loading]);

  const newProblem = (ti) => {
    setProblem(TOPICS[ti]?.gen());
    setInput(""); setPhase("question"); pendingProgress.current = null;
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const saveCurrentProgress = async (ti, st, done) => {
    await saveProgress(user.id, topicId, {
      started: true, completed: done,
      percentComplete: done ? 100 : Math.round((ti / TOPICS.length) * 100),
      data: { topicIdx: ti, streak: st },
    });
  };

  const gradeAnswer = (val) => {
    if (!problem) return false;
    if (problem.type === "signed-arith") {
      const n = parseInt(val.trim(), 10);
      return !isNaN(n) && n === problem.answer;
    }
    return gradeRepeatedMult(val, problem);
  };

  const handleSubmit = async (val) => {
    const v = val !== undefined ? val : input;
    if (!problem || phase !== "question" || !v.trim()) return;
    if (gradeAnswer(v)) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setPhase("correct");
      if (newStreak >= STREAK_NEEDED) {
        const nextTi = topicIdx + 1;
        if (nextTi >= TOPICS.length) {
          pendingProgress.current = { action: "done" };
          await saveCurrentProgress(nextTi, 0, true);
        } else {
          pendingProgress.current = { action: "next", ti: nextTi };
          await saveCurrentProgress(nextTi, 0, false);
        }
      } else {
        pendingProgress.current = { action: "stay" };
        await saveCurrentProgress(topicIdx, newStreak, false);
      }
    } else {
      setStreak(0); setPhase("wrong");
      await saveCurrentProgress(topicIdx, 0, false);
    }
  };

  const handleCorrectNext = () => {
    const p = pendingProgress.current;
    if (!p) return;
    if (p.action === "done") setPhase("celebration");
    else if (p.action === "next") { setTopicIdx(p.ti); setStreak(0); }
    else newProblem(topicIdx);
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  if (phase === "celebration" || topicIdx >= TOPICS.length) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", animation: "fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize: 64, marginBottom: 16 }}></div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Warmup Complete!</h2>
        <p style={{ color: "var(--text2)", fontSize: 19, marginBottom: 24 }}>Ready for Classwork 6!</p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isSignedArith = currentTopic.id === "signed-arith";
  const isRepeatedMult = currentTopic.id === "repeated-mult";

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 2 }}>
            Activity {topicIdx + 1} of {TOPICS.length} - {currentTopic.label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--blue)" }}>{currentTopic.subLabel}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 5, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(topicIdx / TOPICS.length) * 100}%`,
            background: "linear-gradient(90deg,var(--blue),var(--cyan))", borderRadius: 99 }} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        {phase === "correct" ? (
          <div style={{ animation: "popIn 0.25s ease", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}></div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", marginBottom: 6 }}>Correct!</div>
            <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 20 }}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }} onClick={handleCorrectNext}>
               Next problem
            </button>
          </div>
        ) : phase === "wrong" ? (
          <div style={{ animation: "popIn 0.25s ease" }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#fca5a5", marginBottom: 8, textAlign: "center" }}>
              Not quite! Streak reset.
            </div>
            {isSignedArith && problem && (
              <div style={{ textAlign: "center", fontSize: 22, marginBottom: 12, fontFamily: "var(--mono)", fontWeight: 700 }}>
                {problem.display} = <span style={{ color: "var(--green)" }}>{problem.answer}</span>
              </div>
            )}
            {isRepeatedMult && problem && (
              <div style={{ textAlign: "center", fontSize: 22, marginBottom: 12, fontFamily: "var(--mono)", fontWeight: 700 }}>
                {problem.base}<sup>{problem.exp}</sup> = <span style={{ color: "var(--green)" }}>
                  {Array(problem.exp).fill(problem.base).join("\u00d7")}
                </span>
              </div>
            )}
            <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }}
              onClick={() => { setStreak(0); newProblem(topicIdx); }}>
              Got it - try again
            </button>
          </div>
        ) : problem && (
          <>
            {isSignedArith && (
              <>
                <div style={{ textAlign: "center", fontSize: 36, fontWeight: 800, fontFamily: "var(--mono)",
                  marginBottom: 20, background: "var(--bg2)", borderRadius: "var(--radius)", padding: "16px" }}>
                  {problem.display} = ?
                </div>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value.replace(/[^0-9\-]/g, ""))}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  inputMode="numeric"
                  placeholder="?"
                  style={{ textAlign: "center", fontSize: 34, fontFamily: "var(--mono)", fontWeight: 700,
                    padding: "12px", marginBottom: 12 }}
                />
                <button className="btn btn-primary" style={{ width: "100%", fontSize: 20, padding: "14px" }}
                  onMouseDown={e => { e.preventDefault(); handleSubmit(); }}
                  onTouchEnd={e => { e.preventDefault(); handleSubmit(); }}
                  disabled={!input.trim()}>
                  Submit
                </button>
              </>
            )}
            {isRepeatedMult && (
              <>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <span style={{ fontSize: 48, fontWeight: 900, fontFamily: "var(--mono)", color: "var(--blue)" }}>
                    {problem.base}<sup style={{ fontSize: 28 }}>{problem.exp}</sup>
                  </span>
                </div>
                <p style={{ textAlign: "center", fontSize: 19, fontWeight: 600, color: "var(--text2)", marginBottom: 16 }}>
                  Rewrite this as repeated multiplication.
                </p>
                <RepeatedMultInput problem={problem} onSubmit={handleSubmit} />
              </>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 6 }}>
        {TOPICS.map((t, i) => {
          const done = i < topicIdx, active = i === topicIdx;
          return (
            <div key={t.id} style={{
              fontSize: 20, fontWeight: 700, padding: "4px 14px", borderRadius: 99,
              background: done?"rgba(16,185,129,0.15)":active?"rgba(59,130,246,0.15)":"var(--surface)",
              color: done?"var(--green)":active?"var(--blue)":"var(--text3)",
              border:`1px solid ${done?"rgba(16,185,129,0.3)":active?"rgba(59,130,246,0.3)":"var(--border)"}`,
            }}>
              {done?" ":active?" ":""}{t.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
