import { useState, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress, getProgress } from "./core/firebase";

export const TOPIC_ID = "lesson13-warmup-v1";
const STREAK_NEEDED = 2;

// Helpers
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function divBy(n, d) {
  if (d === 2) return n % 2 === 0;
  if (d === 3) return String(n).split("").reduce((s, c) => s + parseInt(c), 0) % 3 === 0;
  if (d === 4) return n % 4 === 0;
  if (d === 5) return n % 5 === 0;
  if (d === 6) return n % 2 === 0 && String(n).split("").reduce((s, c) => s + parseInt(c), 0) % 3 === 0;
  if (d === 9) return String(n).split("").reduce((s, c) => s + parseInt(c), 0) % 9 === 0;
  if (d === 10) return n % 10 === 0;
  return false;
}

function primeFactors(n) {
  const f = {}; let d = 2;
  while (n > 1) { while (n % d === 0) { f[d] = (f[d] || 0) + 1; n /= d; } d++; }
  return f;
}

function formatPF(n) {
  const f = primeFactors(n);
  return Object.entries(f).sort(([a], [b]) => a - b)
    .map(([p, e]) => e === 1 ? p : `${p}^${e}`).join(" x ");
}

function parsePF(str) {
  const s = String(str).trim().toLowerCase()
    .replace(/\u00d7/g, "x").replace(/\*/g, "x").replace(/\s+/g, "");
  const f = {};
  for (const t of s.split("x")) {
    const m = t.match(/^(\d+)(?:\^(\d+))?$/);
    if (!m) return null;
    const base = parseInt(m[1]), exp = m[2] ? parseInt(m[2]) : 1;
    f[base] = (f[base] || 0) + exp;
  }
  return f;
}

function pfsEqual(a, b) {
  if (!a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every(k => a[k] === b[k]);
}

const PF_NUMS = [12, 15, 18, 20, 24, 28, 30, 36, 40, 42, 45, 48, 50, 54, 60, 63, 72, 75, 84, 90, 96, 100];
const ALL_RULES = [2, 3, 4, 5, 6, 9, 10];

function genMixedSet() {
  const nums = [];
  while (nums.length < 6) { const n = randInt(100, 9999); if (!nums.includes(n)) nums.push(n); }
  return nums;
}

function buildTreeHint(n) {
  const steps = []; let cur = n, d = 2;
  while (cur > 1) {
    while (cur % d === 0) { steps.push(`${cur} = ${d} x ${cur / d}`); cur /= d; }
    d++;
  }
  return steps.join(" -> ");
}

// Streak Dots
function StreakDots({ current, needed }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14 }}>
      {Array.from({length:needed}).map((_,i)=>(
        <div key={i} style={{ width:13, height:13, borderRadius:"50%",
          background:i<current?"var(--green)":"var(--surface2)",
          border:"2px solid "+(i<current?"var(--green)":"var(--border2)"),
          transition:"all 0.2s" }} />
      ))}
      <span style={{ fontSize:20, color:"var(--text3)", marginLeft:6 }}>{current}/{needed}</span>
    </div>
  );
}

const TOPICS = [
  { id:"prime-factor", label:"Prime Factorization", subLabel:"Enter the prime factorization" },
  { id:"mixed-div",    label:"Mixed Divisibility Review", subLabel:"6 numbers, all 7 rules" },
];

