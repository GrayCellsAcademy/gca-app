import { useState, useEffect, useRef } from "react";
import { saveProgress as fbSaveProgress, getProgress } from "./core/firebase";

export const LESSON22_MASTERY_TOPIC_ID = "lesson22-mastery-v1";
export const FRAC_EIGHTH_DRILL_TOPIC_ID = "frac-eighth-drill-v1";

const TIMER = 5;

function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function decOk(input, correct) {
  const v = parseFloat(String(input || "").trim().replace(/,/g, ""));
  return !isNaN(v) && Math.abs(v - correct) < 1e-6;
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

// - Shared streak component -
function StreakDots({ current, needed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
      {Array.from({ length: needed }).map((_, i) => (
        <div key={i} style={{ width: 13, height: 13, borderRadius: "50%", background: i < current ? "var(--green)" : "var(--surface2)", border: "2px solid " + (i < current ? "var(--green)" : "var(--border2)") }} />
      ))}
      <span style={{ fontSize: 19, color: "var(--text3)", marginLeft: 6 }}>{current}/{needed}</span>
    </div>
  );
}

// - Two-problem streak mastery -
function TwoProbStreak({ genProblems, renderProblem, gradeProblem, workedSolution, placeholder, onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => genProblems());
  const [answers, setAnswers] = useState(["", ""]);
  const [feedback, setFeedback] = useState(null);
  const [streak, setStreak] = useState(0);

  const handleSubmit = () => {
    const results = problems.map((p, i) => { try { return gradeProblem(answers[i], p); } catch { return false; } });
    const allOk = results.every(Boolean);
    setFeedback({ results, allOk, answers: [...answers] });
    if (allOk) { if (streak + 1 >= 3) { onCorrect(); } else setStreak(s => s + 1); }
    else setStreak(0);
  };

  const handleNext = () => {
    setProblems(genProblems());
    setAnswers(["", ""]); setFeedback(null);
  };

  if (feedback) return (
    <div>
      <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.allOk ? "var(--green)" : "var(--red)", marginBottom: 12 }}>
        {feedback.allOk ? "Correct!" : "Incorrect"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {problems.map((p, i) => {
          const ok = feedback.results[i];
          const ws = workedSolution ? workedSolution(p) : null;
          return (
            <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", border: "1px solid " + (ok ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
              <div style={{ marginBottom: 4 }}>{renderProblem(p)}</div>
              {!ok && <div style={{ fontSize: 17, color: "var(--red)", marginBottom: 2 }}>You: <span style={{ fontFamily: "var(--mono)" }}>{feedback.answers[i] || "-"}</span></div>}
              {!ok && ws && <div style={{ fontSize: 16, color: "var(--text2)", fontFamily: "var(--mono)", whiteSpace: "pre-line", marginBottom: 4 }}>{ws}</div>}
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>Answer: <span style={{ fontFamily: "var(--mono)" }}>{String(p.answer)}</span></div>
            </div>
          );
        })}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>
        {feedback.allOk && streak + 1 >= 3 ? "Complete!" : "Next Set"}
      </button>
    </div>
  );

  return (
    <div>
      <StreakDots current={streak} needed={3} />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {problems.map((p, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            <div style={{ marginBottom: 8 }}>{renderProblem(p)}</div>
            <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              placeholder={placeholder || "number"}
              style={{ textAlign: "center", fontSize: 20, fontFamily: "var(--mono)", fontWeight: 700, padding: "6px 10px", width: "100%", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit}
        disabled={answers.some(a => a.trim() === "")}>Submit</button>
    </div>
  );
}

// - Activity 1: 1/8 and 1/12 Drill -
const DRILL_CONVS = [
  { latex: frac(1, 8), dec: 0.125, display: "0.125", label: "1/8", alts: ["0.125"] },
  { latex: frac(1, 12), dec: 0.08333, display: "0.08\\overline{3}", label: "1/12", alts: ["0.0833...", "0.08333...", "0.083...", "0.[083]"] },
];

function gradeDecDrillInput(input, conv) {
  const s = String(input || "").trim().replace(/\s+/g, "");
  if (conv.alts.some(a => s === a)) return true;
  const v = parseFloat(s);
  return !isNaN(v) && Math.abs(v - conv.dec) < 0.0001;
}

function FracDrillMemorize({ onDone }) {
  const [idx, setIdx] = useState(0);
  if (idx >= DRILL_CONVS.length) return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--green)", marginBottom: 16 }}>Both conversions reviewed!</div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={onDone}>Start Drill</button>
    </div>
  );
  const cv = DRILL_CONVS[idx];
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, color: "var(--text3)", marginBottom: 8 }}>Memorize ({idx + 1}/{DRILL_CONVS.length})</div>
      <div style={{ background: "var(--bg2)", borderRadius: "var(--radius)", padding: "24px", marginBottom: 20 }}>
        <KaTeXBlock expr={`${cv.latex} = ${cv.display}`} />
        <div style={{ fontSize: 19, color: "var(--text2)", marginTop: 6 }}>
          {cv.label} = <KaTeX expr={cv.display} />
        </div>
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={() => setIdx(i => i + 1)}>
        {idx < DRILL_CONVS.length - 1 ? "Next" : "Start Drill"}
      </button>
    </div>
  );
}

