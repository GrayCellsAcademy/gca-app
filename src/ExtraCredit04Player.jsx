import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson04-ec-v1";
const STREAK_NEEDED = 3;

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

//  Activity 1: Insert Parentheses
function evalTokens(tokens, openSlot, closeSlot) {
  let expr = "";
  for (let i = 0; i <= tokens.length; i++) {
    if (i === openSlot) expr += "(";
    if (i === closeSlot) expr += ")";
    if (i < tokens.length) {
      const t = tokens[i];
      if (t.type === "num") expr += t.value;
      else if (t.op === "x") expr += "*";
      else if (t.op === "^") expr += "**";
      else expr += t.op;
    }
  }
  try { return Function("return " + expr)(); } catch { return null; }
}

function genInsertParens() {
  for (let attempt = 0; attempt < 500; attempt++) {
    const type = randInt(0, 2);
    let tokens, openSlot = 0, closeSlot = 3;
    if (type === 0) {
      const a = randInt(2, 3), b = randInt(2, 3), c = randInt(2, 3);
      tokens = [{type:"num",value:a},{type:"op",op:"x"},{type:"num",value:b},{type:"op",op:"^"},{type:"num",value:c}];
    } else if (type === 1) {
      const a = randInt(2, 5), b = randInt(2, 4), c = randInt(2, 3);
      tokens = [{type:"num",value:a},{type:"op",op:"+"},{type:"num",value:b},{type:"op",op:"^"},{type:"num",value:c}];
    } else {
      const a = randInt(2, 3), b = randInt(2, 3), c = randInt(2, 3), d = randInt(1, 20);
      tokens = [{type:"num",value:a},{type:"op",op:"x"},{type:"num",value:b},{type:"op",op:"^"},{type:"num",value:c},{type:"op",op:"-"},{type:"num",value:d}];
    }
    const standard = evalTokens(tokens, null, null);
    const target = evalTokens(tokens, openSlot, closeSlot);
    if (target === null || standard === null || target === standard) continue;
    if (target < 0 || target > 10000 || !Number.isInteger(target)) continue;
    return { type:"insert-parens", tokens, target, openSlot, closeSlot, standard };
  }
  const tokens = [{type:"num",value:2},{type:"op",op:"x"},{type:"num",value:3},{type:"op",op:"^"},{type:"num",value:2}];
  return { type:"insert-parens", tokens, target:36, openSlot:0, closeSlot:3, standard:18 };
}

function tokenDisplay(t) {
  if (t.type === "num") return String(t.value);
  if (t.op === "x") return <span style={{ fontSize:22 }}>&#215;</span>;
  if (t.op === "^") return <span style={{ fontSize:18, color:"var(--text3)" }}>^</span>;
  return t.op;
}