export default function Lesson13WarmupPlayer({ user, topic, onHome }) {
  useActivityTracking(user, TOPIC_ID, "Warmup 13 (019)");
  const topicId = topic?.id || TOPIC_ID;

  const [topicIdx, setTopicIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState("question");
  const [loading, setLoading] = useState(true);

  // Activity 1 state
  const [pfN, setPfN] = useState(() => randChoice(PF_NUMS));
  const [pfInput, setPfInput] = useState("");
  const [pfFeedback, setPfFeedback] = useState(null);
  const pfRef = useRef(null);

  // Activity 2 state
  const [mixNums, setMixNums] = useState(() => genMixedSet());
  const [mixAnswers, setMixAnswers] = useState(() => Array(6).fill([]));
  const [mixFeedback, setMixFeedback] = useState(null);

  const pendingProgress = useRef(null);

  useState(() => {
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
  });

  const saveProgress_ = async (ti, st, done) => {
    await saveProgress(user.id, topicId, {
      started:true, completed:done,
      percentComplete:done?100:Math.round((ti/TOPICS.length)*100),
      data:{ topicIdx:ti, streak:st },
    });
  };

  const handleCorrect = async () => {
    const newStreak = streak + 1;
    setStreak(newStreak);
    if (newStreak >= STREAK_NEEDED) {
      const nextTi = topicIdx + 1;
      if (nextTi >= TOPICS.length) {
        pendingProgress.current = { action:"done" };
        await saveProgress_(nextTi, 0, true);
        setPhase("celebration");
      } else {
        pendingProgress.current = { action:"next", ti:nextTi };
        await saveProgress_(nextTi, 0, false);
        setTopicIdx(nextTi);
        setStreak(0);
        resetActivity(nextTi);
      }
    } else {
      await saveProgress_(topicIdx, newStreak, false);
      resetActivity(topicIdx);
    }
  };

  const handleWrong = async () => {
    setStreak(0);
    await saveProgress_(topicIdx, 0, false);
  };

  const resetActivity = (ti) => {
    if (ti === 0) {
      setPfN(randChoice(PF_NUMS)); setPfInput(""); setPfFeedback(null);
      setTimeout(() => pfRef.current?.focus(), 80);
    } else {
      setMixNums(genMixedSet()); setMixAnswers(Array(6).fill([])); setMixFeedback(null);
    }
  };

  if (loading) return <div style={{display:"flex",justifyContent:"center",padding:60}}><div className="spinner"/></div>;

  if (phase === "celebration" || topicIdx >= TOPICS.length) return (
    <div style={{maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease"}}>
      <div className="card">
        <div style={{fontSize:64,marginBottom:16}}></div>
        <h2 style={{fontSize:28,fontWeight:800,marginBottom:8}}>Warmup Complete!</h2>
        <p style={{color:"var(--text2)",fontSize:19,marginBottom:24}}>Ready for Classwork 13!</p>
        <button className="btn btn-primary btn-lg" style={{width:"100%"}} onClick={onHome}> Back to Home</button>
      </div>
    </div>
  );

  const currentTopic = TOPICS[topicIdx];

  // Activity 1: Prime Factorization
  const renderPF = () => {
    const correct = formatPF(pfN);
    const factors = primeFactors(pfN);
    const handleSubmit = () => {
      const parsed = parsePF(pfInput);
      const isCorrect = pfsEqual(parsed, factors);
      setPfFeedback({ correct: isCorrect, input: pfInput.trim() });
    };
    const handleNext = async () => {
      const wasCorrect = pfFeedback?.correct;
      setPfFeedback(null); setPfInput(""); setPfN(randChoice(PF_NUMS));
      setTimeout(() => pfRef.current?.focus(), 80);
      if (wasCorrect) await handleCorrect(); else await handleWrong();
    };

    return (
      <div>
        <StreakDots current={streak} needed={STREAK_NEEDED} />
        <div style={{textAlign:"center",fontSize:40,fontWeight:900,fontFamily:"var(--mono)",marginBottom:8}}>{pfN}</div>
        <div style={{fontSize:19,color:"var(--text3)",marginBottom:14,textAlign:"center"}}>
          Enter the prime factorization. Use ^ for exponents, x or * for multiplication.
        </div>
        {pfFeedback ? (
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:800,color:pfFeedback.correct?"var(--green)":"var(--red)",marginBottom:8}}>
              {pfFeedback.correct?"Correct!":"Not quite!"}
            </div>
            {!pfFeedback.correct && (
              <div style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",marginBottom:10,textAlign:"left",fontSize:19}}>
                <div style={{color:"var(--red)",fontWeight:700,marginBottom:4}}>Your answer: <span style={{fontFamily:"var(--mono)"}}>{pfFeedback.input}</span></div>
                <div style={{color:"var(--green)",fontWeight:700}}>Correct: <span style={{fontFamily:"var(--mono)"}}>{correct}</span></div>
                <div style={{color:"var(--text3)",marginTop:4}}>Factor tree: {buildTreeHint(pfN)}</div>
              </div>
            )}
            {pfFeedback.correct && <div style={{fontSize:19,color:"var(--green)",fontWeight:700,marginBottom:8}}>Answer: {correct}</div>}
            <button className="btn btn-primary" style={{width:"100%",fontSize:20}} onClick={handleNext}>Next Problem</button>
          </div>
        ) : (
          <div>
            <div style={{fontSize:18,color:"var(--text3)",marginBottom:6,textAlign:"center"}}>e.g. 2^2 * 3 or 2^2 x 3</div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <input ref={pfRef} value={pfInput} onChange={e=>setPfInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&pfInput.trim()&&handleSubmit()}
                placeholder="e.g. 2^2 * 3" autoFocus
                style={{textAlign:"center",fontSize:22,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",width:220}} />
              <button className="btn btn-primary" style={{fontSize:20,padding:"10px 20px"}}
                onClick={handleSubmit} disabled={!pfInput.trim()}>OK</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Activity 2: Mixed Divisibility
  const renderMixed = () => {
    const toggle = (i, d) => {
      setMixAnswers(prev => prev.map((a,j) => j!==i?a:a.includes(d)?a.filter(x=>x!==d):[...a,d]));
    };
    const handleSubmit = async () => {
      const results = mixNums.map((n,i) => {
        const correct = ALL_RULES.filter(d => divBy(n, d));
        const given = mixAnswers[i];
        return correct.length===given.length && correct.every(v=>given.includes(v));
      });
      const allCorrect = results.every(Boolean);
      setMixFeedback({ correct:allCorrect, results, nums:[...mixNums] });
      if (allCorrect) await handleCorrect(); else await handleWrong();
    };
    const handleNext = () => {
      setMixNums(genMixedSet()); setMixAnswers(Array(6).fill([])); setMixFeedback(null);
    };

    return (
      <div>
        <StreakDots current={streak} needed={STREAK_NEEDED} />
        {mixFeedback ? (
          <div>
            <div style={{textAlign:"center",fontSize:22,fontWeight:800,color:mixFeedback.correct?"var(--green)":"var(--red)",marginBottom:10}}>
              {mixFeedback.correct?"Correct!":"Not quite - Streak reset"}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
              {mixFeedback.nums.map((n,i) => {
                const correct = ALL_RULES.filter(d => divBy(n, d));
                return (
                  <div key={i} style={{background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"8px 12px",display:"flex",justifyContent:"space-between",border:"1px solid "+(mixFeedback.results[i]?"rgba(22,163,74,0.2)":"rgba(239,68,68,0.2)")}}>
                    <span style={{fontFamily:"var(--mono)",fontSize:20,fontWeight:800}}>{n}</span>
                    <span style={{fontSize:18,color:mixFeedback.results[i]?"var(--green)":"var(--red)",fontWeight:700}}>
                      {correct.length>0?correct.join(", "):"None"}
                    </span>
                  </div>
                );
              })}
            </div>
            <button className="btn btn-primary" style={{width:"100%",fontSize:20}} onClick={handleNext}>Next Problem</button>
          </div>
        ) : (
          <div>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
              {mixNums.map((n,i) => (
                <div key={i} style={{background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"8px 12px"}}>
                  <div style={{fontSize:22,fontWeight:800,fontFamily:"var(--mono)",marginBottom:6}}>{n}</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {ALL_RULES.map(d => {
                      const sel = mixAnswers[i].includes(d);
                      return (
                        <button key={d} onClick={()=>toggle(i,d)}
                          style={{padding:"4px 10px",borderRadius:"var(--radius-sm)",border:"2px solid "+(sel?"var(--blue)":"var(--border)"),background:sel?"rgba(27,143,255,0.15)":"var(--surface)",fontSize:18,fontWeight:700,cursor:"pointer",color:sel?"var(--blue)":"var(--text)"}}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{fontSize:19,color:"var(--text3)",marginBottom:8,textAlign:"center"}}>Select all that apply. Leave blank if none.</div>
            <button className="btn btn-primary" style={{width:"100%",fontSize:20}} onClick={handleSubmit}>Submit All</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{maxWidth:640,margin:"0 auto",animation:"fadeUp 0.3s ease"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:19,color:"var(--text3)",marginBottom:2}}>Activity {topicIdx+1} of {TOPICS.length} - {currentTopic.label}</div>
          <div style={{fontSize:20,fontWeight:700,color:"var(--blue)"}}>{currentTopic.subLabel}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onHome}> Home</button>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{height:5,background:"var(--surface2)",borderRadius:99,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(topicIdx/TOPICS.length)*100}%`,background:"linear-gradient(90deg,var(--blue),var(--cyan))",borderRadius:99}} />
        </div>
      </div>
      <div className="card">
        {topicIdx===0 ? renderPF() : renderMixed()}
      </div>
      <div style={{marginTop:16,display:"flex",gap:6}}>
        {TOPICS.map((t,i)=>{
          const done=i<topicIdx,active=i===topicIdx;
          return (
            <div key={t.id} style={{fontSize:20,fontWeight:700,padding:"4px 14px",borderRadius:99,
              background:done?"rgba(16,185,129,0.15)":active?"rgba(59,130,246,0.15)":"var(--surface)",
              color:done?"var(--green)":active?"var(--blue)":"var(--text3)",
              border:`1px solid ${done?"rgba(16,185,129,0.3)":active?"rgba(59,130,246,0.3)":"var(--border)"}`}}>
              {done?" ":active?" ":""}{t.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