function FracEighthDrill({ onComplete }) {
  const [phase, setPhase] = useState("memorize");
  const [needed, setNeeded] = useState({ 0: 2, 1: 2 });
  const [correct, setCorrect] = useState({ 0: 0, 1: 0 });
  const [reviewNeeded, setReviewNeeded] = useState({ 0: 1, 1: 1 });
  const [reviewCorrect, setReviewCorrect] = useState({ 0: 0, 1: 0 });
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
      if (phase === "drill") { setPhase("review"); setCurrentIdx(0); return; }
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
    const ok = gradeDecDrillInput(input, cv);
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

  if (phase === "memorize") return <FracDrillMemorize onDone={() => { setPhase("drill"); setCurrentIdx(0); }} />;

  const pct = (timeLeft / TIMER) * 100;
  const col = timeLeft <= 2 ? "var(--red)" : timeLeft <= 3 ? "var(--amber)" : "var(--green)";
  const cv = DRILL_CONVS[currentIdx];
  const cor = phase === "drill" ? correct : reviewCorrect;
  const nee = phase === "drill" ? needed : reviewNeeded;
  const doneCount = Object.keys(nee).filter(k => (cor[k] || 0) >= (nee[k] || 0)).length;

  return (
    <div>
      <div style={{ fontSize: 19, color: "var(--text3)", marginBottom: 10, fontWeight: 700 }}>
        {phase === "review" ? "Review: 1 correct each" : "Drill: 2 correct each"} -- {doneCount}/2 mastered
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
            placeholder="decimal" autoFocus
            style={{ textAlign: "center", fontSize: 22, fontFamily: "var(--mono)", fontWeight: 700, padding: "10px", width: 200 }} />
          <button className="btn btn-primary" style={{ fontSize: 20, padding: "10px 20px" }} onClick={handleSubmit} disabled={!input.trim()}>OK</button>
        </div>
      )}
    </div>
  );
}

// - Activity pools -
const MASS_POOL = [
  { expr: "3.5 kg = ? g",   answer: 3500,  work: "x 1000: 3.5 kg = 3500 g" },
  { expr: "250 mg = ? g",   answer: 0.25,  work: "/ 1000: 250 mg = 0.25 g" },
  { expr: "1.2 cg = ? mg",  answer: 12,    work: "x 10: 1.2 cg = 12 mg" },
  { expr: "500 g = ? kg",   answer: 0.5,   work: "/ 1000: 500 g = 0.5 kg" },
  { expr: "4 kg = ? g",     answer: 4000,  work: "x 1000: 4 kg = 4000 g" },
  { expr: "750 mg = ? g",   answer: 0.75,  work: "/ 1000: 750 mg = 0.75 g" },
  { expr: "2.5 g = ? mg",   answer: 2500,  work: "x 1000: 2.5 g = 2500 mg" },
  { expr: "300 cg = ? g",   answer: 3,     work: "/ 100: 300 cg = 3 g" },
  { expr: "0.8 kg = ? g",   answer: 800,   work: "x 1000: 0.8 kg = 800 g" },
  { expr: "1500 g = ? kg",  answer: 1.5,   work: "/ 1000: 1500 g = 1.5 kg" },
];

