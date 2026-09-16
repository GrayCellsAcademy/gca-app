import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson07-ec-v1";
const STREAK_NEEDED = 3;

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

//  KaTeX
function useKaTeX() {
  const [ready, setReady] = useState(!!window.katex);
  useEffect(() => {
    if (window.katex) { setReady(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);
  return ready;
}

function KaTeXExpr({ expr, displayMode }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.katex) {
      try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: !!displayMode }); }
      catch {}
    }
  });
  return <span ref={ref} />;
}

//  Activity 1: Order of Operations with Zero Division
function genOoOZero() {
  const template = randInt(0, 3);
  const exp = pick([2, 3]);
  let latex, answer;

  if (template === 0) {
    const a = randInt(2,9), b = randInt(1,9), c = randInt(1,9), d = randInt(2,9);
    latex = `${a}^{${exp}} + ${b} - ${c} \\div (${d} - ${d})`;
    answer = "undefined";
  } else if (template === 1) {
    const a = randInt(1,9), b = randInt(1,9), c = randInt(2,9), d = randInt(2,9);
    latex = `(${a} + ${b}) \\div (${c} - ${c}) + ${d}^{${exp}}`;
    answer = "undefined";
  } else if (template === 2) {
    const a = randInt(2,9), b = randInt(1,9), c = randInt(2,9);
    latex = `(${a} - ${a}) \\div ${b} + ${c}^{${exp}}`;
    answer = String(Math.pow(c, exp));
  } else {
    const a = randInt(2,9), b = randInt(2,9), c = randInt(1,9);
    latex = `${a}^{${exp}} + (${b} - ${b}) \\div ${c}`;
    answer = String(Math.pow(a, exp));
  }
  return { type:'ooo-zero', latex, answer };
}

//  Activity 2: Integer Roots of 4-digit Numbers
const SQ_ROOTS = Array.from({length: 68}, (_, i) => { const k = i + 32; return { n: k*k, k, deg: 2 }; });
const CB_ROOTS = Array.from({length: 12}, (_, i) => { const k = i + 10; return { n: k*k*k, k, deg: 3 }; });
const ALL_ROOTS = [...SQ_ROOTS, ...CB_ROOTS];

function genRootProblem() {
  const { n, k, deg } = pick(ALL_ROOTS);
  const latex = deg === 2 ? `\\sqrt{${n}}` : `\\sqrt[3]{${n}}`;
  return { type:'root', n, k, deg, latex, answer: String(k) };
}

