import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const LESSON21_MASTERY_TOPIC_ID = "lesson21-mastery-v1";
export const REP_DEC_DRILL_TOPIC_ID = "rep-dec-drill-v1";

const TIMER = 5;

// -- Math helpers --
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); return b === 0 ? a : gcd(b, a % b); }
function reduce(n, d) { const g = gcd(Math.abs(n), Math.abs(d)); return [n / g, d / g]; }
function fmtFrac(n, d) {
  const [rn, rd] = reduce(n, d);
  if (rd === 1) return String(rn);
  if (Math.abs(rn) > rd) { const w = Math.floor(Math.abs(rn) / rd); const r = Math.abs(rn) % rd; return `${w} ${r}/${rd}`; }
  return `${rn}/${rd}`;
}
function fracOk(input, rn, rd) {
  const s = String(input || "").trim();
  if (!s) return false;
  const mx = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  let num, den;
  if (mx) { num = parseInt(mx[1]) * parseInt(mx[3]) + parseInt(mx[2]); den = parseInt(mx[3]); }
  else { const fx = s.match(/^(\d+)\/(\d+)$/); if (fx) { num = parseInt(fx[1]); den = parseInt(fx[2]); } else { const ix = s.match(/^(\d+)$/); if (ix) { num = parseInt(ix[1]); den = 1; } else return false; } }
  const [in_, id_] = reduce(num, den); const [cn, cd] = reduce(rn, rd);
  return in_ === cn && id_ === cd;
}

// -- KaTeX --
function useKaTeX() {
  useEffect(() => {
    if (window.katex) return;
    const link = document.createElement("link"); link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
    document.head.appendChild(link);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    s.async = true; document.head.appendChild(s);
  }, []);
}
function KaTeX({ expr }) {
  const ref = useRef(null); useKaTeX();
  useEffect(() => {
    const go = () => { if (window.katex && ref.current) { try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: false }); } catch {} } else setTimeout(go, 100); };
    go();
  });
  return <span ref={ref} style={{ fontSize: 22 }} />;
}
function KaTeXBlock({ expr }) {
  const ref = useRef(null); useKaTeX();
  useEffect(() => {
    const go = () => { if (window.katex && ref.current) { try { window.katex.render(expr, ref.current, { throwOnError: false, displayMode: true }); } catch {} } else setTimeout(go, 100); };
    go();
  });
  return <div ref={ref} style={{ fontSize: 26, margin: "8px 0", minHeight: 36 }} />;
}
function frac(n, d) { return `\\dfrac{${n}}{${d}}`; }

// - Activity 1: Repeating Decimal Memorization Drill -
const DRILL_CONVS = [
  {
    latex: frac(1, 3), dec: 0.3333, display: "0.\\overline{3}",
    label: "1/3", acceptAlts: ["0.333...", "0.33...", "0.3...", "0.3333...", "0.[3]"],
  },
  {
    latex: frac(1, 6), dec: 0.1667, display: "0.1\\overline{6}",
    label: "1/6", acceptAlts: ["0.1666...", "0.166...", "0.16...", "0.1[6]"],
  },
  {
    latex: frac(1, 9), dec: 0.1111, display: "0.\\overline{1}",
    label: "1/9", acceptAlts: ["0.111...", "0.11...", "0.1...", "0.1111...", "0.[1]"],
  },
];

function gradeRepDrillInput(input, conv) {
  const s = String(input || "").trim().replace(/\s+/g, "");
  return conv.acceptAlts.some(a => s === a) ||
    (s.startsWith("0.") && Math.abs(parseFloat(s) - conv.dec) < 0.001);
}

function RepDecMemorize({ onDone }) {
  const [idx, setIdx] = useState(0);
  if (idx >= DRILL_CONVS.length) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", marginBottom: 16 }}>All conversions reviewed!</div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={onDone}>Start Drill</button>
    </div>
  );
  const cv = DRILL_CONVS[idx];
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8 }}>Memorize ({idx + 1}/{DRILL_CONVS.length})</div>
      <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", padding: "24px", marginBottom: 20 }}>
        <KaTeXBlock expr={`${cv.latex} = ${cv.display}`} />
        <div style={{ fontSize: 19, color: "var(--text2)", marginTop: 6 }}>{cv.label} = <KaTeX expr={cv.display} /></div>
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={() => setIdx(i => i + 1)}>
        {idx < DRILL_CONVS.length - 1 ? "Next" : "Start Drill"}
      </button>
    </div>
  );
}

