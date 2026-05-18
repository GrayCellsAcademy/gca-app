import { useState, useEffect, useRef } from "react";
import useActivityTracking from "./core/useActivityTracking";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const TIMES_TABLES_TOPIC_ID = "times-tables-v1";

const TABLES = [2, 3];
const SKIP_GOAL = 30;
const STAGE2_PASSES = 3;
const STAGE3_STREAK = 3;
const STAGE3_REVIEW = 1;
const TT_TIMER = 10;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function WrongPanel({ n, b, correct, onContinue }) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"fadeIn 0.2s ease" }}>
      <div className="card" style={{ maxWidth:440,width:"100%",textAlign:"center",animation:"popIn 0.25s ease" }}>
        <div style={{ fontSize:48,fontWeight:900,color:"var(--text)",marginBottom:4,fontFamily:"var(--mono)" }}>
          {n} x {b} = <span style={{ color:"var(--green)" }}>{correct}</span>
        </div>
        <div style={{ fontSize:16,color:"var(--text2)",marginBottom:24,lineHeight:1.6 }}>
          Remember: {n} x {b} = counting by {n}, {b === 1 ? "one time" : b + " times"}
          <br />
          <span style={{ fontFamily:"var(--mono)",color:"var(--text3)",fontSize:14 }}>
            {Array.from({ length:b },(_,i) => n*(i+1)).join(", ")}
          </span>
        </div>
        <button className="btn btn-success" style={{ width:"100%",fontSize:18 }}
          onMouseDown={e => { e.preventDefault(); onContinue(); }}
          onTouchEnd={e => { e.preventDefault(); onContinue(); }}>
          Got it - keep going!
        </button>
      </div>
    </div>
  );
}

