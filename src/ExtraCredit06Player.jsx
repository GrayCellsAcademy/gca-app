import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson06-ec-v1";

function parseVarExpr(input) {
  // Parse expressions like "6x^-3y^4", "-x^2y^-1", "3x^5y^2", "10x-9y-7"
  const s = input.trim().replace(/\s+/g, "").toLowerCase();
  if (!s) return null;
  // Match coefficient
  const re = /^([+-]?\d*)(x\^?([+-]?\d+)?)(y\^?([+-]?\d+)?)$|^([+-]?\d+)(x\^([+-]?\d+))(y\^([+-]?\d+))$/;
  // Simpler approach: extract coefficient, x exponent, y exponent separately
  let A = null, N = null, M = null;
  // Coefficient: everything before first 'x'
  const xIdx = s.indexOf('x');
  if (xIdx === -1) return null;
  const yIdx = s.indexOf('y', xIdx);
  if (yIdx === -1) return null;
  const aStr = s.slice(0, xIdx);
  if (aStr === '' || aStr === '+') A = 1;
  else if (aStr === '-') A = -1;
  else { A = parseInt(aStr, 10); if (isNaN(A)) return null; }
  // x exponent: between x and y
  const xExpStr = s.slice(xIdx + 1, yIdx).replace('^', '');
  if (xExpStr === '' || xExpStr === '+') N = 1;
  else if (xExpStr === '-') N = -1;
  else { N = parseInt(xExpStr, 10); if (isNaN(N)) return null; }
  // y exponent: after y
  const yExpStr = s.slice(yIdx + 1).replace('^', '');
  if (yExpStr === '' || yExpStr === '+') M = 1;
  else if (yExpStr === '-') M = -1;
  else { M = parseInt(yExpStr, 10); if (isNaN(M)) return null; }
  return { A, N, M };
}

function parseLinearExpr(input, v) {
  const s = input.trim().replace(/\s+/g, "").toLowerCase();
  if (!s) return null;
  const terms = s.match(/[+-]?[^+-]+/g) || [];
  let coeff = 0, constant = 0, foundVar = false, foundConst = false;
  for (const term of terms) {
    if (term.includes(v.toLowerCase())) {
      foundVar = true;
      const cleaned = term.replace(v.toLowerCase(), "");
      if (cleaned === "" || cleaned === "+") coeff = 1;
      else if (cleaned === "-") coeff = -1;
      else { coeff = parseInt(cleaned, 10); if (isNaN(coeff)) return null; }
    } else {
      foundConst = true;
      constant = parseInt(term, 10);
      if (isNaN(constant)) return null;
    }
  }
  return { coeff, constant };
}
const STREAK_NEEDED = 3;

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randNZ(min, max) { let n; do { n = randInt(min, max); } while (n === 0); return n; }

const VARS = ['x','y','a','b','c','m','n','p','r','u','v','w'];

//  Display helpers
function mulCoef(n) {
  if (n === 1) return ''; if (n === -1) return '-'; return String(n);
}
function varTerm(coef, v, isFirst) {
  if (coef === 0) return '';
  const abs = Math.abs(coef);
  const sign = isFirst ? (coef < 0 ? '-' : '') : (coef > 0 ? '+' : '-');
  return sign + (abs === 1 ? '' : abs) + v;
}
function constTerm(n, isFirst) {
  if (n === 0) return '';
  return isFirst ? String(n) : (n > 0 ? '+' : '') + n;
}
function groupTerm(n, inner) {
  const abs = Math.abs(n);
  const sign = n > 0 ? '+' : '-';
  return sign + (abs === 1 ? '' : abs) + '(' + inner + ')';
}