function gradeAnswer(input, problem) {
  const norm = s => s.trim().toLowerCase();
  return norm(input) === norm(problem.answer);
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

//  Problem Display
function ProblemDisplay({ problem }) {
  const katexReady = useKaTeX();
  return (
    <div style={{ background:"var(--bg2)", borderRadius:"var(--radius)", padding:"20px 24px",
      textAlign:"center", minHeight:80, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
      {katexReady
        ? <span style={{ fontSize:36 }}><KaTeXExpr expr={problem.latex + " = \\, ?"} displayMode={true} /></span>
        : <span style={{ fontSize:22, fontFamily:"var(--mono)", color:"var(--text3)" }}>Loading...</span>}
    </div>
  );
}

const ACTIVITIES = [
  { id:"ooo-zero", label:"Order of Operations: Zero & Undefined",
    description:'Evaluate -- answer is an integer or "undefined"',
    gen: genOoOZero,
    hint: (p) => p.answer === "undefined"
      ? 'Division by zero is always undefined.'
      : `The zero expression = 0, so 0 \u00f7 n = 0 or n \u00f7 [result not affected by zero].`,
  },
  { id:"root", label:"Integer Roots of 4-Digit Numbers",
    description:"Find the exact integer square or cube root",
    gen: genRootProblem,
    hint: (p) => p.deg === 2
      ? `${p.answer}\u00b2 = ${p.n}. Look for a number between 30 and 99 whose square is ${p.n}.`
      : `${p.answer}\u00b3 = ${p.n}. Look for a number between 10 and 21 whose cube is ${p.n}.`,
  },
];

export default function ExtraCredit07Player({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Classwork 7 EC (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [actIdx, setActIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  const [wrongAns, setWrongAns] = useState(null);
  const inputRef = useRef(null);
  const pendingNext = useRef(null);

  const currentActivity = ACTIVITIES[actIdx];

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { actIdx:ai, streak:st, completed } = prog.data;
        if (completed) { setPhase("done"); setLoading(false); return; }
        setActIdx(Math.min(ai||0, ACTIVITIES.length-1));
        setStreak(st||0);
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
    setInput(""); setPhase("question"); setWrongAns(null); pendingNext.current = null;
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleSubmit = async () => {
    if (!problem || phase !== "question" || !input.trim()) return;
    if (gradeAnswer(input, problem)) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setPhase("correct");
      const final = newStreak >= STREAK_NEEDED;
      const nextAi = final ? actIdx + 1 : actIdx;
      const done = nextAi >= ACTIVITIES.length && final;
      pendingNext.current = { final, nextAi, done };
      await saveProgress(user.id, topicId, {
        started:true, completed:done,
        percentComplete: done ? 100 : Math.round((nextAi/ACTIVITIES.length)*100),
        data: { actIdx:nextAi, streak:final?0:newStreak, completed:done },
      });
    } else {
      setStreak(0); setWrongAns(input); setPhase("wrong");
      await saveProgress(user.id, topicId, {
        started:true, completed:false,
        percentComplete: Math.round((actIdx/ACTIVITIES.length)*100),
        data: { actIdx, streak:0, completed:false },
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

  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:60 }}><div className="spinner" /></div>;

  if (phase === "done") return (
    <div style={{ maxWidth:520, margin:"0 auto", textAlign:"center", animation:"fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize:64, marginBottom:16 }}></div>
        <h2 style={{ fontSize:28, fontWeight:800, marginBottom:8 }}>Extra Credit Complete!</h2>
        <p style={{ color:"var(--text2)", fontSize:19, marginBottom:24 }}>You mastered zero/undefined division and integer roots!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth:640, margin:"0 auto", animation:"fadeUp 0.3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:19, color:"var(--amber)", marginBottom:2, fontWeight:700 }}>
            Extra Credit - Activity {actIdx+1} of {ACTIVITIES.length}
          </div>
          <div style={{ fontSize:20, fontWeight:700 }}>{currentActivity?.label}</div>
          <div style={{ fontSize:17, color:"var(--text3)" }}>{currentActivity?.description}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>

      <div style={{ marginBottom:16 }}>
        <div style={{ height:5, background:"var(--surface2)", borderRadius:99, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${(actIdx/ACTIVITIES.length)*100}%`,
            background:"linear-gradient(90deg,var(--amber),#f97316)", borderRadius:99 }} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        {phase === "correct" && (
          <div style={{ animation:"popIn 0.25s ease", textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:8 }}></div>
            <div style={{ fontSize:22, fontWeight:800, color:"var(--green)", marginBottom:6 }}>
              {pendingNext.current?.final ? "Activity complete!" : "Correct!"}
            </div>
            <div style={{ fontSize:19, color:"var(--text3)", marginBottom:20 }}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{ width:"100%", fontSize:20, padding:"13px" }} onClick={handleNext}>
               {pendingNext.current?.final ? "Next activity" : "Next problem"}
            </button>
          </div>
        )}

        {phase === "wrong" && problem && (
          <div style={{ animation:"popIn 0.25s ease" }}>
            <div style={{ fontSize:19, fontWeight:700, color:"#fca5a5", marginBottom:12, textAlign:"center" }}>Not quite! Streak reset.</div>
            <ProblemDisplay problem={problem} />
            <div style={{ textAlign:"center", marginBottom:8 }}>
              {wrongAns && <span style={{ fontSize:20, fontFamily:"var(--mono)", color:"var(--red)", textDecoration:"line-through", marginRight:16 }}>{wrongAns}</span>}
              <span style={{ fontSize:22, fontFamily:"var(--mono)", fontWeight:800, color:"var(--green)" }}>{problem.answer}</span>
            </div>
            <div style={{ background:"rgba(59,130,246,0.07)", borderRadius:8, padding:"10px 14px", fontSize:18, color:"var(--text2)", marginBottom:16 }}>
              {currentActivity.hint(problem)}
            </div>
            <button className="btn btn-success" style={{ width:"100%", fontSize:20, padding:"13px" }} onClick={newProblem}>
              Got it - try again
            </button>
          </div>
        )}

        {phase === "question" && problem && (
          <>
            <ProblemDisplay problem={problem} />
            {currentActivity.id === "ooo-zero" && (
              <p style={{ textAlign:"center", fontSize:17, color:"var(--text3)", marginBottom:12 }}>
                Type an integer or "undefined"
              </p>
            )}
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder={currentActivity.id === "ooo-zero" ? "integer or undefined" : "integer answer"}
              style={{ textAlign:"center", fontSize:28, fontFamily:"var(--mono)", fontWeight:700, padding:"12px", marginBottom:12 }}
            />
            <button className="btn btn-primary" style={{ width:"100%", fontSize:20, padding:"14px" }}
              onMouseDown={e => { e.preventDefault(); handleSubmit(); }}
              onTouchEnd={e => { e.preventDefault(); handleSubmit(); }}
              disabled={!input.trim()}>
              Submit
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop:16, display:"flex", gap:8 }}>
        {ACTIVITIES.map((a,i) => {
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
