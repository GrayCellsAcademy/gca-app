import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson07-warmup-v1";
const STREAK_NEEDED = 2;

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
const VARS = ['x','y','a','b','c','m','n','p','r','u','v','w'];

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

function oooToLatex(problem) {
  const { addOp, mulOp, degree, useRoot, base, factor, addend, form, swapMul } = problem;
  let expLatex;
  if (useRoot) {
    expLatex = degree === 2 ? '\\sqrt{' + base + '}' : '\\sqrt[3]{' + base + '}';
  } else {
    expLatex = base + '^{' + degree + '}';
  }
  const mulSym = mulOp === '\u00d7' ? '\\times' : '\\div';
  const mulGroup = swapMul ? expLatex + ' \\times ' + factor : factor + ' ' + mulSym + ' ' + expLatex;
  const addSym = addOp === '+' ? '+' : '-';
  return form === 0 ? addend + ' ' + addSym + ' ' + mulGroup : mulGroup + ' + ' + addend;
}

//  Activity 1: Order of Operations (3 types)
function genOoO() {
  for (let attempt = 0; attempt < 500; attempt++) {
    const addOp = pick(['+', '-']);
    const mulOp = pick(['\u00d7', '\u00f7']);
    const degree = pick([2, 3]);
    const useRoot = Math.random() < 0.5;

    let base, expVal;
    if (useRoot) {
      const r = randInt(1, 3);
      base = Math.pow(r, degree);
      expVal = r;
    } else {
      base = randInt(2, 12);
      expVal = Math.pow(base, degree);
      if (expVal > 1000) continue;
    }

    const factor = randInt(1, 7);
    let mulVal;
    if (mulOp === '\u00d7') { mulVal = factor * expVal; }
    else { if (expVal % factor !== 0) continue; mulVal = expVal / factor; }

    const addend = randInt(1, 12);
    const result = addOp === '+' ? addend + mulVal : addend - mulVal;
    if (result <= 0 || !Number.isInteger(result)) continue;

    // form: 0=addend first, 1=mulGroup first (only when +)
    // swapMul: whether to write E mulOp F instead of F mulOp E (only when x, commutative)
    const canSwap = mulOp === '\u00d7';
    const swapMul = canSwap && Math.random() < 0.5;
    const canFlip = addOp === '+';
    const form = canFlip ? randInt(0, 1) : 0;

    return { type:'ooo', addOp, mulOp, degree, useRoot, base, expVal, factor, mulVal, addend, result, form, swapMul };
  }
  return { type:'ooo', addOp:'+', mulOp:'\u00d7', degree:2, useRoot:false, base:3, expVal:9, factor:2, mulVal:18, addend:4, result:22, form:0, swapMul:false };
}

//  Activity 2: ax^m * bx^n
function genVarProduct() {
  const v = pick(VARS);
  const a = randInt(2, 7), b = randInt(2, 7);
  const m = randInt(1, 12), n = randInt(1, 12);
  return { type:'var-product', v, a, b, m, n, C: a*b, K: m+n };
}

//  Display helpers
function VarFactor({ coef, v, exp }) {
  return (
    <span style={{ fontFamily:"var(--mono)", fontWeight:800 }}>
      {coef}{v}{exp > 1 && <sup>{exp}</sup>}
    </span>
  );
}

function OoODisplay({ problem }) {
  const katexReady = useKaTeX();
  const latex = oooToLatex(problem) + ' = ?';
  return (
    <div style={{ background:"var(--bg2)", borderRadius:"var(--radius)", padding:"16px 24px",
      textAlign:"center", fontSize:28, minHeight:70, display:"flex", alignItems:"center", justifyContent:"center" }}>
      {katexReady
        ? <KaTeXExpr expr={latex} displayMode={true} />
        : <span style={{ fontFamily:"var(--mono)", fontWeight:700, color:"var(--text3)" }}>Loading...</span>}
    </div>
  );
}