const VOL_POOL = [
  { expr: "2.5 L = ? mL",   answer: 2500, work: "x 1000: 2.5 L = 2500 mL" },
  { expr: "750 mL = ? L",   answer: 0.75, work: "/ 1000: 750 mL = 0.75 L" },
  { expr: "3.2 cL = ? mL",  answer: 32,   work: "x 10: 3.2 cL = 32 mL" },
  { expr: "1500 mL = ? L",  answer: 1.5,  work: "/ 1000: 1500 mL = 1.5 L" },
  { expr: "4 L = ? mL",     answer: 4000, work: "x 1000: 4 L = 4000 mL" },
  { expr: "0.5 L = ? mL",   answer: 500,  work: "x 1000: 0.5 L = 500 mL" },
  { expr: "2500 mL = ? L",  answer: 2.5,  work: "/ 1000: 2500 mL = 2.5 L" },
  { expr: "8 dL = ? mL",    answer: 800,  work: "x 100: 8 dL = 800 mL" },
  { expr: "3 L = ? cL",     answer: 300,  work: "x 100: 3 L = 300 cL" },
  { expr: "450 mL = ? L",   answer: 0.45, work: "/ 1000: 450 mL = 0.45 L" },
];

const CM3_POOL = [
  { expr: "250 cm3 = ? mL",           answer: 250,  work: "1 cm3 = 1 mL" },
  { expr: "500 mL water = ? g",       answer: 500,  work: "1 mL water = 1 g" },
  { expr: "1 L = ? cm3",             answer: 1000, work: "1 L = 1000 mL = 1000 cm3" },
  { expr: "400 g water = ? mL",       answer: 400,  work: "1 g water = 1 mL" },
  { expr: "750 cm3 water = ? g",      answer: 750,  work: "1 cm3 water = 1 g" },
  { expr: "2 L water = ? g",          answer: 2000, work: "1 L = 1000 g water" },
  { expr: "300 mL = ? cm3",           answer: 300,  work: "1 mL = 1 cm3" },
  { expr: "1500 cm3 water = ? kg",    answer: 1.5,  work: "1 cm3 = 1 g, 1000 g = 1 kg" },
];

const DA_POOL = [
  { expr: "180 cm = ? m",    answer: 1.8,   work: "180 cm x (1 m / 100 cm) = 1.8 m" },
  { expr: "4.5 kg = ? g",   answer: 4500,  work: "4.5 kg x (1000 g / 1 kg) = 4500 g" },
  { expr: "3.2 L = ? mL",   answer: 3200,  work: "3.2 L x (1000 mL / 1 L) = 3200 mL" },
  { expr: "36 in = ? ft",   answer: 3,     work: "36 in x (1 ft / 12 in) = 3 ft" },
  { expr: "1500 mg = ? g",  answer: 1.5,   work: "1500 mg x (1 g / 1000 mg) = 1.5 g" },
  { expr: "6 ft = ? yd",    answer: 2,     work: "6 ft x (1 yd / 3 ft) = 2 yd" },
  { expr: "750 g = ? kg",   answer: 0.75,  work: "750 g x (1 kg / 1000 g) = 0.75 kg" },
  { expr: "4.5 ft = ? in",  answer: 54,    work: "4.5 ft x (12 in / 1 ft) = 54 in" },
  { expr: "2500 mL = ? L",  answer: 2.5,   work: "2500 mL x (1 L / 1000 mL) = 2.5 L" },
  { expr: "2.5 yd = ? ft",  answer: 7.5,   work: "2.5 yd x (3 ft / 1 yd) = 7.5 ft" },
];

