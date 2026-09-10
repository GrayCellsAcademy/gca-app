import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson05-ec-v1";
const STREAK_NEEDED = 3;

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fmt(n) { return n >= 0 ? "+" + n : String(n); }

//  Activity 1: Signed Number Word Problems
function genWordProblem() {
  const ctxIdx = randInt(0, 5);
  const bothNeg = Math.random() < 0.5;
  let v1 = randInt(100, 4999), v2 = randInt(100, 4999);
  v2 = bothNeg ? -v2 : -v2;
  v1 = bothNeg ? -v1 : (Math.random() < 0.5 ? v1 : -v1);
  if (Math.abs(v1) === Math.abs(v2)) v2 += 1;
  const higher = Math.max(v1, v2), lower = Math.min(v1, v2);
  const answer = higher - lower;

  const prompts = [
    `Mount Summit has an elevation of ${fmt(v1)} feet and Sunken Valley has an elevation of ${fmt(v2)} feet. How much higher is the higher location than the lower one? Give your answer in feet.`,
    `${pick(["Alex","Jordan","Riley"])} has a bank balance of $${v1} and ${pick(["Morgan","Casey","Taylor"])} has a balance of $${v2}. (Negative means in debt.) What is the positive difference between the two balances? Give your answer in dollars.`,
    `Location A has a temperature of ${fmt(v1)} degrees and Location B is ${fmt(v2)} degrees. How many degrees warmer is the warmer location? Give your answer in degrees.`,
    `Particle A has an electric charge of ${fmt(v1)} units and Particle B has a charge of ${fmt(v2)} units. What is the positive difference between the two charges? Give your answer in units.`,
    `Object A is at ${fmt(v1)} meters relative to sea level and Object B is at ${fmt(v2)} meters. How much higher is the higher object? Give your answer in meters.`,
    `Team A has a net yardage of ${fmt(v1)} yards and Team B has ${fmt(v2)} yards. (Negative means net loss.) By how many yards is the leading team ahead? Give your answer in yards.`,
  ];

  return { type: "word-problem", prompt: prompts[ctxIdx], answer, v1, v2 };
}

//  Activity 2: Fill in the Blank
function genFillBlank() {
  let a, b, c, type, answer;
  for (let attempt = 0; attempt < 1000; attempt++) {
    type = randInt(0, 3);
    a = randInt(-20, 20); b = randInt(-20, 20);
    if (a === 0 || b === 0) continue;
    if (type === 0) { c = a + b; answer = a; }
    else if (type === 1) { c = a + b; answer = b; }
    else if (type === 2) { c = a - b; answer = a; }
    else { c = a - b; answer = b; }
    if (c === 0 || answer === 0) continue;
    if (b > 0 && c > 0 && answer > 0) continue; // ensure at least one negative
    break;
  }
  return { type: "fill-blank", opType: type, a, b, c, answer };
}

function gradeAnswer(input, problem) {
  const val = parseInt(input.trim(), 10);
  if (isNaN(val)) return false;
  return val === problem.answer;
}

//  Fill Blank Display
function FillBlankDisplay({ problem }) {
  const { opType, a, b, c } = problem;
  const numStyle = { fontSize: 32, fontWeight: 800, fontFamily: "var(--mono)", padding: "4px 8px" };
  const opStyle = { fontSize: 28, fontWeight: 700, color: "var(--text3)", padding: "0 8px" };
  const blankStyle = { fontSize: 32, fontWeight: 800, fontFamily: "var(--mono)",
    padding: "4px 16px", background: "rgba(59,130,246,0.15)", borderRadius: "var(--radius-sm)",
    border: "2px dashed var(--blue)", color: "var(--blue)", minWidth: 60, textAlign: "center" };
  const eqStyle = { fontSize: 28, fontWeight: 700, color: "var(--text3)", padding: "0 8px" };

  const renderNum = (n, isBlank = false) => (
    <span style={isBlank ? blankStyle : numStyle}>
      {isBlank ? "___" : (n >= 0 ? n : `(${n})`)}
    </span>
  );

  const op = opType <= 1 ? "+" : "-";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flexWrap: "wrap", marginBottom: 20 }}>
      {opType === 0 && <>{renderNum(null, true)}<span style={opStyle}>+</span>{renderNum(b)}</>}
      {opType === 1 && <>{renderNum(a)}<span style={opStyle}>+</span>{renderNum(null, true)}</>}
      {opType === 2 && <>{renderNum(null, true)}<span style={opStyle}>-</span>{renderNum(b)}</>}
      {opType === 3 && <>{renderNum(a)}<span style={opStyle}>-</span>{renderNum(null, true)}</>}
      <span style={eqStyle}>=</span>
      {renderNum(c)}
    </div>
  );
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

const ACTIVITIES = [
  {
    id: "word-problems",
    label: "Signed Number Word Problems",
    description: "Find the difference between two signed quantities",
    gen: genWordProblem,
    explanation: (p) => `The higher value is ${p.v1 > p.v2 ? p.v1 : p.v2} and the lower is ${p.v1 < p.v2 ? p.v1 : p.v2}. Difference = ${Math.max(p.v1,p.v2)} - (${Math.min(p.v1,p.v2)}) = ${p.answer}.`,
  },
  {
    id: "fill-blank",
    label: "Fill in the Blank",
    description: "Find the missing number in the signed number equation",
    gen: genFillBlank,
    explanation: (p) => {
      const exprs = [
        `___ + (${p.b}) = ${p.c}  \u2192  ___ = ${p.c} - (${p.b}) = ${p.answer}`,
        `(${p.a}) + ___ = ${p.c}  \u2192  ___ = ${p.c} - (${p.a}) = ${p.answer}`,
        `___ - (${p.b}) = ${p.c}  \u2192  ___ = ${p.c} + (${p.b}) = ${p.answer}`,
        `(${p.a}) - ___ = ${p.c}  \u2192  ___ = (${p.a}) - (${p.c}) = ${p.answer}`,
      ];
      return exprs[p.opType];
    },
  },
];