//  Parsers
function parseSingleVarExpr(input, v) {
  const s = input.trim().replace(/\s+/g, "").toLowerCase();
  if (!s) return null;
  const vIdx = s.indexOf(v.toLowerCase());
  if (vIdx === -1) return null;
  const aStr = s.slice(0, vIdx);
  let A;
  if (aStr === '' || aStr === '+') A = 1;
  else if (aStr === '-') A = -1;
  else { A = parseInt(aStr, 10); if (isNaN(A)) return null; }
  const expStr = s.slice(vIdx + 1).replace('^', '');
  let N;
  if (expStr === '' || expStr === '+') N = 1;
  else if (expStr === '-') N = -1;
  else { N = parseInt(expStr, 10); if (isNaN(N)) return null; }
  return { A, N };
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

const TOPICS = [
  { id:"ooo", label:"Order of Operations", subLabel:"+/- with -/- and exponent/root", gen: genOoO },
  { id:"var-product", label:"Simplify Variable Expressions", subLabel:"axm x bxn (same variable, add exponents)", gen: genVarProduct },
];

export default function Lesson07WarmupPlayer({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Warmup 7 (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [topicIdx, setTopicIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  const [wrongAns, setWrongAns] = useState(null);
  const inputRef = useRef(null);
  const pendingProgress = useRef(null);

  const currentTopic = TOPICS[topicIdx];

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { topicIdx:ti, streak:st } = prog.data;
        setTopicIdx(Math.min(ti||0, TOPICS.length-1));
        setStreak(st||0);
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
    setInput(""); setPhase("question"); setWrongAns(null); pendingProgress.current = null;
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const saveCurrentProgress = async (ti, st, done) => {
    await saveProgress(user.id, topicId, {
      started:true, completed:done,
      percentComplete: done ? 100 : Math.round((ti/TOPICS.length)*100),
      data: { topicIdx:ti, streak:st },
    });
  };

  const gradeAnswer = (val) => {
    if (!problem) return false;
    if (problem.type === "ooo") {
      const n = parseInt(val.trim(), 10);
      return !isNaN(n) && n === problem.result;
    }
    const parsed = parseSingleVarExpr(val, problem.v);
    return parsed && parsed.A === problem.C && parsed.N === problem.K;
  };

  const handleSubmit = async () => {
    if (!problem || phase !== "question" || !input.trim()) return;
    if (gradeAnswer(input)) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setPhase("correct");
      if (newStreak >= STREAK_NEEDED) {
        const nextTi = topicIdx + 1;
        if (nextTi >= TOPICS.length) {
          pendingProgress.current = { action:"done" };
          await saveCurrentProgress(nextTi, 0, true);
        } else {
          pendingProgress.current = { action:"next", ti:nextTi };
          await saveCurrentProgress(nextTi, 0, false);
        }
      } else {
        pendingProgress.current = { action:"stay" };
        await saveCurrentProgress(topicIdx, newStreak, false);
      }
    } else {
      setStreak(0); setWrongAns(input); setPhase("wrong");
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

  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:60 }}><div className="spinner" /></div>;

  if (phase === "celebration" || topicIdx >= TOPICS.length) return (
    <div style={{ maxWidth:520, margin:"0 auto", textAlign:"center", animation:"fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize:64, marginBottom:16 }}></div>
        <h2 style={{ fontSize:28, fontWeight:800, marginBottom:8 }}>Warmup Complete!</h2>
        <p style={{ color:"var(--text2)", fontSize:19, marginBottom:24 }}>Ready for Classwork 7!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isOoO = currentTopic.id === "ooo";
  const isVar = currentTopic.id === "var-product";

  return (
    <div style={{ maxWidth:600, margin:"0 auto", animation:"fadeUp 0.3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:19, color:"var(--text3)", marginBottom:2 }}>Activity {topicIdx+1} of {TOPICS.length} - {currentTopic.label}</div>
          <div style={{ fontSize:20, fontWeight:700, color:"var(--blue)" }}>{currentTopic.subLabel}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>
      <div style={{ marginBottom:16 }}>
        <div style={{ height:5, background:"var(--surface2)", borderRadius:99, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${(topicIdx/TOPICS.length)*100}%`, background:"linear-gradient(90deg,var(--blue),var(--cyan))", borderRadius:99 }} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        {phase === "correct" ? (
          <div style={{ animation:"popIn 0.25s ease", textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:8 }}></div>
            <div style={{ fontSize:22, fontWeight:800, color:"var(--green)", marginBottom:6 }}>Correct!</div>
            <div style={{ fontSize:19, color:"var(--text3)", marginBottom:20 }}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{ width:"100%", fontSize:20, padding:"13px" }} onClick={handleCorrectNext}>
               Next problem
            </button>
          </div>
        ) : phase === "wrong" ? (
          <div style={{ animation:"popIn 0.25s ease" }}>
            <div style={{ fontSize:19, fontWeight:700, color:"#fca5a5", marginBottom:12, textAlign:"center" }}>Not quite! Streak reset.</div>
            {isOoO && problem && (
              <div style={{ marginBottom:12 }}>
                <OoODisplay problem={problem} />
                <div style={{ textAlign:"center", marginTop:10, fontSize:20, fontFamily:"var(--mono)", fontWeight:700 }}>
                  {wrongAns && <span style={{ color:"var(--red)", textDecoration:"line-through", marginRight:12 }}>{wrongAns}</span>}
                  <span style={{ color:"var(--green)" }}>{problem.result}</span>
                </div>
                <div style={{ textAlign:"center", fontSize:17, color:"var(--text3)", marginTop:6, lineHeight:1.8 }}>
                  Step 1 ({problem.useRoot ? "root" : "exponent"}): = {problem.expVal}
                  &nbsp;&middot;&nbsp; Step 2 ({problem.mulOp === '\u00d7' ? "multiply" : "divide"}): = {problem.mulVal}
                  &nbsp;&middot;&nbsp; Step 3 ({problem.addOp === '+' ? "add" : "subtract"}): = {problem.result}
                </div>
              </div>
            )}
            {isVar && problem && (
              <div style={{ textAlign:"center", marginBottom:12 }}>
                <div style={{ fontSize:24, fontWeight:800, fontFamily:"var(--mono)", marginBottom:8 }}>
                  <VarFactor coef={problem.a} v={problem.v} exp={problem.m} />
                  <span style={{ color:"var(--text3)", margin:"0 8px" }}>{'\u00d7'}</span>
                  <VarFactor coef={problem.b} v={problem.v} exp={problem.n} />
                  <span style={{ color:"var(--text3)", margin:"0 8px" }}>=</span>
                  {wrongAns && <span style={{ color:"var(--red)", textDecoration:"line-through", marginRight:10 }}>{wrongAns}</span>}
                  <span style={{ color:"var(--green)" }}>{problem.C}{problem.v}{problem.K > 1 && <sup>{problem.K}</sup>}</span>
                </div>
              </div>
            )}
            <button className="btn btn-success" style={{ width:"100%", fontSize:20, padding:"13px" }}
              onClick={() => newProblem(topicIdx)}>Got it - try again</button>
          </div>
        ) : problem && (
          <>
            {isOoO && (
              <>
                <p style={{ textAlign:"center", fontSize:19, fontWeight:600, color:"var(--text2)", marginBottom:16 }}>
                  Evaluate using order of operations.
                </p>
                <div style={{ marginBottom:20 }}>
                  <OoODisplay problem={problem} />
                </div>
              </>
            )}
            {isVar && (
              <>
                <p style={{ textAlign:"center", fontSize:19, fontWeight:600, color:"var(--text2)", marginBottom:16 }}>
                  Simplify. Write your answer like <span style={{ fontFamily:"var(--mono)" }}>12{problem.v}^5</span>.
                </p>
                <div style={{ textAlign:"center", fontSize:30, fontWeight:800, fontFamily:"var(--mono)",
                  background:"var(--bg2)", borderRadius:"var(--radius)", padding:"16px", marginBottom:20 }}>
                  <VarFactor coef={problem.a} v={problem.v} exp={problem.m} />
                  <span style={{ color:"var(--text3)", margin:"0 10px" }}>{'\u00d7'}</span>
                  <VarFactor coef={problem.b} v={problem.v} exp={problem.n} />
                </div>
              </>
            )}
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.replace(/[^0-9a-zA-Z+\-^]/g, ""))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              inputMode={isOoO ? "numeric" : "text"}
              placeholder={isOoO ? "?" : "e.g. 12" + (problem?.v||"x") + "^5"}
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

      <div style={{ marginTop:16, display:"flex", gap:6 }}>
        {TOPICS.map((t, i) => {
          const done = i < topicIdx, active = i === topicIdx;
          return (
            <div key={t.id} style={{
              fontSize:20, fontWeight:700, padding:"4px 14px", borderRadius:99,
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