function ParenProblem({ problem, onSubmit }) {
  const [openSlot, setOpenSlot] = useState(null);
  const [closeSlot, setCloseSlot] = useState(null);
  const [evaluated, setEvaluated] = useState(null);

  const { tokens, target } = problem;
  const nSlots = tokens.length + 1;

  const handleSlotClick = (idx) => {
    if (openSlot === null) {
      setOpenSlot(idx);
      setCloseSlot(null);
      setEvaluated(null);
    } else if (closeSlot === null) {
      if (idx <= openSlot) {
        // Reset and start over
        setOpenSlot(idx);
        return;
      }
      setCloseSlot(idx);
      const val = evalTokens(tokens, openSlot, idx);
      setEvaluated(val);
    } else {
      // Reset
      setOpenSlot(idx);
      setCloseSlot(null);
      setEvaluated(null);
    }
  };

  const reset = () => { setOpenSlot(null); setCloseSlot(null); setEvaluated(null); };

  const canSubmit = openSlot !== null && closeSlot !== null;

  const slotStyle = (idx) => {
    const isOpen = idx === openSlot;
    const isClose = idx === closeSlot;
    const inRange = openSlot !== null && closeSlot !== null && idx > openSlot && idx < closeSlot;
    return {
      width: 18, height: 18, borderRadius: "50%", cursor: "pointer",
      background: isOpen || isClose ? "var(--blue)" : inRange ? "rgba(59,130,246,0.2)" : "var(--surface2)",
      border: `2px solid ${isOpen || isClose ? "var(--blue)" : "var(--border)"}`,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: 10, color: "white", fontWeight: 800, flexShrink: 0,
      transition: "all 0.15s",
    };
  };

  return (
    <div>
      <p style={{ textAlign:"center", fontSize:19, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>
        Place one pair of parentheses to make this true:
      </p>
      <div style={{ textAlign:"center", fontSize:28, fontWeight:800, marginBottom:20, fontFamily:"var(--mono)", color:"var(--blue)" }}>
        [expression] = {target}
      </div>

      {/* Token display with clickable slots */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4, flexWrap:"wrap", marginBottom:20, background:"var(--bg2)", borderRadius:"var(--radius)", padding:"16px 24px" }}>
        {tokens.map((t, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
            {/* Slot before this token */}
            <div style={slotStyle(i)} onClick={() => handleSlotClick(i)} title={`Slot ${i}`}>
              {i === openSlot ? "(" : i === closeSlot ? ")" : ""}
            </div>
            {/* Token */}
            <span style={{
              fontSize: t.type === "num" ? 28 : 22,
              fontWeight: 700,
              color: (openSlot !== null && closeSlot !== null && i >= openSlot && i < closeSlot) ? "var(--blue)" : "var(--text)",
              fontFamily: "var(--mono)",
              background: (openSlot !== null && closeSlot !== null && i >= openSlot && i < closeSlot) ? "rgba(59,130,246,0.1)" : "transparent",
              borderRadius: 4, padding: "0 2px",
            }}>
              {t.type === "num" ? t.value : t.op === "x" ? "\u00d7" : t.op === "^" ? <sup style={{ fontSize:16 }}>{tokens[i+1]?.value}</sup> : t.op}
            </span>
          </div>
        ))}
        {/* Final slot */}
        <div style={slotStyle(tokens.length)} onClick={() => handleSlotClick(tokens.length)} title={`Slot ${tokens.length}`}>
          {tokens.length === openSlot ? "(" : tokens.length === closeSlot ? ")" : ""}
        </div>
      </div>

      {/* Preview of current expression */}
      {openSlot !== null && (
        <div style={{ textAlign:"center", fontSize:22, fontFamily:"var(--mono)", marginBottom:12, color:"var(--text2)" }}>
          {tokens.map((t, i) => (
            <span key={i}>
              {i === openSlot ? <span style={{ color:"var(--blue)", fontWeight:800 }}>(</span> : null}
              {i === closeSlot ? <span style={{ color:"var(--blue)", fontWeight:800 }}>)</span> : null}
              <span style={{ color: (openSlot !== null && closeSlot !== null && i >= openSlot && i < closeSlot) ? "var(--blue)" : "var(--text)" }}>
                {t.type === "num" ? t.value : t.op === "x" ? "\u00d7" : t.op === "^" ? "^" : t.op}
              </span>
            </span>
          ))}
          {tokens.length === closeSlot ? <span style={{ color:"var(--blue)", fontWeight:800 }}>)</span> : null}
          {evaluated !== null && <span style={{ color:"var(--text3)", marginLeft:8 }}>= {evaluated}</span>}
        </div>
      )}

      <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
        <button className="btn btn-ghost btn-sm" onClick={reset} disabled={openSlot === null}>Reset</button>
        <button className="btn btn-primary" onClick={() => onSubmit(evaluated)} disabled={!canSubmit} style={{ fontSize:19 }}>Submit</button>
      </div>

      <p style={{ textAlign:"center", fontSize:17, color:"var(--text3)", marginTop:12 }}>
        Click a dot to place ( then click another dot to place )
      </p>
    </div>
  );
}