function Stage1({ n, onComplete, timerDisabled=false }) {
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [bestTime, setBestTime] = useState(null);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [done, setDone] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const timerRef = useRef(null);
  const startRef = useRef(null);
  const inputRef = useRef(null);
  const sequence = Array.from({ length:10 },(_,i) => n*(i+1));

  const startTimer = () => {
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 200);
  };
  const stopTimer = () => clearInterval(timerRef.current);
  useEffect(() => () => clearInterval(timerRef.current), []);

  // Start timer when student hits Start button
  useEffect(() => {
    if (started && !done) {
      startTimer();
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [started]);

  const handleSubmit = () => {
    const val = parseInt(input.trim(), 10);
    setInput("");
    if (isNaN(val)) return;
    if (val === sequence[idx]) {
      if (idx === 9) {
        stopTimer();
        const finalTime = Math.floor((Date.now() - startRef.current) / 1000);
        setElapsed(finalTime);
        setDone(true);
        if (bestTime === null || finalTime < bestTime) setBestTime(finalTime);
        if (finalTime <= SKIP_GOAL) onComplete(finalTime);
      } else {
        setIdx(i => i + 1);
      }
    } else {
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 400);
    }
  };

  if (!started && !done) return (
    <div className="card" style={{ maxWidth:480,margin:"0 auto",textAlign:"center" }}>
      <div style={{ fontSize:52,fontWeight:900,color:"var(--blue)",marginBottom:8 }}>x{n}</div>
      <h3 style={{ fontSize:22,fontWeight:800,marginBottom:8 }}>Stage 1: Count by {n}s</h3>
      <p style={{ color:"var(--text2)",fontSize:15,marginBottom:8 }}>
        Skip count from {n} to {n*10}, starting at {n}.
      </p>
      <p style={{ color:"var(--text3)",fontSize:13,marginBottom:20 }}>
        Beat {SKIP_GOAL} seconds to advance. Timer starts when you click Start.
      </p>
      <button className="btn btn-primary btn-lg" style={{ width:"100%" }}
        onClick={() => setStarted(true)}>Start</button>
    </div>
  );

  if (done) {
    const beat = elapsed <= SKIP_GOAL;
    return (
      <div className="card" style={{ maxWidth:480,margin:"0 auto",textAlign:"center",animation:"popIn 0.3s ease" }}>
        <div style={{ fontSize:22,fontWeight:800,color:"var(--green)",marginBottom:8 }}>
          {beat ? "Great job!" : "Good try!"}
        </div>
        <div style={{ fontSize:72,fontWeight:900,color:beat?"var(--green)":"var(--amber)",marginBottom:4,fontFamily:"var(--mono)" }}>{elapsed}s</div>
        <div style={{ fontSize:15,color:"var(--text2)",marginBottom:8 }}>
          {beat ? "You beat the " + SKIP_GOAL + "s goal!" : "Goal is " + SKIP_GOAL + "s - try again!"}
        </div>
        {bestTime !== null && <p style={{ color:"var(--text3)",fontSize:13,marginBottom:20 }}>Best this session: {bestTime}s</p>}
        {beat ? (
          <button className="btn btn-success btn-lg" style={{ width:"100%" }} onClick={() => onComplete(elapsed)}>
            On to Stage 2!
          </button>
        ) : (
          <button className="btn btn-primary" style={{ width:"100%" }} onClick={handleRetry}>Try again</button>
        )}
      </div>
    );
  }

  return (
    <div style={{ maxWidth:480,margin:"0 auto" }}>
      {/* Progress dots */}
      <div style={{ display:"flex",gap:8,justifyContent:"center",marginBottom:20 }}>
        {sequence.map((_,i) => (
          <div key={i} style={{ width:14,height:14,borderRadius:"50%",background:i<idx?"var(--green)":i===idx?"var(--blue)":"var(--surface2)",border:"2px solid "+(i<idx?"var(--green)":i===idx?"var(--blue)":"var(--border2)"),transition:"all 0.2s" }} />
        ))}
      </div>
      {/* Big timer */}
      <div style={{ textAlign:"center",marginBottom:12 }}>
        <div style={{ fontSize:72,fontWeight:900,fontFamily:"var(--mono)",color:elapsed>SKIP_GOAL?"var(--red)":elapsed>20?"var(--amber)":"var(--blue)",lineHeight:1,transition:"color 0.3s" }}>
          {elapsed}s
        </div>
        <div style={{ fontSize:13,color:"var(--text3)" }}>Goal: {SKIP_GOAL}s</div>
        {bestTime !== null && <div style={{ fontSize:12,color:"var(--text3)",marginTop:2 }}>Best: {bestTime}s</div>}
      </div>
      <div className="card" style={{ textAlign:"center" }}>
        <div style={{ fontSize:16,color:"var(--text2)",marginBottom:16 }}>
          Skip count by {n}s - type each number in order
        </div>
        <div style={{ fontFamily:"var(--mono)",fontSize:38,fontWeight:900,color:wrongFlash?"var(--red)":"var(--amber)",marginBottom:20,transition:"color 0.15s" }}>
          ?
        </div>
        <input ref={inputRef} value={input}
          onChange={e => setInput(e.target.value.replace(/\D/g,""))}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          inputMode="numeric" placeholder={n + " x " + (idx+1) + " = ?"}
          style={{ textAlign:"center",fontSize:32,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",marginBottom:10,width:"100%",maxWidth:180 }} />
        <button className="btn btn-primary" style={{ width:"100%",maxWidth:180,fontSize:18 }}
          onMouseDown={e => { e.preventDefault(); handleSubmit(); }}
          onTouchEnd={e => { e.preventDefault(); handleSubmit(); }}>OK</button>
      </div>
    </div>
  );
}

function Stage2({ n, onComplete }) {
  const [qIdx, setQIdx] = useState(0);
  const [passes, setPasses] = useState(0);
  const [input, setInput] = useState("");
  const [wrongPanel, setWrongPanel] = useState(null);
  const [passFlash, setPassFlash] = useState(false);
  const [intro, setIntro] = useState(true);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);
  const questions = Array.from({ length:10 },(_,i) => ({ b:i+1,answer:n*(i+1) }));
  const currentQ = questions[qIdx];

  useEffect(() => {
    if (!intro && !done) { setInput(""); setTimeout(() => inputRef.current?.focus(), 80); }
  }, [qIdx, passes, intro, done]);

  const handleSubmit = () => {
    const val = parseInt(input.trim(), 10);
    setInput("");
    if (isNaN(val)) return;
    if (val === currentQ.answer) {
      if (qIdx === 9) {
        const newPasses = passes + 1;
        setPasses(newPasses);
        setPassFlash(true);
        setTimeout(() => setPassFlash(false), 600);
        if (newPasses >= STAGE2_PASSES) {
          setDone(true);
        } else {
          setQIdx(0);
        }
      } else {
        setQIdx(i => i + 1);
      }
    } else {
      setWrongPanel({ b:currentQ.b,correct:currentQ.answer });
    }
  };

  const handleWrongDismiss = () => {
    setWrongPanel(null);
    setQIdx(0);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  if (intro) return (
    <div className="card" style={{ maxWidth:480,margin:"0 auto",textAlign:"center" }}>
      <div style={{ fontSize:52,fontWeight:900,color:"var(--blue)",marginBottom:8 }}>x{n}</div>
      <h3 style={{ fontSize:22,fontWeight:800,marginBottom:12 }}>Stage 2: Ordered Q&A</h3>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:20,textAlign:"left",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"14px 16px" }}>
        <div style={{ fontSize:15,color:"var(--text2)" }}>Questions asked in order: {n}x1, {n}x2... {n}x10</div>
        <div style={{ fontSize:15,color:"var(--text2)" }}>Zero mistakes to earn a pass</div>
        <div style={{ fontSize:15,color:"var(--text2)" }}>Earn <strong>3 perfect passes</strong> to advance</div>
        <div style={{ fontSize:13,color:"var(--text3)" }}>Wrong answer resets the current pass back to question 1</div>
      </div>
      <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={() => setIntro(false)}>Start Stage 2</button>
    </div>
  );

  if (done) return (
    <div className="card" style={{ maxWidth:480,margin:"0 auto",textAlign:"center",animation:"popIn 0.3s ease" }}>
      <div style={{ fontSize:64,marginBottom:8 }}>-</div>
      <h3 style={{ fontSize:24,fontWeight:800,color:"var(--green)",marginBottom:8 }}>3 Perfect Passes!</h3>
      <p style={{ color:"var(--text2)",fontSize:15,marginBottom:24 }}>
        You answered all {n}x1 through {n}x10 perfectly, three times in a row. Amazing!
      </p>
      <button className="btn btn-success btn-lg" style={{ width:"100%" }} onClick={onComplete}>
        On to Stage 3!
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth:480,margin:"0 auto" }}>
      {wrongPanel && <WrongPanel n={n} b={wrongPanel.b} correct={wrongPanel.correct} onContinue={handleWrongDismiss} />}
      <div style={{ display:"flex",gap:16,justifyContent:"center",marginBottom:20 }}>
        {Array.from({ length:STAGE2_PASSES }).map((_,i) => (
          <div key={i} style={{ width:28,height:28,borderRadius:"50%",background:i<passes?"var(--green)":"var(--surface2)",border:"2.5px solid "+(i<passes?"var(--green)":"var(--border2)"),transition:"all 0.3s",transform:passFlash&&i===passes-1?"scale(1.3)":"scale(1)" }} />
        ))}
        <span style={{ fontSize:14,color:"var(--text3)",alignSelf:"center" }}>{passes}/{STAGE2_PASSES} passes</span>
      </div>
      <div style={{ display:"flex",gap:5,justifyContent:"center",marginBottom:16 }}>
        {questions.map((_,i) => (
          <div key={i} style={{ width:10,height:10,borderRadius:"50%",background:i<qIdx?"var(--green)":i===qIdx?"var(--blue)":"var(--surface2)",border:"1.5px solid "+(i<qIdx?"var(--green)":i===qIdx?"var(--blue)":"var(--border2)") }} />
        ))}
      </div>
      <div className="card" style={{ textAlign:"center" }}>
        <div style={{ fontSize:13,color:"var(--text3)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em" }}>
          Pass {passes+1} - Question {qIdx+1}/10 - Zero mistakes to pass
        </div>
        <div style={{ fontFamily:"var(--mono)",fontSize:52,fontWeight:900,color:"var(--text)",marginBottom:20,letterSpacing:"-1px" }}>
          {n} x {currentQ.b} = ?
        </div>
        <input ref={inputRef} value={input}
          onChange={e => setInput(e.target.value.replace(/\D/g,""))}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          inputMode="numeric" placeholder="?"
          style={{ textAlign:"center",fontSize:32,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",marginBottom:10,width:"100%",maxWidth:160 }} />
        <button className="btn btn-primary" style={{ width:"100%",maxWidth:160,fontSize:18 }}
          onMouseDown={e => { e.preventDefault(); handleSubmit(); }}
          onTouchEnd={e => { e.preventDefault(); handleSubmit(); }}>OK</button>
      </div>
    </div>
  );
}