const VEL_POOL = [
  { expr: "20 m/s = ? km/h",  answer: 72,    work: "x 3.6: 20 x 3.6 = 72 km/h" },
  { expr: "72 km/h = ? m/s",  answer: 20,    work: "/ 3.6: 72 / 3.6 = 20 m/s" },
  { expr: "30 mph = ? ft/s",  answer: 44,    work: "x 22/15: 30 x 22/15 = 44 ft/s" },
  { expr: "10 m/s = ? km/h",  answer: 36,    work: "x 3.6: 10 x 3.6 = 36 km/h" },
  { expr: "90 km/h = ? m/s",  answer: 25,    work: "/ 3.6: 90 / 3.6 = 25 m/s" },
  { expr: "60 mph = ? ft/s",  answer: 88,    work: "x 22/15: 60 x 22/15 = 88 ft/s" },
  { expr: "15 m/s = ? km/h",  answer: 54,    work: "x 3.6: 15 x 3.6 = 54 km/h" },
  { expr: "108 km/h = ? m/s", answer: 30,    work: "/ 3.6: 108 / 3.6 = 30 m/s" },
  { expr: "45 mph = ? ft/s",  answer: 66,    work: "x 22/15: 45 x 22/15 = 66 ft/s" },
  { expr: "25 m/s = ? km/h",  answer: 90,    work: "x 3.6: 25 x 3.6 = 90 km/h" },
];

function genTwo(pool) { return shuffle([...pool]).slice(0, 2); }

function gen12Mixed() {
  const mass = shuffle([...MASS_POOL]).slice(0, 2);
  const vol = shuffle([...VOL_POOL]).slice(0, 2);
  const cm3 = shuffle([...CM3_POOL]).slice(0, 2);
  const da = shuffle([...DA_POOL]).slice(0, 3);
  const vel = shuffle([...VEL_POOL]).slice(0, 3);
  return shuffle([...mass, ...vol, ...cm3, ...da, ...vel]);
}

