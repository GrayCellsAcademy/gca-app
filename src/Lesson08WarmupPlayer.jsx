import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson08-warmup-v1";
const STREAK_NEEDED = 2;

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(arr) { const a = [...arr]; for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

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

function KaTeXExpr({ expr }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.katex) {
      try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: true }); }
      catch {}
    }
  });
  return <span ref={ref} />;
}

function zeroDivLatex(fmt, n) {
  if (fmt === 0) return `\\dfrac{${n}}{0}`;
  if (fmt === 1) return `${n} \\div 0`;
  if (fmt === 2) return `\\dfrac{0}{${n}}`;
  return `0 \\div ${n}`;
}

//  Activity 1: Division with Zero (same as Lesson05 Activity 1)
// Formats: 0=n/0, 1=n\u00f70, 2=0/n, 3=0\u00f7n
function genZeroDivPair() {
  let f1, f2;
  do { f1 = randInt(0,3); f2 = randInt(0,3); } while (f1 === f2);
  const n1 = randInt(1,9), n2 = randInt(1,9);
  const makeProb = (fmt, n) => ({ fmt, n, answer: fmt <= 1 ? "undefined" : "0" });
  return { type:"zero-div", p1: makeProb(f1,n1), p2: makeProb(f2,n2) };
}

function ZeroDivDisplay({ prob, selected, onSelect, showResult }) {
  const { fmt, n, answer } = prob;
  const isCorrect = selected === answer;
  const katexReady = useKaTeX();
  const borderColor = showResult ? (isCorrect?"var(--green)":"var(--red)") : selected?"var(--blue)":"var(--border)";
  return (
    <div style={{ flex:1, minWidth:150, border:`2px solid ${borderColor}`, borderRadius:"var(--radius)", padding:"16px 12px",
      background: showResult ? (isCorrect?"rgba(16,185,129,0.08)":"rgba(239,68,68,0.08)") : "var(--bg2)", textAlign:"center" }}>
      <div style={{ marginBottom:14, minHeight:60, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {katexReady
          ? <KaTeXExpr expr={zeroDivLatex(fmt, n)} />
          : <span style={{ fontSize:22, fontFamily:"var(--mono)" }}>...</span>}
      </div>
      <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
        {["0","undefined"].map(opt => (
          <button key={opt} onClick={() => !showResult && onSelect(opt)}
            style={{ padding:"8px 12px", borderRadius:"var(--radius-sm)",
              border:`2px solid ${selected===opt?"var(--blue)":"var(--border)"}`,
              background: selected===opt?"rgba(59,130,246,0.15)":"var(--surface)",
              color: selected===opt?"var(--blue)":"var(--text2)",
              fontFamily:"var(--mono)", fontSize:17, fontWeight:700,
              cursor:showResult?"default":"pointer", transition:"all 0.15s" }}>
            {opt}
          </button>
        ))}
      </div>
      {showResult && (
        <div style={{ marginTop:8, fontSize:17, fontWeight:700, color:isCorrect?"var(--green)":"var(--red)" }}>
          {isCorrect ? "Correct" : "Answer: " + answer}
        </div>
      )}
    </div>
  );
}

//  Activity 2: 8 Signed Arithmetic Forms at Once
// Forms: a+b, a+(-b), -a+b, -a+(-b), a-b, a-(-b), -a-b, -a-(-b)
function genSignedEight() {
  let a, b;
  do { a = randInt(1,9); b = randInt(1,9); } while (a >= b);
  const problems = shuffle([
    { display: `${a} + ${b}`,      answer: a+b },
    { display: `${a} + (-${b})`,   answer: a-b },
    { display: `-${a} + ${b}`,     answer: b-a },
    { display: `-${a} + (-${b})`,  answer: -(a+b) },
    { display: `${a} - ${b}`,      answer: a-b },
    { display: `${a} - (-${b})`,   answer: a+b },
    { display: `-${a} - ${b}`,     answer: -(a+b) },
    { display: `-${a} - (-${b})`,  answer: b-a },
  ]);
  return { type:"signed-eight", a, b, problems };
}

//  Streak Dots
function StreakDots({ current, needed }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
      <span style={{ fontSize:20, color:"var(--text3)" }}>Streak:</span>
      {Array.from({ length:needed }).map((_,i) => (
        <div key={i} style={{ width:13, height:13, borderRadius:"50%",
          background: i<current?"var(--green)":"var(--surface2)",
          border:`2px solid ${i<current?"var(--green)":"var(--border2)"}`,
          transition:"all 0.2s" }} />
      ))}
      <span style={{ fontSize:20, color:"var(--text3)" }}>{current}/{needed}</span>
    </div>
  );
}

//  8-problem grid component
function SignedEightGrid({ problems, onSubmit }) {
  const [answers, setAnswers] = useState(Array(8).fill(""));
  const refs = Array.from({ length:8 }, () => useRef(null));

  useEffect(() => {
    setAnswers(Array(8).fill(""));
    setTimeout(() => refs[0].current?.focus(), 80);
  }, [problems]);

  const setAnswer = (i, val) => setAnswers(prev => {
    const next = [...prev]; next[i] = val.replace(/[^0-9\-]/g,""); return next;
  });

  const handleKey = (e, i) => {
    if (e.key==="Enter") { if (i<7) refs[i+1].current?.focus(); else onSubmit(answers); }
  };

  const allFilled = answers.every(a => a.trim() !== "");

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {problems.map((p, i) => (
          <div key={i} style={{ background:"var(--bg2)", borderRadius:"var(--radius-sm)", padding:"10px 12px" }}>
            <div style={{ fontSize:18, fontWeight:700, fontFamily:"var(--mono)", color:"var(--text)", marginBottom:6, textAlign:"center" }}>
              {p.display} =
            </div>
            <input ref={refs[i]} value={answers[i]}
              onChange={e => setAnswer(i, e.target.value)}
              onKeyDown={e => handleKey(e, i)}
              inputMode="numeric" placeholder="?"
              style={{ textAlign:"center", fontSize:22, fontFamily:"var(--mono)", fontWeight:700,
                padding:"6px", width:"100%", borderRadius:"var(--radius-sm)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width:"100%", fontSize:20, padding:"14px" }}
        onMouseDown={e => { e.preventDefault(); onSubmit(answers); }}
        onTouchEnd={e => { e.preventDefault(); onSubmit(answers); }}
        disabled={!allFilled}>
        Submit All
      </button>
    </div>
  );
}

const TOPICS = [
  { id:"zero-div", label:"Division with Zero", subLabel:"Click the correct answer for each", gen: genZeroDivPair },
  { id:"signed-eight", label:"Signed Arithmetic", subLabel:"All 8 forms at once", gen: genSignedEight },
];

export default function Lesson08WarmupPlayer({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Warmup 8 (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [topicIdx, setTopicIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  const [sel1, setSel1] = useState(null);
  const [sel2, setSel2] = useState(null);
  const [showResult, setShowResult] = useState(false);
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
    setSel1(null); setSel2(null); setShowResult(false);
    setPhase("question"); pendingProgress.current = null;
  };

  const saveProgress_ = async (ti, st, done) => {
    await saveProgress(user.id, topicId, {
      started:true, completed:done,
      percentComplete: done?100:Math.round((ti/TOPICS.length)*100),
      data:{ topicIdx:ti, streak:st },
    });
  };

  const handleCorrect = async () => {
    const newStreak = streak + 1;
    setStreak(newStreak);
    setPhase("correct");
    if (newStreak >= STREAK_NEEDED) {
      const nextTi = topicIdx + 1;
      if (nextTi >= TOPICS.length) {
        pendingProgress.current = { action:"done" };
        await saveProgress_(nextTi, 0, true);
      } else {
        pendingProgress.current = { action:"next", ti:nextTi };
        await saveProgress_(nextTi, 0, false);
      }
    } else {
      pendingProgress.current = { action:"stay" };
      await saveProgress_(topicIdx, newStreak, false);
    }
  };

  const handleWrong = async () => {
    setStreak(0); setPhase("wrong");
    await saveProgress_(topicIdx, 0, false);
  };

  const handleZeroDivSubmit = async () => {
    if (!sel1 || !sel2) return;
    setShowResult(true);
    if (sel1===problem.p1.answer && sel2===problem.p2.answer) await handleCorrect();
    else await handleWrong();
  };

  const handleSignedEightSubmit = async (answers) => {
    const allCorrect = answers.every((v,i) => {
      const n = parseInt(v.trim(), 10);
      return !isNaN(n) && n === problem.problems[i].answer;
    });
    if (allCorrect) await handleCorrect();
    else await handleWrong();
  };

  const handleCorrectNext = () => {
    const p = pendingProgress.current;
    if (!p) return;
    if (p.action==="done") setPhase("celebration");
    else if (p.action==="next") { setTopicIdx(p.ti); setStreak(0); }
    else newProblem(topicIdx);
  };

  if (loading) return <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner"/></div>;

  if (phase==="celebration" || topicIdx>=TOPICS.length) return (
    <div style={{ maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize:64,marginBottom:16 }}></div>
        <h2 style={{ fontSize:28,fontWeight:800,marginBottom:8 }}>Warmup Complete!</h2>
        <p style={{ color:"var(--text2)",fontSize:19,marginBottom:24 }}>Ready for Classwork 8!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isZeroDiv = currentTopic.id==="zero-div";
  const isSigned = currentTopic.id==="signed-eight";

  return (
    <div style={{ maxWidth:640,margin:"0 auto",animation:"fadeUp 0.3s ease" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8 }}>
        <div>
          <div style={{ fontSize:19,color:"var(--text3)",marginBottom:2 }}>Activity {topicIdx+1} of {TOPICS.length} - {currentTopic.label}</div>
          <div style={{ fontSize:20,fontWeight:700,color:"var(--blue)" }}>{currentTopic.subLabel}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>
      <div style={{ marginBottom:16 }}>
        <div style={{ height:5,background:"var(--surface2)",borderRadius:99,overflow:"hidden" }}>
          <div style={{ height:"100%",width:`${(topicIdx/TOPICS.length)*100}%`,background:"linear-gradient(90deg,var(--blue),var(--cyan))",borderRadius:99 }} />
        </div>
      </div>

      <div className="card">
        <StreakDots current={streak} needed={STREAK_NEEDED} />

        {phase==="correct" ? (
          <div style={{ animation:"popIn 0.25s ease",textAlign:"center" }}>
            <div style={{ fontSize:28,marginBottom:8 }}></div>
            <div style={{ fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:6 }}>
              {isZeroDiv ? "Both correct!" : "All correct!"}
            </div>
            <div style={{ fontSize:19,color:"var(--text3)",marginBottom:20 }}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{ width:"100%",fontSize:20,padding:"13px" }} onClick={handleCorrectNext}>
               Next problem
            </button>
          </div>
        ) : phase==="wrong" ? (
          <div style={{ animation:"popIn 0.25s ease" }}>
            <div style={{ fontSize:19,fontWeight:700,color:"#fca5a5",marginBottom:12,textAlign:"center" }}>Not quite! Streak reset.</div>
            {isZeroDiv && problem && (
              <div style={{ display:"flex",gap:12,marginBottom:16,justifyContent:"center" }}>
                <ZeroDivDisplay prob={problem.p1} selected={sel1} onSelect={()=>{}} showResult={true} />
                <ZeroDivDisplay prob={problem.p2} selected={sel2} onSelect={()=>{}} showResult={true} />
              </div>
            )}
            {isSigned && problem && (
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12 }}>
                {problem.problems.map((p,i) => (
                  <div key={i} style={{ fontSize:17,fontFamily:"var(--mono)",fontWeight:700,
                    background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"6px 10px",textAlign:"center" }}>
                    {p.display} = <span style={{ color:"var(--green)" }}>{p.answer}</span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-success" style={{ width:"100%",fontSize:20,padding:"13px" }}
              onClick={() => newProblem(topicIdx)}>Got it - try again</button>
          </div>
        ) : problem && (
          <>
            {isZeroDiv && (
              <>
                <p style={{ fontSize:18,color:"var(--text2)",fontWeight:600,marginBottom:16,textAlign:"center" }}>
                  What does each expression equal?
                </p>
                <div style={{ display:"flex",gap:12,marginBottom:16,justifyContent:"center" }}>
                  <ZeroDivDisplay prob={problem.p1} selected={sel1} onSelect={setSel1} showResult={false} />
                  <ZeroDivDisplay prob={problem.p2} selected={sel2} onSelect={setSel2} showResult={false} />
                </div>
                <button className="btn btn-primary" style={{ width:"100%",fontSize:20,padding:"14px" }}
                  onClick={handleZeroDivSubmit} disabled={!sel1||!sel2}>
                  Submit Both
                </button>
              </>
            )}
            {isSigned && (
              <>
                <p style={{ textAlign:"center",fontSize:19,fontWeight:600,color:"var(--text2)",marginBottom:16 }}>
                  Evaluate all 8 expressions. (a={problem.a}, b={problem.b})
                </p>
                <SignedEightGrid problems={problem.problems} onSubmit={handleSignedEightSubmit} />
              </>
            )}
          </>
        )}
      </div>

      <div style={{ marginTop:16,display:"flex",gap:6 }}>
        {TOPICS.map((t,i) => {
          const done=i<topicIdx, active=i===topicIdx;
          return (
            <div key={t.id} style={{
              fontSize:20,fontWeight:700,padding:"4px 14px",borderRadius:99,
              background:done?"rgba(16,185,129,0.15)":active?"rgba(59,130,246,0.15)":"var(--surface)",
              color:done?"var(--green)":active?"var(--blue)":"var(--text3)",
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