function buildStage3Questions(n, masteredTables) {
  const current = Array.from({ length:10 },(_,i) => ({
    n,b:i+1,answer:n*(i+1),streakNeeded:STAGE3_STREAK,streak:0,isCurrent:true,
  }));
  const review = masteredTables.flatMap(t =>
    Array.from({ length:10 },(_,i) => ({
      n:t,b:i+1,answer:t*(i+1),streakNeeded:STAGE3_REVIEW,streak:0,isCurrent:false,
    }))
  );
  return shuffle([...current,...review]);
}

function Stage3({ n, masteredTables, onComplete }) {
  const [intro, setIntro] = useState(true);
  const [done, setDone] = useState(false);
  const [questions, setQuestions] = useState(() => buildStage3Questions(n, masteredTables));
  const [qIdx, setQIdx] = useState(0);
  const [input, setInput] = useState("");
  const [wrongPanel, setWrongPanel] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TT_TIMER);
  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const currentQ = questions[qIdx % Math.max(1,questions.length)];
  const totalQ = questions.length;
  const clearedQ = questions.filter(q => q.streak >= q.streakNeeded).length;

  // Start/restart timer on each new question
  useEffect(() => {
    if (intro || done || wrongPanel) return;
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 80);
    clearInterval(timerRef.current);
    setTimeLeft(TT_TIMER);
    if (!timerDisabled) timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [qIdx, intro, done, wrongPanel]);

  const handleTimeout = () => {
    clearInterval(timerRef.current);
    const updated = questions.map((q,i) =>
      i === (qIdx % questions.length) ? { ...q,streak:0,streakNeeded:q.streakNeeded+1 } : q
    );
    setQuestions(updated);
    setWrongPanel({ n:currentQ.n,b:currentQ.b,correct:currentQ.answer,timeout:true });
  };

  const allCleared = (qs) => qs.every(q => q.streak >= q.streakNeeded);

  const handleSubmit = () => {
    const val = parseInt(input.trim(), 10);
    setInput("");
    if (isNaN(val)) return;
    clearInterval(timerRef.current);
    if (val === currentQ.answer) {
      const updated = questions.map((q,i) =>
        i === (qIdx % questions.length) ? { ...q,streak:q.streak+1 } : q
      );
      setQuestions(updated);
      if (allCleared(updated)) { setDone(true); return; }
      setQIdx(i => i+1);
    } else {
      const updated = questions.map((q,i) =>
        i === (qIdx % questions.length) ? { ...q,streak:0,streakNeeded:q.streakNeeded+1 } : q
      );
      setQuestions(updated);
      setWrongPanel({ n:currentQ.n,b:currentQ.b,correct:currentQ.answer });
    }
  };

  const handleWrongDismiss = () => {
    setWrongPanel(null);
    setQIdx(i => i+1);
  };

  if (intro) return (
    <div className="card" style={{ maxWidth:480,margin:"0 auto",textAlign:"center" }}>
      <div style={{ fontSize:52,fontWeight:900,color:"var(--blue)",marginBottom:8 }}>x{n}</div>
      <h3 style={{ fontSize:22,fontWeight:800,marginBottom:12 }}>Stage 3: Mixed Practice</h3>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:20,textAlign:"left",background:"var(--bg2)",borderRadius:"var(--radius-sm)",padding:"14px 16px" }}>
        <div style={{ fontSize:15,color:"var(--text2)" }}>All 10 questions shuffled randomly</div>
        <div style={{ fontSize:15,color:"var(--text2)" }}>Each question needs <strong>3 correct in a row</strong> to clear</div>
        <div style={{ fontSize:15,color:"var(--red)",fontWeight:700 }}>10 seconds per question!</div>
        <div style={{ fontSize:13,color:"var(--text3)" }}>Wrong answer or timeout: required streak increases by 1</div>
        {masteredTables.length > 0 && <div style={{ fontSize:13,color:"var(--text3)" }}>Includes review questions from: x{masteredTables.join(", x")} (1 correct to clear)</div>}
      </div>
      <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={() => setIntro(false)}>Start Stage 3</button>
    </div>
  );

  if (done) return (
    <div className="card" style={{ maxWidth:480,margin:"0 auto",textAlign:"center",animation:"popIn 0.3s ease" }}>
      <div style={{ fontSize:64,marginBottom:8 }}>-</div>
      <h3 style={{ fontSize:24,fontWeight:800,color:"var(--green)",marginBottom:8 }}>Table Mastered!</h3>
      <p style={{ color:"var(--text2)",fontSize:15,marginBottom:24 }}>
        You cleared all questions in the {n}s table! Every answer correct, streak by streak.
      </p>
      <button className="btn btn-success btn-lg" style={{ width:"100%" }} onClick={onComplete}>
        Continue!
      </button>
    </div>
  );

  if (!currentQ) return null;

  // Big countdown ring
  const r = 36, circ = 2 * Math.PI * r;
  const pct = timeLeft / TT_TIMER;
  const timerColor = timeLeft <= 3 ? "var(--red)" : timeLeft <= 6 ? "var(--amber)" : "var(--green)";

  return (
    <div style={{ maxWidth:480,margin:"0 auto" }}>
      {wrongPanel && <WrongPanel n={wrongPanel.n} b={wrongPanel.b} correct={wrongPanel.correct} onContinue={handleWrongDismiss} />}

      {/* Progress bar */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:"flex",justifyContent:"space-between",fontSize:13,color:"var(--text3)",marginBottom:4 }}>
          <span>Questions cleared</span><span>{clearedQ}/{totalQ}</span>
        </div>
        <div style={{ height:8,background:"var(--surface2)",borderRadius:99,overflow:"hidden" }}>
          <div style={{ height:"100%",width:(totalQ>0?clearedQ/totalQ*100:0)+"%",background:"var(--green)",borderRadius:99,transition:"width 0.3s" }} />
        </div>
      </div>

      <div className="card" style={{ textAlign:"center" }}>
        {/* Timer ring - big and prominent */}
        <div style={{ display:"flex",justifyContent:"center",marginBottom:16 }}>
          <div style={{ position:"relative",width:90,height:90,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <svg width={90} height={90} style={{ position:"absolute",top:0,left:0,transform:"rotate(-90deg)" }}>
              <circle cx={45} cy={45} r={r} fill="none" stroke="var(--surface2)" strokeWidth={6} />
              <circle cx={45} cy={45} r={r} fill="none" stroke={timerColor} strokeWidth={6}
                strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round"
                style={{ transition:"stroke-dashoffset 0.9s linear,stroke 0.3s" }} />
            </svg>
            <span style={{ fontFamily:"var(--mono)",fontSize:28,fontWeight:900,color:timerColor }}>{timeLeft}</span>
          </div>
        </div>

        {!currentQ.isCurrent && (
          <div style={{ fontSize:11,color:"var(--text3)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em" }}>Review - x{currentQ.n}</div>
        )}
        <div style={{ fontFamily:"var(--mono)",fontSize:52,fontWeight:900,color:"var(--text)",marginBottom:12,letterSpacing:"-1px" }}>
          {currentQ.n} x {currentQ.b} = ?
        </div>
        <div style={{ display:"flex",gap:6,justifyContent:"center",marginBottom:16 }}>
          {Array.from({ length:currentQ.streakNeeded }).map((_,i) => (
            <div key={i} style={{ width:12,height:12,borderRadius:"50%",background:i<currentQ.streak?"var(--green)":"var(--surface2)",border:"2px solid "+(i<currentQ.streak?"var(--green)":"var(--border2)"),transition:"all 0.2s" }} />
          ))}
        </div>
        <input ref={inputRef} value={input}
          onChange={e => setInput(e.target.value.replace(/\D/g,""))}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          inputMode="numeric" placeholder="?"
          style={{ textAlign:"center",fontSize:32,fontFamily:"var(--mono)",fontWeight:700,padding:"10px",marginBottom:10,width:"100%",maxWidth:160 }} />
        <button className="btn btn-primary" style={{ width:"100%",maxWidth:160,fontSize:18 }}
          onMouseDown={e => { e.preventDefault(); handleSubmit(); }}
          onTouchEnd={e => { e.preventDefault(); handleSubmit(); }}>OK</button>
      </div>
    </div>
  );
}