//  Activity 2: Root Comparison
function genRootCompare() {
  const n = randInt(2, 6);
  const m = n + randInt(1, 4);
  const N = randInt(10000, 999999);
  return { type:"root-compare", n, m, N, correctIdx: 0 };
}

function ordinal(n) {
  if (n === 2) return "square root";
  if (n === 3) return "cube root";
  return n + "th root";
}

function RootCompare({ problem, onSubmit }) {
  const { n, m, N } = problem;
  const opts = [
    { label: ordinal(n) + " of " + N.toLocaleString(), idx: 0 },
    { label: ordinal(m) + " of " + N.toLocaleString(), idx: 1 },
  ];
  return (
    <div>
      <p style={{ textAlign:"center", fontSize:19, fontWeight:600, color:"var(--text2)", marginBottom:20 }}>
        Which expression has the larger value? Click on it.
      </p>
      <div style={{ display:"flex", gap:16, justifyContent:"center", flexWrap:"wrap" }}>
        {opts.map(opt => (
          <button key={opt.idx} onClick={() => onSubmit(opt.idx)}
            style={{ padding:"24px 32px", borderRadius:"var(--radius)", border:"2px solid var(--border)",
              background:"var(--bg2)", cursor:"pointer", fontFamily:"var(--mono)", textAlign:"center",
              fontSize:22, fontWeight:700, color:"var(--text)", minWidth:180, transition:"all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.background = "rgba(59,130,246,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg2)"; }}>
            <div style={{ fontSize:32, marginBottom:8 }}>
              {opt.idx === 0 ? <sup>{n}</sup> : <sup>{m}</sup>}
              <span style={{ fontSize:36 }}>&radic;</span>
              <span style={{ fontSize:22 }}>{N.toLocaleString()}</span>
            </div>
            <div style={{ fontSize:17, color:"var(--text3)", fontWeight:400, fontFamily:"var(--font)" }}>
              {opt.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

//  Streak Dots
function StreakDots({ current, needed }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
      <span style={{ fontSize:20, color:"var(--text3)" }}>Streak:</span>
      {Array.from({ length:needed }).map((_,i) => (
        <div key={i} style={{ width:13, height:13, borderRadius:"50%",
          background: i < current ? "var(--green)" : "var(--surface2)",
          border: `2px solid ${i < current ? "var(--green)" : "var(--border2)"}`,
          transition:"all 0.2s" }} />
      ))}
      <span style={{ fontSize:20, color:"var(--text3)" }}>{current}/{needed}</span>
    </div>
  );
}

const ACTIVITIES = [
  {
    id: "insert-parens",
    label: "Insert Parentheses",
    description: "Place parentheses to make the equation true",
    gen: genInsertParens,
    grade: (answer, problem) => answer === problem.target,
    explanation: (problem) => {
      const { tokens, target, openSlot, closeSlot, standard } = problem;
      const tokenStr = tokens.map(t => t.type === "num" ? t.value : t.op === "x" ? "x" : t.op).join(" ");
      return `Without parentheses, ${tokenStr} = ${standard}. Placing parentheses around positions ${openSlot}-${closeSlot} gives ${target}.`;
    },
  },
  {
    id: "root-compare",
    label: "Root Comparison",
    description: "Click the expression with the larger value",
    gen: genRootCompare,
    grade: (answer, problem) => answer === problem.correctIdx,
    explanation: (problem) => `For any number greater than 1, a smaller root index gives a larger result. The ${ordinal(problem.n)} of ${problem.N.toLocaleString()} is larger than the ${ordinal(problem.m)}.`,
  },
];

export default function ExtraCredit04Player({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Classwork 4 EC (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [actIdx, setActIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  const [lastAnswer, setLastAnswer] = useState(null);

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
    setProblem(ACTIVITIES[actIdx].gen());
    setPhase("question");
    setLastAnswer(null);
  };

  const handleSubmit = async (answer) => {
    if (phase !== "question" || answer === null || answer === undefined) return;
    setLastAnswer(answer);
    const correct = currentActivity.grade(answer, problem);
    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setPhase("correct");
      const final = newStreak >= STREAK_NEEDED;
      const nextAi = final ? actIdx + 1 : actIdx;
      const done = nextAi >= ACTIVITIES.length && final;
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

  const handleNext = async () => {
    if (streak >= STREAK_NEEDED) {
      const nextAi = actIdx + 1;
      if (nextAi >= ACTIVITIES.length) { setPhase("done"); }
      else { setActIdx(nextAi); setStreak(0); }
    } else {
      newProblem();
    }
  };

  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:60 }}><div className="spinner" /></div>;

  if (phase === "done") return (
    <div style={{ maxWidth:520, margin:"0 auto", textAlign:"center", animation:"fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize:64, marginBottom:16 }}></div>
        <h2 style={{ fontSize:28, fontWeight:800, marginBottom:8 }}>Extra Credit Complete!</h2>
        <p style={{ color:"var(--text2)", fontSize:19, marginBottom:24 }}>
          You mastered parentheses and root comparisons!
        </p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth:680, margin:"0 auto", animation:"fadeUp 0.3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:19, color:"var(--amber)", marginBottom:2, fontWeight:700 }}>
            Extra Credit - Activity {actIdx + 1} of {ACTIVITIES.length}
          </div>
          <div style={{ fontSize:20, fontWeight:700 }}>{currentActivity?.label}</div>
          <div style={{ fontSize:17, color:"var(--text3)" }}>{currentActivity?.description}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      <div style={{ marginBottom:16 }}>
        <div style={{ height:5, background:"var(--surface2)", borderRadius:99, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${(actIdx/ACTIVITIES.length)*100}%`, background:"linear-gradient(90deg,var(--amber),#f97316)", borderRadius:99 }} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        {phase === "question" && problem && (
          currentActivity.id === "insert-parens"
            ? <ParenProblem problem={problem} onSubmit={handleSubmit} />
            : <RootCompare problem={problem} onSubmit={handleSubmit} />
        )}

        {phase === "correct" && (
          <div style={{ animation:"popIn 0.25s ease", textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:8 }}></div>
            <div style={{ fontSize:22, fontWeight:800, color:"var(--green)", marginBottom:6 }}>
              {streak >= STREAK_NEEDED ? "Activity complete!" : "Correct!"}
            </div>
            <div style={{ fontSize:19, color:"var(--text3)", marginBottom:20 }}>
              Streak: {streak}/{STREAK_NEEDED}
            </div>
            <button className="btn btn-success" style={{ width:"100%", fontSize:20, padding:"13px" }} onClick={handleNext}>
               {streak >= STREAK_NEEDED ? "Next activity" : "Next problem"}
            </button>
          </div>
        )}

        {phase === "wrong" && problem && (
          <div style={{ animation:"popIn 0.25s ease" }}>
            <div style={{ fontSize:19, fontWeight:700, color:"#fca5a5", marginBottom:12, textAlign:"center" }}>
              Not quite! Streak reset.
            </div>
            <div style={{ background:"rgba(59,130,246,0.07)", borderRadius:8, padding:"12px 16px", marginBottom:16, fontSize:18, color:"var(--text2)", lineHeight:1.7 }}>
              {currentActivity.explanation(problem)}
            </div>
            <button className="btn btn-success" style={{ width:"100%", fontSize:20, padding:"13px" }} onClick={newProblem}>
              Got it - try again
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop:16, display:"flex", gap:8 }}>
        {ACTIVITIES.map((a, i) => {
          const done = i < actIdx, active = i === actIdx;
          return (
            <div key={a.id} style={{
              fontSize:19, fontWeight:700, padding:"4px 14px", borderRadius:99,
              background: done?"rgba(16,185,129,0.15)":active?"rgba(245,158,11,0.15)":"var(--surface)",
              color: done?"var(--green)":active?"var(--amber)":"var(--text3)",
              border:`1px solid ${done?"rgba(16,185,129,0.3)":active?"rgba(245,158,11,0.3)":"var(--border)"}`,
            }}>
              {done?" ":active?" ":""}{a.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