function RepDecDrill({ onComplete }) {
  const [phase, setPhase] = useState("memorize");
  const [needed, setNeeded] = useState({ 0: 2, 1: 2, 2: 2 });
  const [correct, setCorrect] = useState({ 0: 0, 1: 0, 2: 0 });
  const [reviewNeeded, setReviewNeeded] = useState({ 0: 1, 1: 1, 2: 1 });
  const [reviewCorrect, setReviewCorrect] = useState({ 0: 0, 1: 0, 2: 0 });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  const getRemaining = (cor, nee) => Object.keys(nee).filter(k => (cor[k] || 0) < (nee[k] || 0)).map(Number);

  useEffect(() => {
    if (phase === "memorize") return;
    const cor = phase === "drill" ? correct : reviewCorrect;
    const nee = phase === "drill" ? needed : reviewNeeded;
    const rem = getRemaining(cor, nee);
    if (rem.length === 0) {
      if (phase === "drill") { setPhase("review"); setCurrentIdx(randInt(0, 2)); return; }
      setTimeout(onComplete, 300); return;
    }
    clearInterval(timerRef.current); setTimeLeft(TIMER);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); handleTimeout(); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIdx, phase, JSON.stringify(correct), JSON.stringify(reviewCorrect)]);

  const handleTimeout = () => {
    clearInterval(timerRef.current);
    setFeedback({ correct: false, display: DRILL_CONVS[currentIdx].display });
    if (phase === "drill") setNeeded(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 2) + 1 }));
    else setReviewNeeded(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 1) + 1 }));
  };

  const handleSubmit = () => {
    clearInterval(timerRef.current);
    const cv = DRILL_CONVS[currentIdx];
    const ok = gradeRepDrillInput(input, cv);
    setFeedback({ correct: ok, display: cv.display });
    if (ok) {
      if (phase === "drill") setCorrect(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 0) + 1 }));
      else setReviewCorrect(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 0) + 1 }));
    } else {
      if (phase === "drill") setNeeded(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 2) + 1 }));
      else setReviewNeeded(prev => ({ ...prev, [currentIdx]: (prev[currentIdx] || 1) + 1 }));
    }
  };

  const handleNext = () => {
    setFeedback(null); setInput("");
    const cor = phase === "drill" ? correct : reviewCorrect;
    const nee = phase === "drill" ? needed : reviewNeeded;
    const rem = getRemaining(cor, nee);
    if (rem.length === 0) return;
    setCurrentIdx(randChoice(rem));
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  if (phase === "memorize") return <RepDecMemorize onDone={() => { setPhase("drill"); setCurrentIdx(randInt(0, 2)); }} />;

  const pct = (timeLeft / TIMER) * 100;
  const col = timeLeft <= 2 ? "var(--red)" : timeLeft <= 3 ? "var(--amber)" : "var(--green)";
  const cv = DRILL_CONVS[currentIdx];
  const cor = phase === "drill" ? correct : reviewCorrect;
  const nee = phase === "drill" ? needed : reviewNeeded;
  const doneCount = Object.keys(nee).filter(k => (cor[k] || 0) >= (nee[k] || 0)).length;

  return (
    <div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 10, fontWeight: 700 }}>
        {phase === "review" ? "Review: 1 correct each" : "Drill: 2 correct each"} -- {doneCount}/{DRILL_CONVS.length} mastered
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "var(--text3)", marginBottom: 4 }}>
          <span>Time</span><span style={{ fontWeight: 700, color: col }}>{timeLeft}s</span>
        </div>
        <div style={{ height: 6, background: "var(--surface2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: col, borderRadius: 99, transition: "width 0.9s linear" }} />
        </div>
      </div>
      <KaTeXBlock expr={`${cv.latex} = ?`} />
      <div style={{ fontSize: 17, color: "var(--text3)", marginBottom: 10 }}>
        Enter as decimal (e.g. 0.333... or use your overline button)
      </div>
      {feedback ? (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: feedback.correct ? "var(--green)" : "var(--red)", marginBottom: 10 }}>{feedback.correct ? "Correct!" : "Incorrect"}</div>
          {!feedback.correct && <div style={{ fontSize: 20, color: "var(--text2)", marginBottom: 14 }}>Answer: <KaTeX expr={feedback.display} /></div>}
          <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>Next</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && input.trim() && handleSubmit()}
            placeholder="e.g. 0.333..." autoFocus
            style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 200 }} />
          <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }} onClick={handleSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

// - Pools -
const SINGLE_POOL = [
  { overline: "0.\\overline{3}", rn: 1, rd: 3, work: "Let x = 0.333...\n10x = 3.333...\n10x - x = 3  =>  9x = 3  =>  x = 3/9 = 1/3" },
  { overline: "0.\\overline{6}", rn: 2, rd: 3, work: "Let x = 0.666...\n10x = 6.666...\n9x = 6  =>  x = 6/9 = 2/3" },
  { overline: "0.\\overline{7}", rn: 7, rd: 9, work: "Let x = 0.777...\n10x = 7.777...\n9x = 7  =>  x = 7/9" },
  { overline: "0.\\overline{4}", rn: 4, rd: 9, work: "Let x = 0.444...\n10x = 4.444...\n9x = 4  =>  x = 4/9" },
  { overline: "0.\\overline{2}", rn: 2, rd: 9, work: "Let x = 0.222...\n10x = 2.222...\n9x = 2  =>  x = 2/9" },
  { overline: "0.\\overline{5}", rn: 5, rd: 9, work: "Let x = 0.555...\n10x = 5.555...\n9x = 5  =>  x = 5/9" },
  { overline: "0.\\overline{8}", rn: 8, rd: 9, work: "Let x = 0.888...\n10x = 8.888...\n9x = 8  =>  x = 8/9" },
  { overline: "0.\\overline{1}", rn: 1, rd: 9, work: "Let x = 0.111...\n10x = 1.111...\n9x = 1  =>  x = 1/9" },
];

const TWO_POOL = [
  { overline: "0.\\overline{27}", rn: 3, rd: 11, work: "Let x = 0.272727...\n100x = 27.272727...\n99x = 27  =>  x = 27/99 = 3/11" },
  { overline: "0.\\overline{45}", rn: 5, rd: 11, work: "Let x = 0.454545...\n100x = 45.454545...\n99x = 45  =>  x = 45/99 = 5/11" },
  { overline: "0.\\overline{18}", rn: 2, rd: 11, work: "Let x = 0.181818...\n100x = 18.181818...\n99x = 18  =>  x = 18/99 = 2/11" },
  { overline: "0.\\overline{36}", rn: 4, rd: 11, work: "Let x = 0.363636...\n100x = 36.363636...\n99x = 36  =>  x = 36/99 = 4/11" },
  { overline: "0.\\overline{12}", rn: 4, rd: 33, work: "Let x = 0.121212...\n100x = 12.121212...\n99x = 12  =>  x = 12/99 = 4/33" },
  { overline: "0.\\overline{09}", rn: 1, rd: 11, work: "Let x = 0.090909...\n100x = 9.090909...\n99x = 9  =>  x = 9/99 = 1/11" },
  { overline: "0.\\overline{54}", rn: 6, rd: 11, work: "Let x = 0.545454...\n100x = 54.545454...\n99x = 54  =>  x = 54/99 = 6/11" },
  { overline: "0.\\overline{63}", rn: 7, rd: 11, work: "Let x = 0.636363...\n100x = 63.636363...\n99x = 63  =>  x = 63/99 = 7/11" },
];

const MIXED_POOL = [
  { overline: "0.8\\overline{3}", rn: 5, rd: 6, work: "Let x = 0.8333...\n10x = 8.333...\n9x = 7.5  =>  x = 7.5/9 = 75/90 = 5/6" },
  { overline: "0.1\\overline{6}", rn: 1, rd: 6, work: "Let x = 0.1666...\n10x = 1.666...\n9x = 1.5  =>  x = 1.5/9 = 15/90 = 1/6" },
  { overline: "0.41\\overline{6}", rn: 5, rd: 12, work: "Let x = 0.4166...\n100x = 41.666...\n99x = 41.25  =>  x = 41.25/99 = 4125/9900 = 5/12" },
  { overline: "0.08\\overline{3}", rn: 1, rd: 12, work: "Let x = 0.0833...\n100x = 8.333...\n99x = 8.25  =>  x = 8.25/99 = 825/9900 = 1/12" },
  { overline: "0.58\\overline{3}", rn: 7, rd: 12, work: "Let x = 0.5833...\n100x = 58.333...\n99x = 57.75  =>  x = 57.75/99 = 5775/9900 = 7/12" },
  { overline: "0.\\overline{125}", rn: 125, rd: 999, work: "Let x = 0.125125...\n1000x = 125.125125...\n999x = 125  =>  x = 125/999" },
  { overline: "0.\\overline{142857}", rn: 1, rd: 7, work: "Let x = 0.142857...\n1000000x = 142857.142857...\n999999x = 142857  =>  x = 142857/999999 = 1/7" },
  { overline: "0.3\\overline{6}", rn: 11, rd: 30, work: "Let x = 0.3666...\n10x = 3.666...\n9x = 3.3  =>  x = 3.3/9 = 33/90 = 11/30" },
];

// - SixMastery component -
function SixMastery({ problems, onCorrect, onWrong, count }) {
  const n = count || 6;
  const [answers, setAnswers] = useState(Array(n).fill(""));
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = () => {
    const results = problems.map((p, i) => fracOk(answers[i], p.rn, p.rd));
    setFeedback({ results, allOk: results.every(Boolean), answers: [...answers] });
  };

  const handleNext = () => {
    const wasOk = feedback?.allOk;
    setAnswers(Array(n).fill("")); setFeedback(null);
    if (wasOk) onCorrect(); else onWrong();
  };

  if (feedback) return (
    <div>
      <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.allOk ? "var(--green)" : "var(--red)", marginBottom: 12 }}>
        {feedback.allOk ? "All Correct!" : "Incorrect"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {problems.map((p, i) => {
          const ok = feedback.results[i];
          return (
            <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", border: "1px solid " + (ok ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
              <div style={{ marginBottom: 4 }}><KaTeX expr={p.overline} /></div>
              {!ok && <div style={{ fontSize: 17, color: "var(--red)", marginBottom: 4 }}>You: <span style={{ fontFamily: "var(--mono)" }}>{feedback.answers[i] || "-"}</span></div>}
              {!ok && p.work && <div style={{ fontSize: 16, color: "var(--text2)", fontFamily: "var(--mono)", whiteSpace: "pre-line", marginBottom: 4 }}>{p.work}</div>}
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>
                Answer: <KaTeX expr={frac(p.rn, p.rd)} />
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>
        {feedback.allOk ? "Next Set" : "Try New Set"}
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {problems.map((p, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ marginBottom: 8 }}><KaTeX expr={p.overline} /></div>
            <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              placeholder="e.g. 1/3"
              style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit}
        disabled={answers.some(a => a.trim() === "")}>Submit All</button>
    </div>
  );
}

// - Activity components -
function SingleDigitMastery({ onCorrect, onWrong }) {
  const gen = () => shuffle([...SINGLE_POOL]).slice(0, 6);
  const [probs, setProbs] = useState(() => gen());
  return <SixMastery problems={probs}
    onCorrect={() => { setProbs(gen()); onCorrect(); }}
    onWrong={() => { setProbs(gen()); onWrong(); }} />;
}

function TwoDigitMastery({ onCorrect, onWrong }) {
  const gen = () => shuffle([...TWO_POOL]).slice(0, 6);
  const [probs, setProbs] = useState(() => gen());
  return <SixMastery problems={probs}
    onCorrect={() => { setProbs(gen()); onCorrect(); }}
    onWrong={() => { setProbs(gen()); onWrong(); }} />;
}

function MixedPartMastery({ onCorrect, onWrong }) {
  const gen = () => shuffle([...MIXED_POOL]).slice(0, 6);
  const [probs, setProbs] = useState(() => gen());
  return <SixMastery problems={probs}
    onCorrect={() => { setProbs(gen()); onCorrect(); }}
    onWrong={() => { setProbs(gen()); onWrong(); }} />;
}

function AllMixedMastery({ onCorrect, onWrong }) {
  const gen = () => {
    const s = shuffle([...SINGLE_POOL]).slice(0, 3);
    const t = shuffle([...TWO_POOL]).slice(0, 3);
    const m = shuffle([...MIXED_POOL]).slice(0, 4);
    return shuffle([...s, ...t, ...m]);
  };
  const [probs, setProbs] = useState(() => gen());
  return <SixMastery problems={probs} count={10}
    onCorrect={() => { setProbs(gen()); onCorrect(); }}
    onWrong={() => { setProbs(gen()); onWrong(); }} />;
}

// - Steps -
const STEPS = [
  { id: "single", label: "Single-Digit Repeating", description: "e.g. 0.\u0305{3} = 1/3. All correct to pass." },
  { id: "two", label: "Two-Digit Repeating", description: "e.g. 0.\u0305{27} = 3/11. All correct to pass." },
  { id: "mixed-part", label: "Non-Repeating Part", description: "e.g. 0.8\u0305{3} = 5/6. All correct to pass." },
  { id: "all-mixed", label: "Mixed Review (10 problems)", description: "All types. All correct to pass." },
];

export default function Lesson21MasteryPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || LESSON21_MASTERY_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    getProgress(user.id, topicId).then(prog => {
      if (prog?.data?.completed) { setCompleted(true); setLoading(false); return; }
      if (prog?.data?.stepIdx !== undefined) setStepIdx(prog.data.stepIdx);
      setLoading(false);
    });
  }, []);

  const save = async (si, done) => {
    const pct = done ? 100 : Math.min(100, Math.round((si / STEPS.length) * 100));
    await fbSaveProgress(user.id, topicId, { started: true, completed: done, percentComplete: pct, data: { stepIdx: si, completed: done } });
    setStepIdx(si); if (done) setCompleted(true);
  };

  const handleCorrect = async () => { const nx = stepIdx + 1; await save(nx, nx >= STEPS.length); };
  const handleWrong = async () => { await save(stepIdx, false); };

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;
  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>HW 21 (019) Complete!</h2>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 24 }}>Repeating decimals mastered!</p>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );

  const step = STEPS[stepIdx]; if (!step) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>L21</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>HW 21 (019): Mastery Activities</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>All correct to advance each activity</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back to Home</button>
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
          {STEPS.map((s, i) => {
            const done = i < stepIdx, active = i === stepIdx;
            return (
              <div key={s.id} style={{ fontSize: 17, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: done ? "rgba(22,163,74,0.12)" : active ? "rgba(27,143,255,0.12)" : "var(--surface)", color: done ? "var(--green)" : active ? "var(--blue)" : "var(--text3)", border: "1px solid " + (done ? "rgba(22,163,74,0.3)" : active ? "rgba(27,143,255,0.3)" : "var(--border)") }}>
                {done ? "done" : s.label}
              </div>
            );
          })}
        </div>
        <div className="card">
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{step.label}</div>
            <div style={{ fontSize: 20, color: "var(--text2)" }}>{step.description}</div>
          </div>
          {step.id === "single"     && <SingleDigitMastery key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "two"        && <TwoDigitMastery    key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "mixed-part" && <MixedPartMastery   key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "all-mixed"  && <AllMixedMastery    key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
        </div>
      </div>
    </div>
  );
}

// - Standalone Repeating Decimal Drill -
export function RepDecDrillPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || REP_DEC_DRILL_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  useEffect(() => { getProgress(user.id, topicId).then(prog => { if (prog?.data?.completed) setCompleted(true); setLoading(false); }); }, []);
  const handleComplete = async () => { await fbSaveProgress(user.id, topicId, { started: true, completed: true, percentComplete: 100, data: { completed: true } }); setCompleted(true); };
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;
  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Repeating Decimal Drill Complete!</h2>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>21</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>Repeating Decimals: 1/3, 1/6, 1/9</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>Memorize then drill: 5s timer, 2 correct each</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back</button>
        </div>
        <div className="card"><RepDecDrill onComplete={handleComplete} /></div>
      </div>
    </div>
  );
}