function TableSession({ n, masteredTables, onComplete }) {
  const [stage, setStage] = useState(1);
  return (
    <div>
      <div style={{ display:"flex",gap:8,justifyContent:"center",marginBottom:24 }}>
        {[1,2,3].map(s => (
          <div key={s} style={{ padding:"5px 16px",borderRadius:99,fontSize:13,fontWeight:700,background:s<stage?"rgba(16,185,129,0.12)":s===stage?"rgba(232,99,10,0.12)":"var(--surface)",color:s<stage?"var(--green)":s===stage?"var(--blue)":"var(--text3)",border:"1px solid "+(s<stage?"rgba(16,185,129,0.3)":s===stage?"rgba(232,99,10,0.3)":"var(--border)") }}>
            {s < stage ? "Stage " + s + " - done" : "Stage " + s}
          </div>
        ))}
      </div>
      {stage === 1 && <Stage1 timerDisabled={timerDisabled} key={n+"-s1"} n={n} onComplete={() => setStage(2)} />}
      {stage === 2 && <Stage2 key={n+"-s2"} n={n} onComplete={() => setStage(3)} />}
      {stage === 3 && <Stage3 key={n+"-s3"} n={n} masteredTables={masteredTables} onComplete={onComplete} />}
    </div>
  );
}