//  Activity 1: Nested Distributive Property
function genNestedDist() {
  const v = VARS[randInt(0, VARS.length - 1)];
  const fmt = Math.random() < 0.5 ? 'A' : 'B';
  if (fmt === 'A') {
    const [a,b,c,d,e] = Array.from({length:5}, () => randNZ(-9,9));
    const coeff = a*b*c, constant = a*b*d + a*e;
    const inner = varTerm(c,v,true) + constTerm(d,false);
    const display = mulCoef(a) + '(' + mulCoef(b) + '(' + inner + ')' + constTerm(e,false) + ')';
    return { type:'nested-dist', fmt, v, display, coeff, constant };
  } else {
    const [a,b,c,d,e,g,h] = Array.from({length:7}, () => randNZ(-9,9));
    const coeff = a*b*c + a*e*g, constant = a*b*d + a*e*h;
    const inner1 = varTerm(c,v,true) + constTerm(d,false);
    const inner2 = varTerm(g,v,true) + constTerm(h,false);
    const display = mulCoef(a) + '(' + mulCoef(b) + '(' + inner1 + ')' + groupTerm(e, inner2) + ')';
    return { type:'nested-dist', fmt, v, display, coeff, constant };
  }
}

//  Activity 2: Multiply three ax^ny^m expressions
function genVarMult() {
  while (true) {
    const factors = Array.from({length:3}, () => ({
      a: randNZ(-5,5), n: randNZ(-9,9), m: randNZ(-9,9)
    }));
    const A = factors.reduce((s,f) => s*f.a, 1);
    const N = factors.reduce((s,f) => s+f.n, 0);
    const M = factors.reduce((s,f) => s+f.m, 0);
    if (N !== 0 && M !== 0) return { type:'var-mult', factors, A, N, M };
  }
}

//  JSX display for one factor ax^ny^m
function Factor({ a, n, m }) {
  const aStr = a === 1 ? '' : a === -1 ? '-' : String(a);
  return (
    <span style={{ fontFamily:"var(--mono)", fontWeight:800 }}>
      ({aStr}x{n !== 1 && <sup>{n}</sup>}y{m !== 1 && <sup>{m}</sup>})
    </span>
  );
}