// - Twelve-problem all-correct mastery -
function TwelveMastery({ onCorrect, onWrong }) {
  const [problems, setProblems] = useState(() => gen12Mixed());
  const [answers, setAnswers] = useState(Array(12).fill(""));
  const [feedback, setFeedback] = useState(null);

  const handleSubmit = () => {
    const results = problems.map((p, i) => decOk(answers[i], p.answer));
    setFeedback({ results, allOk: results.every(Boolean), answers: [...answers] });
  };

  const handleNext = () => {
    const wasOk = feedback?.allOk;
    setProblems(gen12Mixed()); setAnswers(Array(12).fill("")); setFeedback(null);
    if (wasOk) onCorrect(); else onWrong();
  };

  if (feedback) return (
    <div>
      <div style={{ textAlign: "center", fontSize: 22, fontWeight: 800, color: feedback.allOk ? "var(--green)" : "var(--red)", marginBottom: 12 }}>
        {feedback.allOk ? "All Correct!" : "Incorrect"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {problems.map((p, i) => {
          const ok = feedback.results[i];
          return (
            <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, border: "1px solid " + (ok ? "rgba(22,163,74,0.2)" : "rgba(239,68,68,0.2)") }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 18 }}>{p.expr}</span>
              <div style={{ display: "flex", gap: 10 }}>
                {!ok && <span style={{ color: "var(--red)", fontFamily: "var(--mono)", fontSize: 17 }}>You: {feedback.answers[i] || "-"}</span>}
                <span style={{ color: "var(--green)", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 18 }}>{String(p.answer)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleNext}>
        {feedback.allOk ? "Complete!" : "Try New Set"}
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {problems.map((p, i) => (
          <div key={i} style={{ background: "var(--bg2)", borderRadius: "var(--radius-sm)", padding: "8px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 19, fontWeight: 700, flex: 1 }}>{p.expr}</span>
            <input value={answers[i]} onChange={e => setAnswers(prev => prev.map((x, j) => j === i ? e.target.value : x))}
              placeholder=""
              style={{ textAlign: "center", fontSize: 19, fontFamily: "var(--mono)", fontWeight: 700, padding: "5px 8px", width: 100, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }} />
          </div>
        ))}
      </div>
      <button className="btn btn-primary" style={{ width: "100%", fontSize: 20 }} onClick={handleSubmit}
        disabled={answers.some(a => a.trim() === "")}>Submit All</button>
    </div>
  );
}

// -- Wrapper components --
function _rpExpr(p) { return <span style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700 }}>{p.expr}</span>; }
function _gpAns(inp, p) { return decOk(inp, p.answer); }
function MassMastery({ onCorrect, onWrong }) {
  return <TwoProbStreak genProblems={() => genTwo(MASS_POOL)} renderProblem={_rpExpr} gradeProblem={_gpAns} workedSolution={p => p.work} onCorrect={onCorrect} onWrong={onWrong} />;
}
function VolMastery({ onCorrect, onWrong }) {
  return <TwoProbStreak genProblems={() => genTwo(VOL_POOL)} renderProblem={_rpExpr} gradeProblem={_gpAns} workedSolution={p => p.work} onCorrect={onCorrect} onWrong={onWrong} />;
}
function Cm3Mastery({ onCorrect, onWrong }) {
  return <TwoProbStreak genProblems={() => genTwo(CM3_POOL)} renderProblem={_rpExpr} gradeProblem={_gpAns} workedSolution={null} onCorrect={onCorrect} onWrong={onWrong} />;
}
function DAMastery({ onCorrect, onWrong }) {
  return <TwoProbStreak genProblems={() => genTwo(DA_POOL)} renderProblem={_rpExpr} gradeProblem={_gpAns} workedSolution={p => p.work} onCorrect={onCorrect} onWrong={onWrong} />;
}
function VelMastery({ onCorrect, onWrong }) {
  return <TwoProbStreak genProblems={() => genTwo(VEL_POOL)} renderProblem={_rpExpr} gradeProblem={_gpAns} workedSolution={p => p.work} onCorrect={onCorrect} onWrong={onWrong} />;
}
// - Steps -
const STEPS = [
  { id: "mass", label: "Metric Mass Conversions",   description: "2 problems, 3 correct sets to pass." },
  { id: "vol",  label: "Metric Volume Conversions", description: "2 problems, 3 correct sets to pass." },
  { id: "vel",  label: "Velocity Unit Conversions", description: "2 problems, 3 correct sets to pass." },
];

export default function Lesson22MasteryPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || LESSON22_MASTERY_TOPIC_ID;
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
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>HW 22 (019) Complete!</h2>
        <p style={{ fontSize: 20, color: "var(--text2)", marginBottom: 24 }}>Metric units and dimensional analysis mastered!</p>
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
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>L22</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>HW 22 (019): Mastery Activities</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>Complete each activity to advance</div>
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
          {step.id === "mass" && <MassMastery    key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "vol"  && <VolMastery     key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
          {step.id === "vel"  && <VelMastery     key={stepIdx} onCorrect={handleCorrect} onWrong={handleWrong} />}
        </div>
      </div>
    </div>
  );
}

// - Standalone 1/8 and 1/12 Drill -
export function FracEighthDrillPlayer({ user, topic, onHome }) {
  const topicId = topic?.id || FRAC_EIGHTH_DRILL_TOPIC_ID;
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  useEffect(() => { getProgress(user.id, topicId).then(prog => { if (prog?.data?.completed) setCompleted(true); setLoading(false); }); }, []);
  const handleComplete = async () => { await fbSaveProgress(user.id, topicId, { started: true, completed: true, percentComplete: 100, data: { completed: true } }); setCompleted(true); };
  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="spinner" /></div>;
  if (completed) return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <div className="card">
        <div style={{ fontSize: 48, fontWeight: 900, color: "var(--amber)", marginBottom: 16 }}>100%</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>1/8 and 1/12 Drill Complete!</h2>
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "clamp(16px,3vw,32px)" }} className="dot-bg">
      <div style={{ maxWidth: 580, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,var(--blue),var(--orange))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>22</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>Decimal Conversions: 1/8 and 1/12</div>
              <div style={{ fontSize: 20, color: "var(--text3)" }}>Memorize then drill: 5s timer, 2 correct each</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>Back</button>
        </div>
        <div className="card"><FracEighthDrill onComplete={handleComplete} /></div>
      </div>
    </div>
  );
}