export default function ExtraCredit05Player({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Classwork 5 EC (019)");
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
    if (!loading && actIdx < ACTIVITIES.length) newProblem();
  }, [actIdx, loading]);

  const newProblem = () => {
    setProblem(currentActivity.gen());
    setInput(""); setPhase("question"); pendingNext.current = null;
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleSubmit = async () => {
    if (!problem || phase !== "question" || !input.trim()) return;
    const correct = gradeAnswer(input, problem);
    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setPhase("correct");
      const final = newStreak >= STREAK_NEEDED;
      const nextAi = final ? actIdx + 1 : actIdx;
      const done = nextAi >= ACTIVITIES.length && final;
      pendingNext.current = { final, nextAi, done };
      await saveProgress(user.id, topicId, {
        started: true, completed: done,
        percentComplete: done ? 100 : Math.round((actIdx / ACTIVITIES.length) * 100),
        data: { actIdx: nextAi, streak: final ? 0 : newStreak, completed: done },
      });
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
    if (!p) return;
    if (p.done) setPhase("done");
    else if (p.final) { setActIdx(p.nextAi); setStreak(0); }
    else newProblem();
  };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;

  if (phase === "done") return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", animation: "fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize: 64, marginBottom: 16 }}></div>
        <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Extra Credit Complete!</h2>
        <p style={{ color: "var(--text2)", fontSize: 19, marginBottom: 24 }}>You mastered signed number word problems and fill-in-the-blank!</p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", animation: "fadeUp 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 19, color: "var(--amber)", marginBottom: 2, fontWeight: 700 }}>
            Extra Credit - Activity {actIdx + 1} of {ACTIVITIES.length}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{currentActivity?.label}</div>
          <div style={{ fontSize: 17, color: "var(--text3)" }}>{currentActivity?.description}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 5, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(actIdx / ACTIVITIES.length) * 100}%`, background: "linear-gradient(90deg,var(--amber),#f97316)", borderRadius: 99 }} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        {phase === "correct" && (
          <div style={{ animation: "popIn 0.25s ease", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}></div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", marginBottom: 6 }}>
              {pendingNext.current?.final ? "Activity complete!" : "Correct!"}
            </div>
            <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 20 }}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }} onClick={handleNext}>
               {pendingNext.current?.final ? "Next activity" : "Next problem"}
            </button>
          </div>
        )}

        {phase === "wrong" && problem && (
          <div style={{ animation: "popIn 0.25s ease" }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#fca5a5", marginBottom: 12, textAlign: "center" }}>Not quite! Streak reset.</div>
            {problem.type === "fill-blank" && <FillBlankDisplay problem={problem} />}
            <div style={{ background: "rgba(59,130,246,0.07)", borderRadius: 8, padding: "12px 16px", marginBottom: 12, fontSize: 18, color: "var(--text2)", lineHeight: 1.7, fontFamily: "var(--mono)" }}>
              {currentActivity.explanation(problem)}
            </div>
            <div style={{ textAlign: "center", fontSize: 19, marginBottom: 16 }}>
              Answer: <strong style={{ color: "var(--green)" }}>{problem.answer}</strong>
            </div>
            <button className="btn btn-success" style={{ width: "100%", fontSize: 20, padding: "13px" }} onClick={newProblem}>
              Got it - try again
            </button>
          </div>
        )}

        {phase === "question" && problem && (
          <>
            {problem.type === "word-problem" && (
              <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", padding: "16px 20px", marginBottom: 20, fontSize: 19, lineHeight: 1.8, color: "var(--text)" }}>
                {problem.prompt}
              </div>
            )}
            {problem.type === "fill-blank" && (
              <>
                <p style={{ textAlign: "center", fontSize: 19, fontWeight: 600, color: "var(--text2)", marginBottom: 16 }}>
                  Find the missing number.
                </p>
                <FillBlankDisplay problem={problem} />
              </>
            )}
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.replace(/[^0-9\-]/g, ""))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              inputMode="numeric"
              placeholder={problem.type === "word-problem" ? "Enter a positive number" : "e.g. -5 or 8"}
              style={{ textAlign: "center", fontSize: 32, fontFamily: "var(--mono)", fontWeight: 700, padding: "12px", marginBottom: 12 }}
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
          const done = i < actIdx, active = i === actIdx;
          return (
            <div key={a.id} style={{
              fontSize: 19, fontWeight: 700, padding: "4px 14px", borderRadius: 99,
              background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(245,158,11,0.15)" : "var(--surface)",
              color: done ? "var(--green)" : active ? "var(--amber)" : "var(--text3)",
              border: `1px solid ${done ? "rgba(16,185,129,0.3)" : active ? "rgba(245,158,11,0.3)" : "var(--border)"}`,
            }}>
              {done ? " " : active ? " " : ""}{a.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