//  Answer display for Ax^Ny^M
function AnswerDisplay({ A, N, M, color }) {
  const aStr = A === 1 ? '' : A === -1 ? '-' : String(A);
  return (
    <span style={{ fontFamily:"var(--mono)", fontWeight:800, color }}>
      {aStr}x{N !== 1 && <sup>{N}</sup>}y{M !== 1 && <sup>{M}</sup>}
    </span>
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
  { id:"nested-dist", label:"Nested Distributive Property",
    description:"Expand and simplify fully", gen: genNestedDist },
  { id:"var-mult", label:"Multiply Variable Expressions",
    description:"Simplify the product of three expressions", gen: genVarMult },
];

export default function ExtraCredit06Player({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Classwork 6 EC (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [actIdx, setActIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  const pendingNext = useRef(null);
  const [wrongAnswer, setWrongAnswer] = useState(null);

  // Activity 1 input
  const [exprInput, setExprInput] = useState("");
  // Activity 2 input
  const [varExprInput, setVarExprInput] = useState("");

  const coeffRef = useRef(null);
  const aRef = useRef(null);

  const currentActivity = ACTIVITIES[actIdx];

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const { actIdx:ai, streak:st, completed } = prog.data;
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
    setExprInput(""); setVarExprInput(""); setWrongAnswer(null);
    setPhase("question"); pendingNext.current = null;
    setTimeout(() => {
      coeffRef.current?.focus();
      aRef.current?.focus();
    }, 80);
  };

  const parseInput = (s) => parseInt(s.trim(), 10);

  const gradeAnswer = () => {
    if (!problem) return false;
    if (problem.type === "nested-dist") {
      const parsed = parseLinearExpr(exprInput, problem.v);
      if (!parsed) return false;
      return parsed.coeff === problem.coeff && parsed.constant === problem.constant;
    }
    const parsed = parseVarExpr(varExprInput);
    if (!parsed) return false;
    return parsed.A === problem.A && parsed.N === problem.N && parsed.M === problem.M;
  };

  const canSubmit = () => {
    if (!problem) return false;
    if (problem.type === "nested-dist") return exprInput.trim() !== "";
    return varExprInput.trim() !== "";
  };

  const handleSubmit = async () => {
    if (phase !== "question" || !canSubmit()) return;
    const correct = gradeAnswer();
    if (correct) {
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
      setStreak(0);
      setWrongAnswer({ expr: exprInput, varExpr: varExprInput });
      setPhase("wrong");
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
        <p style={{ color:"var(--text2)", fontSize:19, marginBottom:24 }}>You mastered nested distribution and variable expression multiplication!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const fieldStyle = { textAlign:"center", fontSize:26, fontFamily:"var(--mono)", fontWeight:700, padding:"10px", width:"100%" };
  const labelStyle = { fontSize:18, fontWeight:700, color:"var(--text2)", marginBottom:6, display:"block" };

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
            {problem.type === "nested-dist" && (
              <div style={{ textAlign:"center", marginBottom:12, fontFamily:"var(--mono)" }}>
                <div style={{ fontSize:20, marginBottom:6 }}>
                  {problem.display} = <span style={{ color:"var(--green)", fontWeight:800 }}>
                    {varTerm(problem.coeff, problem.v, true)}{constTerm(problem.constant, false)}
                  </span>
                </div>
                {wrongAnswer?.expr && (
                  <div style={{ fontSize:18, color:"var(--red)" }}>
                    Your answer: <span style={{ textDecoration:"line-through" }}>{wrongAnswer.expr}</span>
                  </div>
                )}
              </div>
            )}
            {problem.type === "var-mult" && (
              <div style={{ textAlign:"center", marginBottom:12 }}>
                <div style={{ fontSize:20, marginBottom:6 }}>
                  {problem.factors.map((f,i) => <Factor key={i} {...f} />)}
                  {" = "}<AnswerDisplay A={problem.A} N={problem.N} M={problem.M} color="var(--green)" />
                </div>
                {wrongAnswer?.varExpr && (
                  <div style={{ fontSize:18, color:"var(--red)", fontFamily:"var(--mono)" }}>
                    Your answer: <span style={{ textDecoration:"line-through" }}>{wrongAnswer.varExpr}</span>
                  </div>
                )}
              </div>
            )}
            <button className="btn btn-success" style={{ width:"100%", fontSize:20, padding:"13px" }} onClick={newProblem}>
              Got it - try again
            </button>
          </div>
        )}

        {phase === "question" && problem && (
          <>
            {problem.type === "nested-dist" && (
              <>
                <p style={{ textAlign:"center", fontSize:19, fontWeight:600, color:"var(--text2)", marginBottom:16 }}>
                  Simplify completely. Write the answer in the form <span style={{ fontFamily:"var(--mono)" }}>A{problem.v} + B</span>.
                </p>
                <div style={{ textAlign:"center", fontSize:30, fontWeight:800, fontFamily:"var(--mono)",
                  background:"var(--bg2)", borderRadius:"var(--radius)", padding:"16px", marginBottom:20 }}>
                  {problem.display}
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={labelStyle}>Simplified expression (e.g. 3{problem.v}-5)</label>
                  <input ref={coeffRef} value={exprInput}
                    onChange={e => setExprInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    placeholder={"e.g. 3" + problem.v + "+12"}
                    style={{ ...fieldStyle, maxWidth:"100%" }} />
                </div>
              </>
            )}

            {problem.type === "var-mult" && (
              <>
                <p style={{ textAlign:"center", fontSize:19, fontWeight:600, color:"var(--text2)", marginBottom:16 }}>
                  Simplify to the form Ax<sup>N</sup>y<sup>M</sup>.
                </p>
                <div style={{ textAlign:"center", fontSize:26, marginBottom:20, background:"var(--bg2)",
                  borderRadius:"var(--radius)", padding:"16px", lineHeight:1.8 }}>
                  {problem.factors.map((f,i) => <Factor key={i} {...f} />)}
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={labelStyle}>Simplified expression (e.g. 6x^-3y^4)</label>
                  <input ref={aRef} value={varExprInput}
                    onChange={e => setVarExprInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    placeholder="e.g. 6x^-3y^4"
                    style={{ ...fieldStyle, maxWidth:"100%" }} />
                </div>
              </>
            )}

            <button className="btn btn-primary" style={{ width:"100%", fontSize:20, padding:"14px" }}
              onMouseDown={e => { e.preventDefault(); handleSubmit(); }}
              onTouchEnd={e => { e.preventDefault(); handleSubmit(); }}
              disabled={!canSubmit()}>
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
