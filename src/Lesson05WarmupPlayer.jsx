import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson05-warmup-v1";
const STREAK_NEEDED = 2;

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

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
  return <div ref={ref} style={{ fontSize: 22, margin: "4px 0" }} />;
}

//  Activity 1: Zero Division
// Formats: 0=n/0 display, 1=n\u00f70 display, 2=0/n display, 3=0\u00f7n display
// Answer: formats 0,1 -> "undefined"; formats 2,3 -> "0"
function genZeroDivPair() {
  let f1, f2;
  do { f1 = randInt(0, 3); f2 = randInt(0, 3); } while (f1 === f2);
  const n1 = randInt(1, 9), n2 = randInt(1, 9);
  const makeProb = (fmt, n) => ({
    fmt,
    n,
    answer: fmt <= 1 ? "undefined" : "0",
  });
  return { type: "zero-div", p1: makeProb(f1, n1), p2: makeProb(f2, n2) };
}

function ZeroDivDisplay({ prob, selected, onSelect, showResult }) {
  const { fmt, n, answer } = prob;
  const isCorrect = selected === answer;

  const katexReady = useKaTeX();
  const katexExpr = () => {
    if (fmt === 0) return `\\dfrac{${n}}{0}`;
    if (fmt === 1) return `${n} \\div 0`;
    if (fmt === 2) return `\\dfrac{0}{${n}}`;
    return `0 \\div ${n}`;
  };

  const borderColor = showResult ? (isCorrect ? "var(--green)" : "var(--red)") : selected ? "var(--blue)" : "var(--border)";

  return (
    <div style={{ flex:1, minWidth:160, border:`2px solid ${borderColor}`, borderRadius:"var(--radius)", padding:"16px 12px", background: showResult ? (isCorrect ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)") : "var(--bg2)", textAlign:"center" }}>
      <div style={{ marginBottom:12, minHeight:60, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {katexReady
          ? <KaTeXExpr expr={katexExpr()} />
          : <span style={{ fontSize:28, fontFamily:"var(--mono)", fontWeight:800 }}>...</span>}
      </div>
      <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
        {["0", "undefined"].map(opt => (
          <button key={opt} onClick={() => !showResult && onSelect(opt)}
            style={{ padding:"8px 14px", borderRadius:"var(--radius-sm)", border:`2px solid ${selected===opt ? "var(--blue)" : "var(--border)"}`,
              background: selected===opt ? "rgba(59,130,246,0.15)" : "var(--surface)",
              color: selected===opt ? "var(--blue)" : "var(--text2)",
              fontFamily:"var(--mono)", fontSize:19, fontWeight:700, cursor: showResult ? "default" : "pointer",
              transition:"all 0.15s" }}>
            {opt}
          </button>
        ))}
      </div>
      {showResult && (
        <div style={{ marginTop:8, fontSize:19, fontWeight:700, color: isCorrect ? "var(--green)" : "var(--red)" }}>
          {isCorrect ? "Correct" : `Answer: ${answer}`}
        </div>
      )}
    </div>
  );
}

//  Activity 2: Long Division
function genLongDiv5() {
  const divisor = randInt(2, 5);
  const dividend = randInt(1000, 9999);
  const quotient = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;
  const ans = remainder > 0 ? quotient + "r" + remainder : String(quotient);
  return { type:"long-div-5", dividend, divisor, quotient, remainder, answer: ans };
}

function gradeLongDiv(input, q) {
  const norm = s => String(s).toLowerCase().replace(/\s+/g, "").replace(/r0$/, "").trim();
  return norm(input) === norm(q.answer);
}

function LongDivisionWork({ dividend, divisor, quotient, remainder }) {
  const dvStr = String(dividend);
  const nDigits = dvStr.length;
  const CW = 30, CH = 40, OW = 50, HEADER = 46;
  const steps = [];
  let working = 0, started = false;
  for (let i = 0; i < nDigits; i++) {
    working = working * 10 + parseInt(dvStr[i]);
    if (!started && working < divisor && i < nDigits - 1) continue;
    started = true;
    const q = Math.floor(working / divisor);
    const sub = q * divisor;
    const diff = working - sub;
    steps.push({ col: i, working, q, sub, diff });
    working = diff;
  }
  let cursor = HEADER + CH;
  const positioned = steps.map((step, si) => {
    const isFirst = si === 0;
    let pos;
    if (isFirst) {
      pos = { workY: null, subY: cursor + CH * 0.72, lineY: cursor + CH + 4, diffY: cursor + CH + CH * 0.72, advance: CH * 2 };
    } else if (step.q === 0) {
      pos = { workY: cursor + CH * 0.72, subY: null, lineY: cursor + CH + 4, diffY: cursor + CH + CH * 0.72, advance: CH * 2 };
    } else {
      pos = { workY: cursor + CH * 0.72, subY: cursor + CH + CH * 0.72, lineY: cursor + CH * 2 + 4, diffY: cursor + CH * 2 + CH * 0.72, advance: CH * 3 };
    }
    cursor += pos.advance;
    return { ...step, ...pos };
  });
  const W = OW + nDigits * CW + 50;
  const H = cursor + CH + 16;
  const cx = (col) => OW + col * CW + CW / 2;
  const rn = (num, rightCol, y, color, size) => {
    const s = String(num);
    return s.split("").map((ch, ki) => {
      const col = rightCol - s.length + 1 + ki;
      if (col < 0) return null;
      return <text key={ki} x={cx(col)} y={y} textAnchor="middle" fontSize={size} fontWeight="700" fill={color} fontFamily="var(--mono)">{ch}</text>;
    });
  };
  const lineX = (step) => {
    const nums = [step.working, step.q > 0 ? step.sub : 0].filter(n => n > 0);
    const maxLen = Math.max(...nums.map(n => String(n).length), 1);
    return { left: cx(Math.max(0, step.col - maxLen + 1)) - 5, right: cx(step.col) + CW * 0.4 };
  };
  const lastDiffY = positioned.length > 0 ? positioned[positioned.length - 1].diffY : H - 16;
  return (
    <div style={{ overflowX:"auto" }}>
      <svg width={W} height={H} style={{ display:"block", margin:"0 auto", minWidth:W }}>
        <text x={OW - 8} y={HEADER + CH * 0.78} textAnchor="end" fontSize="24" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{divisor}</text>
        <line x1={OW - 2} y1={HEADER + CH * 0.18} x2={OW - 2} y2={HEADER + CH} stroke="var(--text)" strokeWidth="2.5" />
        <line x1={OW - 2} y1={HEADER + CH * 0.18} x2={OW + nDigits * CW + 4} y2={HEADER + CH * 0.18} stroke="var(--text)" strokeWidth="2.5" />
        {dvStr.split("").map((ch, ci) => (
          <text key={ci} x={cx(ci)} y={HEADER + CH * 0.78} textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{ch}</text>
        ))}
        {positioned.map((step, si) => (
          <text key={si} x={cx(step.col)} y={HEADER - 8} textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--green)" fontFamily="var(--mono)">{step.q}</text>
        ))}
        {positioned.map((step, si) => {
          const isLast = si === positioned.length - 1;
          const { left: ll, right: lr } = lineX(step);
          return (
            <g key={si}>
              {step.workY !== null && rn(step.working, step.col, step.workY, "var(--text3)", 20)}
              {step.subY !== null && rn(step.sub, step.col, step.subY, "var(--text)", 22)}
              <line x1={ll} y1={step.lineY} x2={lr} y2={step.lineY} stroke="var(--text)" strokeWidth="1.5" />
              {rn(step.q === 0 ? 0 : step.diff, step.col, step.diffY, isLast ? "var(--blue)" : "var(--text)", 20)}
            </g>
          );
        })}
        {remainder > 0 && (
          <text x={OW + nDigits * CW + 8} y={lastDiffY} fontSize="14" fontWeight="700" fill="var(--blue)" fontFamily="var(--mono)">R{remainder}</text>
        )}
      </svg>
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

const TOPICS = [
  { id:"zero-div", label:"Division with Zero", subLabel:"Answer each problem", gen: genZeroDivPair },
  { id:"long-div", label:"Long Division", subLabel:"4-digit divided by 2-5", gen: genLongDiv5 },
];

export default function Lesson05WarmupPlayer({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Warmup 5 (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [topicIdx, setTopicIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(null);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);
  const [sel1, setSel1] = useState(null);
  const [sel2, setSel2] = useState(null);
  const [showResult, setShowResult] = useState(false);
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
    setInput(""); setSel1(null); setSel2(null); setShowResult(false);
    setPhase("question");
    pendingProgress.current = null;
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const saveCurrentProgress = async (ti, st, done) => {
    await saveProgress(user.id, topicId, {
      started: true, completed: done,
      percentComplete: done ? 100 : Math.round((ti / TOPICS.length) * 100),
      data: { topicIdx: ti, streak: st },
    });
  };

  const handleZeroDivSubmit = async () => {
    if (!sel1 || !sel2) return;
    const correct = sel1 === problem.p1.answer && sel2 === problem.p2.answer;
    setShowResult(true);
    if (correct) {
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
      setStreak(0);
      setPhase("wrong");
      await saveCurrentProgress(topicIdx, 0, false);
    }
  };

  const handleLongDivSubmit = async () => {
    if (!input.trim()) return;
    const correct = gradeLongDiv(input, problem);
    if (correct) {
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
      setStreak(0);
      setPhase("wrong");
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
        <p style={{ color:"var(--text2)", fontSize:19, marginBottom:24 }}>Ready for Classwork 5!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const isZeroDiv = currentTopic.id === "zero-div";
  const isLongDiv = currentTopic.id === "long-div";

  return (
    <div style={{ maxWidth:620, margin:"0 auto", animation:"fadeUp 0.3s ease" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:19, color:"var(--text3)", marginBottom:2 }}>
            Activity {topicIdx + 1} of {TOPICS.length} - {currentTopic.label}
          </div>
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
            {isZeroDiv && problem && (
              <div style={{ display:"flex", gap:12, marginBottom:16, justifyContent:"center" }}>
                <ZeroDivDisplay prob={problem.p1} selected={sel1} onSelect={()=>{}} showResult={true} />
                <ZeroDivDisplay prob={problem.p2} selected={sel2} onSelect={()=>{}} showResult={true} />
              </div>
            )}
            <div style={{ fontSize:28, marginBottom:8 }}></div>
            <div style={{ fontSize:22, fontWeight:800, color:"var(--green)", marginBottom:6 }}>Both correct!</div>
            <div style={{ fontSize:19, color:"var(--text3)", marginBottom:20 }}>Streak: {streak}/{STREAK_NEEDED}</div>
            <button className="btn btn-success" style={{ width:"100%", fontSize:20, padding:"13px" }} onClick={handleCorrectNext}>
               Next problem
            </button>
          </div>
        ) : phase === "wrong" ? (
          <div style={{ animation:"popIn 0.25s ease" }}>
            <div style={{ fontSize:19, fontWeight:700, color:"#fca5a5", marginBottom:12, textAlign:"center" }}>
              Not quite! Streak reset.
            </div>
            {isZeroDiv && problem && (
              <div style={{ display:"flex", gap:12, marginBottom:16, justifyContent:"center" }}>
                <ZeroDivDisplay prob={problem.p1} selected={sel1} onSelect={()=>{}} showResult={true} />
                <ZeroDivDisplay prob={problem.p2} selected={sel2} onSelect={()=>{}} showResult={true} />
              </div>
            )}
            {isLongDiv && problem && (
              <div style={{ marginBottom:12 }}>
                <LongDivisionWork dividend={problem.dividend} divisor={problem.divisor} quotient={problem.quotient} remainder={problem.remainder} />
                <div style={{ textAlign:"center", fontSize:20, color:"var(--green)", fontWeight:700, marginTop:8 }}>
                  Answer: {problem.answer}
                </div>
              </div>
            )}
            <button className="btn btn-success" style={{ width:"100%", fontSize:20, padding:"13px" }}
              onClick={() => newProblem(topicIdx)}>
              Got it - try again
            </button>
          </div>
        ) : (
          <>
            {isZeroDiv && problem && (
              <>
                <p style={{ fontSize:18, color:"var(--text2)", fontWeight:600, marginBottom:16, textAlign:"center" }}>
                  What does each expression equal? Click your answer for each.
                </p>
                <div style={{ display:"flex", gap:12, marginBottom:16, justifyContent:"center" }}>
                  <ZeroDivDisplay prob={problem.p1} selected={sel1} onSelect={setSel1} showResult={false} />
                  <ZeroDivDisplay prob={problem.p2} selected={sel2} onSelect={setSel2} showResult={false} />
                </div>
                <button className="btn btn-primary" style={{ width:"100%", fontSize:20, padding:"14px" }}
                  onClick={handleZeroDivSubmit} disabled={!sel1 || !sel2}>
                  Submit Both
                </button>
              </>
            )}
            {isLongDiv && problem && (
              <>
                <p style={{ textAlign:"center", fontSize:19, fontWeight:600, color:"var(--text2)", marginBottom:16 }}>
                  {problem.dividend} / {problem.divisor} = ?
                  <span style={{ fontSize:17, color:"var(--text3)", marginLeft:8 }}>(use r for remainder, e.g. 86r1)</span>
                </p>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleLongDivSubmit()}
                  placeholder="e.g. 1234r2"
                  style={{ textAlign:"center", fontSize:28, fontFamily:"var(--mono)", fontWeight:700, padding:"12px", marginBottom:12 }}
                />
                <button className="btn btn-primary" style={{ width:"100%", fontSize:20, padding:"14px" }}
                  onMouseDown={e => { e.preventDefault(); handleLongDivSubmit(); }}
                  onTouchEnd={e => { e.preventDefault(); handleLongDivSubmit(); }}
                  disabled={!input.trim()}>
                  Submit
                </button>
              </>
            )}
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