export default function TimesTablesPlayer({ user, topic, onHome }) {
  const [timerDisabled, setTimerDisabled] = useState(user?.timerDisabled || false);
  useEffect(() => { getUser(user.id).then(u => setTimerDisabled(u?.timerDisabled || false)); }, []);
  useActivityTracking(user, "times-tables-v1", "Times Table (2 & 3)");
  const topicId = topic?.id || TIMES_TABLES_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [tableIdx, setTableIdx] = useState(0);
  const [masteredTables, setMasteredTables] = useState([]);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const load = async () => {
      const prog = await getProgress(user.id, topicId);
      if (prog?.data) {
        const d = prog.data;
        if (d.completed) { setCompleted(true); setLoading(false); return; }
        if (d.tableIdx !== undefined) setTableIdx(d.tableIdx);
        if (d.masteredTables) setMasteredTables(d.masteredTables);
      }
      setLoading(false);
    };
    load();
  }, []);

  const save = async (newIdx, newMastered, done) => {
    const pct = done ? 100 : Math.round((newIdx / TABLES.length) * 100);
    await fbSaveProgress(user.id, topicId, {
      started:true,completed:done,percentComplete:pct,
      data:{ tableIdx:newIdx,masteredTables:newMastered,completed:done },
    });
  };

  const handleTableComplete = async () => {
    const newMastered = [...new Set([...masteredTables, TABLES[tableIdx]])];
    const nextIdx = tableIdx + 1;
    const done = nextIdx >= TABLES.length;
    await save(nextIdx, newMastered, done);
    if (done) { setCompleted(true); }
    else { setMasteredTables(newMastered); setTableIdx(nextIdx); }
  };

  if (loading) return <div style={{ display:"flex",justifyContent:"center",padding:60 }}><div className="spinner" /></div>;

  if (completed) return (
    <div style={{ maxWidth:520,margin:"0 auto",textAlign:"center",animation:"fadeUp 0.4s ease" }}>
      <div className="card">
        <div style={{ fontSize:48,fontWeight:900,color:"var(--amber)",marginBottom:16 }}>100%</div>
        <h2 style={{ fontSize:24,fontWeight:800,marginBottom:8 }}>Times Tables Complete!</h2>
        <p style={{ color:"var(--text2)",fontSize:15,marginBottom:24 }}>You have mastered the 2s and 3s times tables!</p>
        <button className="btn btn-primary btn-lg" style={{ width:"100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  const n = TABLES[tableIdx];
  return (
    <div style={{ minHeight:"100vh",background:"var(--bg)",padding:"clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth:600,margin:"0 auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,var(--blue),var(--cyan))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:"#fff" }}>x{n}</div>
            <div>
              <div style={{ fontWeight:800,fontSize:17 }}>Times Table (2 and 3)</div>
              <div style={{ color:"var(--text3)",fontSize:12 }}>3 stages to master each table</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        <div style={{ display:"flex",gap:8,marginBottom:24 }}>
          {TABLES.map((t,i) => {
            const done = i < tableIdx;
            const active = i === tableIdx;
            return (
              <div key={t} style={{ flex:1,padding:"8px 12px",borderRadius:"var(--radius-sm)",textAlign:"center",background:done?"rgba(16,185,129,0.08)":active?"rgba(232,99,10,0.08)":"var(--surface)",border:"1px solid "+(done?"rgba(16,185,129,0.3)":active?"rgba(232,99,10,0.3)":"var(--border)") }}>
                <div style={{ fontSize:13,fontWeight:700,color:done?"var(--green)":active?"var(--blue)":"var(--text3)" }}>
                  {done ? "done - " : ""}{t}s table
                </div>
              </div>
            );
          })}
        </div>
        <TableSession key={n} n={n} masteredTables={masteredTables} onComplete={handleTableComplete} />
      </div>
    </div>
  );
}





